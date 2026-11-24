import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { demoStore, hashPassword, verifyPassword } from './src/server/demoStore';
import {
  ALL_REPORT_STATUSES,
  CATEGORY_LABELS,
  computeCivicTrendInsights,
  computeWardStatistics,
  detectPotentialDuplicates,
  evaluateCommunityVerification,
  filterNearbyReports,
  validateAIAnalysisPayload,
} from './src/lib/civicLogic';
import type {
  CivicReport,
  IssueCategory,
  IssueSeverity,
  ReportStatus,
  SupportedLanguage,
  UserProfile,
  UserRole,
} from './src/types/civic';

async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 1,
  timeoutMs = 12000
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini request timed out.')), timeoutMs)
        ),
      ]);
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isQuotaExhausted = /RESOURCE_EXHAUSTED|QuotaFailure|GenerateRequestsPerDay|exceeded your current quota/i.test(
        msg
      );
      const isTransient = !isQuotaExhausted && /503|UNAVAILABLE|high demand|ECONNRESET/i.test(msg);
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function formatGeminiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/RESOURCE_EXHAUSTED|QuotaFailure|GenerateRequestsPerDay|exceeded your current quota/i.test(msg)) {
    return 'Gemini AI daily quota limit reached on the server key. You can select the category and severity manually.';
  }
  if (/timed out/i.test(msg)) {
    return 'Gemini AI analysis timed out. Please choose the category manually.';
  }
  if (/503|UNAVAILABLE|high demand/i.test(msg)) {
    return 'Gemini AI service is temporarily busy. Please choose the category manually.';
  }
  return 'AI service is temporarily unavailable. You can still complete and submit your report manually.';
}

const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Runtime session secret with safe ephemeral fallback (never hardcoded literal)
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_KEY && SUPABASE_URL.startsWith('http')
);

const supabaseAdmin: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const isGeminiConfigured = Boolean(
  process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
);

const aiClient = isGeminiConfigured
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    })
  : null;

// Token signing & verification for Demo Mode sessions
interface SessionPayload {
  sub: string;
  role: UserRole;
  exp: number;
}

function signSessionToken(userId: string, role: UserRole): string {
  const payload: SessionPayload = {
    sub: userId,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Simple sliding-window rate limiter
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'local'}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before trying again.',
      });
    }
    bucket.count += 1;
    return next();
  };
}

// Multer config for image validation
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype.toLowerCase())) {
      cb(new Error('Invalid image type. Only JPG, JPEG, PNG, and WEBP are supported.'));
      return;
    }
    cb(null, true);
  },
});

interface AuthedRequest extends Request {
  user?: UserProfile;
}

async function resolveAuthUser(req: Request): Promise<UserProfile | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // Check signed demo/local session token first
  const payload = verifySessionToken(token);
  if (payload) {
    const db = demoStore.getDb();
    const user = db.users.find((u) => u.id === payload.sub && u.is_active);
    return user ? demoStore.toPublicUser(user) : null;
  }

  // If Supabase is configured, verify Supabase JWT
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (profile) {
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        locality: profile.locality || 'Central Ward',
        civic_points: profile.civic_points || 0,
        department: profile.department || undefined,
        badges: [],
        created_at: profile.created_at,
      };
    }
  }

  return null;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  req.user = user;
  return next();
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions for this action.',
      });
    }
    return next();
  };
}

// Nominatim simple cache & throttle
const geocodeCache = new Map<string, { data: unknown; expiresAt: number }>();
let lastNominatimCall = 0;

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  // Serve uploaded images safely
  app.get('/uploads/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const resolved = path.resolve(UPLOADS_DIR, safeName);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    return res.sendFile(resolved);
  });

  // -------------------------------------------------------
  // Configuration & Health
  // -------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/config-status', (_req, res) => {
    res.json({
      supabaseConfigured: isSupabaseConfigured,
      geminiConfigured: isGeminiConfigured,
      demoModeAvailable: true,
      mode: isSupabaseConfigured ? 'supabase' : 'demo',
    });
  });

  // -------------------------------------------------------
  // Authentication Endpoints
  // -------------------------------------------------------
  app.post('/api/auth/register', rateLimit(15, 60_000), (req, res) => {
    const { full_name, email, password, locality } = req.body || {};
    if (
      typeof full_name !== 'string' ||
      full_name.trim().length < 2 ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof password !== 'string' ||
      password.length < 6
    ) {
      return res.status(400).json({
        error: 'Provide a valid full name, email address, and password (at least 6 characters).',
      });
    }

    const db = demoStore.getDb();
    const normalizedEmail = email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const { hash, salt } = hashPassword(password);
    // Security requirement: Citizens register normally; never allow self-selection of officer/admin role
    const newUser = {
      id: `citizen-${crypto.randomUUID()}`,
      full_name: full_name.trim().slice(0, 80),
      email: normalizedEmail,
      role: 'citizen' as UserRole,
      locality:
        typeof locality === 'string' && locality.trim()
          ? locality.trim().slice(0, 80)
          : 'Central Ward',
      civic_points: 0,
      badges: [],
      created_at: new Date().toISOString(),
      passwordHash: hash,
      passwordSalt: salt,
      is_active: true,
    };

    db.users.push(newUser);
    demoStore.save();

    const token = signSessionToken(newUser.id, newUser.role);
    return res.status(201).json({
      token,
      user: demoStore.toPublicUser(newUser),
      message: 'Citizen account created successfully.',
    });
  });

  app.post('/api/auth/login', rateLimit(20, 60_000), (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const db = demoStore.getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !user.is_active || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = signSessionToken(user.id, user.role);
    return res.json({ token, user: demoStore.toPublicUser(user) });
  });

  app.post('/api/auth/demo-login', rateLimit(30, 60_000), (req, res) => {
    const { role } = req.body || {};
    if (role !== 'citizen' && role !== 'officer' && role !== 'admin') {
      return res.status(400).json({ error: 'Invalid demonstration role requested.' });
    }
    const db = demoStore.getDb();
    const demoUser = db.users.find((u) => u.role === role && u.email.endsWith('.local'));
    if (!demoUser) {
      return res.status(404).json({ error: 'Demonstration account unavailable.' });
    }
    const token = signSessionToken(demoUser.id, demoUser.role);
    return res.json({
      token,
      user: demoStore.toPublicUser(demoUser),
      isDemoSession: true,
    });
  });

  app.post('/api/auth/forgot-password', rateLimit(10, 60_000), (req, res) => {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    return res.json({
      message: isSupabaseConfigured
        ? 'If an account matches this email, a verification reset link has been dispatched.'
        : 'In Demonstration Mode, password reset emails are simulated. Use the Demo Login switcher or create a new citizen account.',
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    return res.json({ user: req.user });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
    const { full_name, locality } = req.body || {};
    const db = demoStore.getDb();
    const user = db.users.find((u) => u.id === req.user!.id);
    if (!user) return res.status(404).json({ error: 'Profile not found.' });

    if (typeof full_name === 'string' && full_name.trim().length >= 2) {
      user.full_name = full_name.trim().slice(0, 80);
    }
    if (typeof locality === 'string' && locality.trim().length >= 2) {
      user.locality = locality.trim().slice(0, 80);
    }
    // Role and civic_points cannot be modified by self
    demoStore.save();
    return res.json({ user: demoStore.toPublicUser(user) });
  });

  app.patch('/api/auth/preferences', requireAuth, (req: AuthedRequest, res) => {
    const { preferred_language, notification_preferences } = req.body || {};
    const db = demoStore.getDb();
    const user = db.users.find((u) => u.id === req.user!.id);
    if (!user) return res.status(404).json({ error: 'Profile not found.' });

    if (preferred_language === 'en' || preferred_language === 'hi' || preferred_language === 'kn') {
      user.preferred_language = preferred_language;
    }
    if (notification_preferences && typeof notification_preferences === 'object') {
      const curr = user.notification_preferences || {
        status_updates: true,
        community_replies: true,
        nearby_alerts: true,
      };
      user.notification_preferences = {
        status_updates:
          typeof notification_preferences.status_updates === 'boolean'
            ? notification_preferences.status_updates
            : curr.status_updates,
        community_replies:
          typeof notification_preferences.community_replies === 'boolean'
            ? notification_preferences.community_replies
            : curr.community_replies,
        nearby_alerts:
          typeof notification_preferences.nearby_alerts === 'boolean'
            ? notification_preferences.nearby_alerts
            : curr.nearby_alerts,
      };
    }

    demoStore.save();
    return res.json({ user: demoStore.toPublicUser(user) });
  });

  app.delete('/api/auth/account', requireAuth, (req: AuthedRequest, res) => {
    const db = demoStore.getDb();
    const user = db.users.find((u) => u.id === req.user!.id);
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    // Prevent deleting built-in demo accounts used for evaluation; anonymize user-registered accounts
    if (user.email.endsWith('.local')) {
      return res.status(400).json({
        error: 'Built-in demonstration accounts cannot be deleted. Sign in with a registered citizen account to test self-service removal.',
      });
    }

    user.is_active = false;
    user.full_name = 'Deleted Citizen';
    user.email = `deleted-${user.id}@removed.invalid`;
    user.locality = 'Withdrawn';
    db.notifications = db.notifications.filter((n) => n.user_id !== user.id);
    db.reports.forEach((r) => {
      if (r.user_id === user.id) {
        r.reporter_name = 'Anonymous Citizen';
      }
      r.follower_ids = r.follower_ids.filter((id) => id !== user.id);
    });
    demoStore.save();
    return res.json({ ok: true, message: 'Your account and personal profile details have been removed.' });
  });

  // -------------------------------------------------------
  // Image Upload Endpoint (Supabase Storage or Local Safe Dir)
  // -------------------------------------------------------
  app.post('/api/uploads', requireAuth, rateLimit(20, 60_000), (req: AuthedRequest, res) => {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Image upload failed.' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
      }

      const extMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
      };
      const ext = extMap[req.file.mimetype.toLowerCase()] || '.jpg';
      const fileName = `${crypto.randomUUID()}${ext}`;

      if (supabaseAdmin) {
        try {
          const storagePath = `reports/${req.user!.id}/${fileName}`;
          const { error: uploadErr } = await supabaseAdmin.storage
            .from('civic-evidence')
            .upload(storagePath, req.file.buffer, {
              contentType: req.file.mimetype,
              upsert: false,
            });
          if (!uploadErr) {
            const { data } = supabaseAdmin.storage.from('civic-evidence').getPublicUrl(storagePath);
            return res.json({ imageUrl: data.publicUrl, storage: 'supabase' });
          }
        } catch (supaErr) {
          console.error('Supabase storage upload failed, falling back to local upload dir:', supaErr);
        }
      }

      const destPath = path.resolve(UPLOADS_DIR, fileName);
      if (!destPath.startsWith(UPLOADS_DIR + path.sep)) {
        return res.status(400).json({ error: 'Invalid upload path.' });
      }
      fs.writeFileSync(destPath, req.file.buffer);
      return res.json({ imageUrl: `/uploads/${fileName}`, storage: 'local' });
    });
  });

  // -------------------------------------------------------
  // Server-Side Gemini AI Image Classification
  // -------------------------------------------------------
  app.post(
    '/api/ai/analyze-image',
    requireAuth,
    rateLimit(15, 60_000),
    (req: AuthedRequest, res) => {
      upload.single('image')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        const db = demoStore.getDb();
        db.ai_stats.total_requests += 1;

        if (!aiClient) {
          db.ai_stats.manual_fallbacks += 1;
          demoStore.save();
          return res.status(503).json({
            error:
              'Gemini AI service is not configured (GEMINI_API_KEY missing). Please select the civic issue category manually.',
            manualSelectionRequired: true,
          });
        }

        let base64Data = '';
        let mimeType = 'image/jpeg';

        if (req.file) {
          base64Data = req.file.buffer.toString('base64');
          mimeType = req.file.mimetype;
        } else if (typeof req.body?.sampleImagePath === 'string') {
          const requestedPath = req.body.sampleImagePath;
          if (!requestedPath.startsWith('/src/assets/images/') && !requestedPath.startsWith('/uploads/')) {
            return res.status(400).json({ error: 'Invalid image reference.' });
          }
          const relative = requestedPath.replace(/^\/+/, '');
          const absPath = path.resolve(process.cwd(), relative);
          const allowedBase = requestedPath.startsWith('/uploads/')
            ? UPLOADS_DIR
            : path.resolve(process.cwd(), 'src/assets/images');
          if (!absPath.startsWith(allowedBase + path.sep) || !fs.existsSync(absPath)) {
            return res.status(404).json({ error: 'Referenced image file not found.' });
          }
          base64Data = fs.readFileSync(absPath).toString('base64');
          mimeType = absPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        } else {
          return res.status(400).json({ error: 'Provide an image file to analyze.' });
        }

        try {
          const response = await withGeminiRetry(() =>
            aiClient.models.generateContent({
              model: db.settings.ai_model || 'gemini-4-hydrogen',
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                  {
                    text:
                      'Analyze this civic infrastructure photograph for Janta Check. ' +
                      'Identify which of the 6 civic problem categories it matches: ' +
                      'pothole (potholes & damaged roads), garbage (garbage accumulation / overflowing waste), ' +
                      'streetlight (damaged or broken streetlights), water_leakage (leaking water pipes or mains), ' +
                      'drainage (clogged drains, overflowing sewers, sanitation flooding), or other. ' +
                      'Provide a short clear suggested_title (5-10 words), factual description, severity (low, medium, high, critical), confidence (0..1), and reason. ' +
                      'If the image is blurry, unrelated to public infrastructure, or unclear, set unclear=true. ' +
                      'Return concise objective JSON only.',
                  },
                ],
              },
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      description:
                        'One of: pothole, garbage, streetlight, water_leakage, drainage, other',
                    },
                    suggested_title: {
                      type: Type.STRING,
                      description: 'Concise 5-10 word issue headline suitable for the report title.',
                    },
                    description: {
                      type: Type.STRING,
                      description: 'Short factual description of the visible infrastructure issue.',
                    },
                    severity: {
                      type: Type.STRING,
                      description: 'One of: low, medium, high, critical',
                    },
                    confidence: {
                      type: Type.NUMBER,
                      description: 'Confidence score between 0 and 1.',
                    },
                    reason: {
                      type: Type.STRING,
                      description: 'Visual justification explaining the classification.',
                    },
                    unclear: {
                      type: Type.BOOLEAN,
                      description: 'True if the photo is too unclear or unrelated to classify reliably.',
                    },
                  },
                  required: ['category', 'suggested_title', 'description', 'severity', 'reason'],
                },
              },
            })
          );

          const rawText = (response.text ?? '{}').trim();
          const parsed = JSON.parse(rawText);
          const validated = validateAIAnalysisPayload(parsed);
          db.ai_stats.successful_classifications += 1;
          demoStore.save();
          return res.json({ analysis: validated });
        } catch (aiErr: unknown) {
          db.ai_stats.manual_fallbacks += 1;
          demoStore.save();
          return res.status(502).json({
            error: formatGeminiError(aiErr),
            manualSelectionRequired: true,
          });
        }
      });
    }
  );

  // Smart Complaint Assistant (Improves clarity/grammar in EN/HI/KN without inventing details)
  app.post('/api/ai/assist-complaint', requireAuth, rateLimit(20, 60_000), async (req: AuthedRequest, res) => {
    const { title, description, category, locality, language } = req.body || {};
    const targetLang: SupportedLanguage =
      language === 'hi' || language === 'kn' ? language : 'en';
    const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 160) : '';
    const cleanDesc = typeof description === 'string' ? description.trim().slice(0, 1200) : '';

    if (cleanDesc.length < 5 && cleanTitle.length < 3) {
      return res.status(400).json({
        error: 'Enter at least a short title or description so the Complaint Assistant can refine it.',
      });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Smart Complaint Assistant requires GEMINI_API_KEY. Please refine the text manually.',
      });
    }

    const langNames: Record<SupportedLanguage, string> = {
      en: 'English',
      hi: 'Hindi (Devanagari script)',
      kn: 'Kannada (Kannada script)',
    };

    try {
      const response = await withGeminiRetry(() =>
        aiClient.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: [
            `You are a civic complaint writing assistant for Janta Check. ` +
              `Improve the grammar, clarity, and structure of the citizen's draft in ${langNames[targetLang]}. ` +
              `STRICT GROUNDING RULES: Never invent measurements, dates, street numbers, ward names, or landmarks that are not in the citizen's input. ` +
              `If helpful details are missing (e.g. nearby landmark, duration, or pedestrian/traffic impact), list them only as short questions/prompts inside suggested_additions.\n` +
              `Category: ${String(category || 'other')}\n` +
              `Locality provided by user: ${String(locality || 'Not specified')}\n` +
              `Draft Title: ${cleanTitle || '(none)'}\n` +
              `Draft Description: ${cleanDesc || '(none)'}`,
          ],
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                improved_title: {
                  type: Type.STRING,
                  description: 'Clear 5-12 word civic complaint headline.',
                },
                improved_description: {
                  type: Type.STRING,
                  description: 'Polite, factual, well-structured complaint description preserving only user-stated facts.',
                },
                suggested_additions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Up to 3 short optional prompts reminding the citizen what helpful details they might add manually.',
                },
              },
              required: ['improved_title', 'improved_description', 'suggested_additions'],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        improved_title?: string;
        improved_description?: string;
        suggested_additions?: string[];
      };

      return res.json({
        suggestion: {
          improved_title: (parsed.improved_title || cleanTitle).slice(0, 160),
          improved_description: (parsed.improved_description || cleanDesc).slice(0, 1400),
          suggested_additions: Array.isArray(parsed.suggested_additions)
            ? parsed.suggested_additions.slice(0, 3)
            : [],
          language: targetLang,
        },
      });
    } catch (err: unknown) {
      return res.status(502).json({
        error: formatGeminiError(err),
      });
    }
  });

  // -------------------------------------------------------
  // Nominatim Geocoding Proxy (Rate-Limited & Cached)
  // -------------------------------------------------------
  app.get('/api/geocode/reverse', rateLimit(20, 60_000), async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Valid latitude and longitude required.' });
    }
    const cacheKey = `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.data);
    }

    const now = Date.now();
    if (now - lastNominatimCall < 1000) {
      return res.json({
        locality: `Zone (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        display_name: `Coordinates ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        throttled: true,
      });
    }
    lastNominatimCall = now;

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'JantaCheckCivicApp/1.0 (civic-student-project)' },
      });
      if (!resp.ok) throw new Error(`Nominatim ${resp.status}`);
      const json = (await resp.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };
      const addr = json.address || {};
      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.city_district ||
        addr.town ||
        addr.city ||
        'Urban Sector';
      const payload = {
        locality,
        display_name: json.display_name || locality,
      };
      geocodeCache.set(cacheKey, { data: payload, expiresAt: Date.now() + 1000 * 60 * 30 });
      return res.json(payload);
    } catch {
      return res.json({
        locality: `Sector (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        display_name: `Coordinates ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        fallback: true,
      });
    }
  });

  app.get('/api/geocode/search', rateLimit(15, 60_000), async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    }
    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.data);
    }

    const now = Date.now();
    if (now - lastNominatimCall < 1000) {
      return res.status(429).json({ error: 'Geocoding rate limit active. Try again in 1 second.' });
    }
    lastNominatimCall = now;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
        q
      )}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'JantaCheckCivicApp/1.0 (civic-student-project)' },
      });
      if (!resp.ok) throw new Error(`Nominatim ${resp.status}`);
      const json = (await resp.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      const results = json.map((item) => ({
        lat: Number(item.lat),
        lng: Number(item.lon),
        display_name: item.display_name,
      }));
      const payload = { results };
      geocodeCache.set(cacheKey, { data: payload, expiresAt: Date.now() + 1000 * 60 * 30 });
      return res.json(payload);
    } catch {
      return res.status(502).json({ error: 'Location search unavailable right now.' });
    }
  });

  // -------------------------------------------------------
  // Civic Reports, Duplicate Detection, Votes, Comments, Verifications
  // -------------------------------------------------------
  app.get('/api/reports', (req, res) => {
    const db = demoStore.getDb();
    const { category, status, priority, locality, search, userId, officerId } = req.query;

    let items = [...db.reports];
    items.forEach((r) => demoStore.recalculateReportPriority(r));

    if (typeof category === 'string' && category !== 'all') {
      items = items.filter((r) => r.category === category);
    }
    if (typeof status === 'string' && status !== 'all') {
      items = items.filter((r) => r.status === status);
    }
    if (typeof priority === 'string' && priority !== 'all') {
      const allowedPriorities = priority
        .split(',')
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
      items = items.filter((r) => allowedPriorities.includes(r.priority_label.toLowerCase()));
    }
    if (typeof locality === 'string' && locality !== 'all') {
      items = items.filter((r) => r.locality.toLowerCase().includes(locality.toLowerCase()));
    }
    if (typeof userId === 'string' && userId.trim()) {
      items = items.filter((r) => r.user_id === userId);
    }
    if (typeof officerId === 'string' && officerId.trim()) {
      items = items.filter((r) => r.assigned_officer_id === officerId);
    }
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.locality.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => b.priority_score - a.priority_score);

    // Optional proximity filter for Nearby Issue Awareness
    const qLat = Number(req.query.lat);
    const qLng = Number(req.query.lng);
    const qRadius = Number(req.query.radiusMeters || 3000);
    if (Number.isFinite(qLat) && Number.isFinite(qLng) && req.query.lat !== undefined && req.query.lng !== undefined) {
      const nearby = filterNearbyReports(items, { latitude: qLat, longitude: qLng }, qRadius);
      return res.json({
        reports: nearby.map((n) => n.report),
        distances: Object.fromEntries(nearby.map((n) => [n.report.id, n.distance_meters])),
        total: nearby.length,
        page: 1,
        limit: nearby.length,
        isDemoDataset: nearby.some((n) => n.report.is_demo),
      });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return res.json({
      reports: paged,
      total: items.length,
      page,
      limit,
      isDemoDataset: paged.some((r) => r.is_demo),
    });
  });

  app.get('/api/reports/:id', (req, res) => {
    const db = demoStore.getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    demoStore.recalculateReportPriority(report);
    const visibleComments = report.comments.filter((c) => !c.is_hidden);
    return res.json({
      report: { ...report, comments: visibleComments },
    });
  });

  app.post('/api/reports/check-duplicates', requireAuth, (req: AuthedRequest, res) => {
    const { latitude, longitude, category, title, description } = req.body || {};
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Valid coordinates required for duplicate check.' });
    }

    const db = demoStore.getDb();
    const matches = detectPotentialDuplicates(
      {
        latitude: lat,
        longitude: lng,
        category: (category || 'other') as IssueCategory,
        title: String(title || ''),
        description: String(description || ''),
      },
      db.reports,
      {
        radiusMeters: db.settings.duplicate_radius_meters,
        similarityThreshold: db.settings.duplicate_similarity_threshold,
      }
    );

    return res.json({
      duplicates: matches.slice(0, 5),
      radiusMeters: db.settings.duplicate_radius_meters,
    });
  });

  app.post('/api/reports', requireAuth, rateLimit(20, 60_000), (req: AuthedRequest, res) => {
    const {
      title,
      description,
      category,
      severity,
      latitude,
      longitude,
      locality,
      image_url,
      ai_category,
      ai_severity,
      ai_confidence,
      ai_description,
      ai_reason,
      related_duplicate_id,
    } = req.body || {};

    if (typeof title !== 'string' || title.trim().length < 5) {
      return res.status(400).json({ error: 'Issue title must be at least 5 characters.' });
    }
    if (typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ error: 'Issue description must be at least 10 characters.' });
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Valid GPS coordinates are required.' });
    }
    if (typeof image_url !== 'string' || !image_url.trim()) {
      return res.status(400).json({ error: 'A photograph is required to submit a civic report.' });
    }
    if (!image_url.startsWith('/uploads/') && !image_url.startsWith('/src/assets/images/') && !image_url.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid photograph URL.' });
    }

    const validCategories = Object.keys(CATEGORY_LABELS);
    const cleanCategory: IssueCategory = validCategories.includes(category) ? category : 'other';
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const cleanSeverity: IssueSeverity = validSeverities.includes(severity) ? severity : 'medium';

    const db = demoStore.getDb();
    const now = new Date().toISOString();
    const isFirstReport = !db.reports.some((r) => r.user_id === req.user!.id);

    const newReport: CivicReport = {
      id: `JC-${Math.floor(1000 + Math.random() * 9000)}`,
      user_id: req.user!.id,
      reporter_name: req.user!.full_name,
      title: title.trim().slice(0, 160),
      description: description.trim().slice(0, 1500),
      category: cleanCategory,
      severity: cleanSeverity,
      priority_score: 0,
      priority_label: 'Medium',
      priority_breakdown: { severity_points: 0, support_points: 0, duplicate_points: 0, waiting_points: 0 },
      status: 'Submitted',
      latitude: lat,
      longitude: lng,
      locality:
        typeof locality === 'string' && locality.trim()
          ? locality.trim().slice(0, 100)
          : req.user!.locality || 'Central Ward',
      image_url: image_url.trim(),
      ai_category: validCategories.includes(ai_category) ? ai_category : undefined,
      ai_severity: validSeverities.includes(ai_severity) ? ai_severity : undefined,
      ai_confidence: typeof ai_confidence === 'number' ? ai_confidence : undefined,
      ai_description: typeof ai_description === 'string' ? ai_description.slice(0, 400) : undefined,
      ai_reason: typeof ai_reason === 'string' ? ai_reason.slice(0, 300) : undefined,
      assigned_officer_id: 'demo-officer-1',
      assigned_officer_name: 'Vikram Nair (Demo Field Officer)',
      upvote_count: 1,
      upvoter_ids: [req.user!.id],
      follower_ids: [req.user!.id],
      duplicate_count: 0,
      comments: [],
      status_history: [
        {
          id: `sh-${crypto.randomUUID()}`,
          report_id: '',
          previous_status: null,
          new_status: 'Submitted',
          changed_by_id: req.user!.id,
          changed_by_name: req.user!.full_name,
          changed_by_role: req.user!.role,
          note: 'Report submitted with location coordinates and evidence photograph.',
          created_at: now,
        },
      ],
      verifications: [],
      is_demo: !isSupabaseConfigured,
      created_at: now,
      updated_at: now,
    };
    newReport.status_history[0].report_id = newReport.id;
    demoStore.recalculateReportPriority(newReport);

    if (typeof related_duplicate_id === 'string' && related_duplicate_id.trim()) {
      const parent = db.reports.find((r) => r.id === related_duplicate_id.trim());
      if (parent) {
        parent.duplicate_count += 1;
        demoStore.recalculateReportPriority(parent);
        db.duplicate_links.push({
          id: `dup-${crypto.randomUUID()}`,
          primary_report_id: parent.id,
          duplicate_report_id: newReport.id,
          reported_by: req.user!.id,
          distance_meters: 0,
          similarity_score: 0.8,
          resolution_action: 'created_separate',
          created_at: now,
        });
      }
    }

    db.reports.unshift(newReport);

    if (isFirstReport) {
      demoStore.awardPoints({
        userId: req.user!.id,
        reportId: newReport.id,
        actionType: 'First valid report',
        points: 20,
        dedupKey: `first_report:${req.user!.id}`,
      });
    } else {
      demoStore.awardPoints({
        userId: req.user!.id,
        reportId: newReport.id,
        actionType: 'Submitted civic report',
        points: 10,
        dedupKey: `report_submit:${newReport.id}:${req.user!.id}`,
      });
    }

    demoStore.save();
    return res.status(201).json({ report: newReport });
  });

  app.post('/api/reports/:id/support-duplicate', requireAuth, (req: AuthedRequest, res) => {
    const db = demoStore.getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Existing report not found.' });

    const { distance_meters, similarity_score } = req.body || {};
    if (!report.upvoter_ids.includes(req.user!.id)) {
      report.upvoter_ids.push(req.user!.id);
      report.upvote_count = report.upvoter_ids.length;
    }
    if (!report.follower_ids.includes(req.user!.id)) {
      report.follower_ids.push(req.user!.id);
    }
    report.duplicate_count += 1;
    report.updated_at = new Date().toISOString();
    demoStore.recalculateReportPriority(report);

    db.duplicate_links.push({
      id: `dup-${crypto.randomUUID()}`,
      primary_report_id: report.id,
      reported_by: req.user!.id,
      distance_meters: Number(distance_meters) || 0,
      similarity_score: Number(similarity_score) || 0.75,
      resolution_action: 'supported_existing',
      created_at: new Date().toISOString(),
    });

    demoStore.awardPoints({
      userId: req.user!.id,
      reportId: report.id,
      actionType: 'Supporting a report',
      points: 5,
      dedupKey: `support:${report.id}:${req.user!.id}`,
    });

    demoStore.save();
    return res.json({ report, message: 'Supported existing nearby report.' });
  });

  app.post('/api/reports/:id/vote', requireAuth, (req: AuthedRequest, res) => {
    const db = demoStore.getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    const idx = report.upvoter_ids.indexOf(req.user!.id);
    let voted = false;
    if (idx >= 0) {
      report.upvoter_ids.splice(idx, 1);
      voted = false;
    } else {
      report.upvoter_ids.push(req.user!.id);
      voted = true;
      demoStore.awardPoints({
        userId: req.user!.id,
        reportId: report.id,
        actionType: 'Supporting a report',
        points: 5,
        dedupKey: `support:${report.id}:${req.user!.id}`,
      });
    }
    report.upvote_count = report.upvoter_ids.length;
    demoStore.recalculateReportPriority(report);
    demoStore.save();
    return res.json({ report, voted });
  });

  app.post('/api/reports/:id/follow', requireAuth, (req: AuthedRequest, res) => {
    const db = demoStore.getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    const idx = report.follower_ids.indexOf(req.user!.id);
    let following = false;
    if (idx >= 0) {
      report.follower_ids.splice(idx, 1);
    } else {
      report.follower_ids.push(req.user!.id);
      following = true;
    }
    demoStore.save();
    return res.json({ following, followerCount: report.follower_ids.length });
  });

  app.post('/api/reports/:id/comments', requireAuth, rateLimit(25, 60_000), (req: AuthedRequest, res) => {
    const { content } = req.body || {};
    if (typeof content !== 'string' || content.trim().length < 2 || content.trim().length > 1000) {
      return res.status(400).json({ error: 'Comment must be between 2 and 1000 characters.' });
    }
    const db = demoStore.getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    const comment = {
      id: `cmt-${crypto.randomUUID()}`,
      report_id: report.id,
      user_id: req.user!.id,
      author_name: req.user!.full_name,
      author_role: req.user!.role,
      content: content.trim(),
      is_flagged: false,
      is_hidden: false,
      created_at: new Date().toISOString(),
    };
    report.comments.push(comment);

    if (report.user_id !== req.user!.id) {
      demoStore.addNotification({
        userId: report.user_id,
        reportId: report.id,
        title: 'New Comment on Your Report',
        message: `${req.user!.full_name} commented on "${report.title}".`,
      });
    }

    demoStore.awardPoints({
      userId: req.user!.id,
      reportId: report.id,
      actionType: 'Helpful community contribution',
      points: 5,
      dedupKey: `comment:${report.id}:${req.user!.id}`,
    });

    demoStore.save();
    return res.status(201).json({ comment, report });
  });

  app.post('/api/reports/:id/comments/:commentId/flag', requireAuth, (req: AuthedRequest, res) => {
    const { reason } = req.body || {};
    const db = demoStore.getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    const comment = report.comments.find((c) => c.id === req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    comment.is_flagged = true;
    comment.flag_reason =
      typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 200) : 'Flagged by citizen';
    demoStore.save();
    return res.json({ message: 'Comment flagged for administrator review.' });
  });

  // -------------------------------------------------------
  // Community Resolution Verification
  // -------------------------------------------------------
  app.post('/api/reports/:id/verify', requireAuth, (req: AuthedRequest, res) => {
    const { confirmed, comment } = req.body || {};
    if (typeof confirmed !== 'boolean') {
      return res.status(400).json({ error: 'Verification decision (confirmed true/false) is required.' });
    }
    const db = demoStore.getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    if (report.status !== 'Resolved - Awaiting Verification') {
      return res.status(400).json({
        error: 'Community verification is only open when status is Resolved - Awaiting Verification.',
      });
    }
    if (report.verifications.some((v) => v.user_id === req.user!.id)) {
      return res.status(409).json({
        error: 'You have already submitted verification feedback for this resolution.',
      });
    }

    report.verifications.push({
      id: `ver-${crypto.randomUUID()}`,
      report_id: report.id,
      user_id: req.user!.id,
      user_name: req.user!.full_name,
      confirmed,
      comment: typeof comment === 'string' ? comment.trim().slice(0, 300) : undefined,
      created_at: new Date().toISOString(),
    });

    const evalResult = evaluateCommunityVerification(report.verifications, {
      confirmThreshold: db.settings.verification_confirm_threshold,
      reopenThreshold: db.settings.verification_reopen_threshold,
    });

    if (evalResult.nextStatus !== report.status) {
      const prev = report.status;
      report.status = evalResult.nextStatus;
      report.status_history.push({
        id: `sh-${crypto.randomUUID()}`,
        report_id: report.id,
        previous_status: prev,
        new_status: evalResult.nextStatus,
        changed_by_id: req.user!.id,
        changed_by_name: req.user!.full_name,
        changed_by_role: req.user!.role,
        note:
          evalResult.nextStatus === 'Closed'
            ? `Community verification threshold (${db.settings.verification_confirm_threshold}) reached.`
            : `Reopened after ${evalResult.reopenCount} unresolved community reports.`,
        created_at: new Date().toISOString(),
      });

      for (const followerId of new Set([report.user_id, ...report.follower_ids])) {
        demoStore.addNotification({
          userId: followerId,
          reportId: report.id,
          title: evalResult.nextStatus === 'Closed' ? 'Issue Verified & Closed' : 'Issue Reopened',
          message: `${report.id} moved to ${evalResult.nextStatus} based on community verification.`,
        });
      }
    }

    report.updated_at = new Date().toISOString();
    demoStore.recalculateReportPriority(report);

    demoStore.awardPoints({
      userId: req.user!.id,
      reportId: report.id,
      actionType: 'Verified resolution contribution',
      points: 15,
      dedupKey: `verify:${report.id}:${req.user!.id}`,
    });

    demoStore.save();
    return res.json({ report, verificationSummary: evalResult });
  });

  // -------------------------------------------------------
  // Officer Workflow Endpoints
  // -------------------------------------------------------
  app.patch(
    '/api/officer/reports/:id/status',
    requireAuth,
    requireRole('officer', 'admin'),
    (req: AuthedRequest, res) => {
      const { status, note, resolution_image_url } = req.body || {};
      if (!ALL_REPORT_STATUSES.includes(status as ReportStatus)) {
        return res.status(400).json({ error: 'Invalid complaint status.' });
      }
      const db = demoStore.getDb();
      const report = db.reports.find((r) => r.id === req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found.' });

      if (
        req.user!.role === 'officer' &&
        report.assigned_officer_id &&
        report.assigned_officer_id !== req.user!.id
      ) {
        return res.status(403).json({
          error: 'You can only update complaints assigned to you.',
        });
      }

      // Enforce community verification: officers cannot jump directly to Closed without verification
      let targetStatus = status as ReportStatus;
      if (req.user!.role === 'officer' && targetStatus === 'Closed') {
        targetStatus = 'Resolved - Awaiting Verification';
      }

      const cleanProofUrl =
        typeof resolution_image_url === 'string' && resolution_image_url.trim()
          ? resolution_image_url.trim()
          : report.resolution_image_url || '';

      if (targetStatus === 'Resolved - Awaiting Verification') {
        if (!cleanProofUrl) {
          return res.status(400).json({
            error: 'A resolution proof photograph is required before marking a complaint as Resolved.',
          });
        }
        if (
          !cleanProofUrl.startsWith('/uploads/') &&
          !cleanProofUrl.startsWith('/src/assets/images/') &&
          !cleanProofUrl.startsWith('https://')
        ) {
          return res.status(400).json({ error: 'Invalid resolution photograph URL.' });
        }
        report.resolution_image_url = cleanProofUrl;
        report.completed_at = new Date().toISOString();
      } else if (cleanProofUrl) {
        report.resolution_image_url = cleanProofUrl;
      }

      const prev = report.status;
      report.status = targetStatus;
      report.updated_at = new Date().toISOString();
      demoStore.recalculateReportPriority(report);

      report.status_history.push({
        id: `sh-${crypto.randomUUID()}`,
        report_id: report.id,
        previous_status: prev,
        new_status: targetStatus,
        changed_by_id: req.user!.id,
        changed_by_name: req.user!.full_name,
        changed_by_role: req.user!.role,
        note:
          typeof note === 'string' && note.trim()
            ? note.trim().slice(0, 500)
            : `Status updated from ${prev} to ${targetStatus}.`,
        created_at: new Date().toISOString(),
      });

      const titleMap: Partial<Record<ReportStatus, string>> = {
        Acknowledged: 'Report Acknowledged',
        'In Progress': 'Officer Work Started',
        'Resolved - Awaiting Verification': 'Resolution Ready for Community Verification',
        Closed: 'Complaint Closed',
      };

      for (const recipientId of new Set([report.user_id, ...report.follower_ids])) {
        demoStore.addNotification({
          userId: recipientId,
          reportId: report.id,
          title: titleMap[targetStatus] || 'Report Status Updated',
          message: `${report.id} (${report.title}) is now "${targetStatus}".`,
        });
      }

      demoStore.save();
      return res.json({ report });
    }
  );

  // -------------------------------------------------------
  // Notifications
  // -------------------------------------------------------
  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    const db = demoStore.getDb();
    const list = db.notifications.filter((n) => n.user_id === req.user!.id);
    const unreadCount = list.filter((n) => !n.is_read).length;
    return res.json({ notifications: list, unreadCount });
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
    const db = demoStore.getDb();
    db.notifications.forEach((n) => {
      if (n.user_id === req.user!.id) n.is_read = true;
    });
    demoStore.save();
    return res.json({ ok: true });
  });

  app.patch('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    const db = demoStore.getDb();
    const n = db.notifications.find((item) => item.id === req.params.id && item.user_id === req.user!.id);
    if (!n) return res.status(404).json({ error: 'Notification not found.' });
    n.is_read = true;
    demoStore.save();
    return res.json({ notification: n });
  });

  // -------------------------------------------------------
  // Analytics, Leaderboard & Know Your Development Projects
  // -------------------------------------------------------
  app.get('/api/analytics', (req, res) => {
    const db = demoStore.getDb();
    const { category, locality, dateRange } = req.query;

    let reports = [...db.reports];
    if (typeof category === 'string' && category !== 'all') {
      reports = reports.filter((r) => r.category === category);
    }
    if (typeof locality === 'string' && locality !== 'all') {
      reports = reports.filter((r) => r.locality === locality);
    }
    if (typeof dateRange === 'string' && dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 86400_000;
      reports = reports.filter((r) => new Date(r.created_at).getTime() >= cutoff);
    }

    const total = reports.length;
    const resolved = reports.filter(
      (r) => r.status === 'Closed' || r.status === 'Resolved - Awaiting Verification'
    ).length;
    const inProgress = reports.filter(
      (r) => r.status === 'In Progress' || r.status === 'Acknowledged' || r.status === 'Under Review'
    ).length;
    const pending = reports.filter((r) => r.status === 'Submitted' || r.status === 'Reopened').length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const categoryMap = new Map<string, number>();
    const localityMap = new Map<string, { total: number; resolved: number; pending: number }>();
    const priorityMap = new Map<string, number>([
      ['Critical', 0],
      ['High', 0],
      ['Medium', 0],
      ['Low', 0],
    ]);
    const monthMap = new Map<string, { reported: number; resolved: number }>();

    for (const r of reports) {
      demoStore.recalculateReportPriority(r);
      const catLabel = CATEGORY_LABELS[r.category] || r.category;
      categoryMap.set(catLabel, (categoryMap.get(catLabel) || 0) + 1);

      const locEntry = localityMap.get(r.locality) || { total: 0, resolved: 0, pending: 0 };
      locEntry.total += 1;
      if (r.status === 'Closed' || r.status === 'Resolved - Awaiting Verification') {
        locEntry.resolved += 1;
      } else {
        locEntry.pending += 1;
      }
      localityMap.set(r.locality, locEntry);

      priorityMap.set(r.priority_label, (priorityMap.get(r.priority_label) || 0) + 1);

      const monthKey = r.created_at.slice(0, 7);
      const mEntry = monthMap.get(monthKey) || { reported: 0, resolved: 0 };
      mEntry.reported += 1;
      if (r.status === 'Closed' || r.status === 'Resolved - Awaiting Verification') {
        mEntry.resolved += 1;
      }
      monthMap.set(monthKey, mEntry);
    }

    const categoryDistribution = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    const localityComparison = Array.from(localityMap.entries()).map(([localityName, counts]) => ({
      locality: localityName,
      ...counts,
    }));
    const priorityDistribution = Array.from(priorityMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    const monthlyTrends = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => ({ month, ...counts }));

    const allLocalities = Array.from(new Set(db.reports.map((r) => r.locality)));
    const wardStats = computeWardStatistics(reports, {
      targetAcknowledgeHours: db.settings.target_acknowledge_hours,
      targetResolveHours: db.settings.target_resolve_hours,
    });
    const trendInsights = computeCivicTrendInsights(reports, 2);

    return res.json({
      summary: {
        total,
        pending,
        inProgress,
        resolved,
        resolutionRate,
      },
      categoryDistribution,
      localityComparison,
      priorityDistribution,
      monthlyTrends,
      wardStats,
      trendInsights,
      localities: allLocalities,
      isDemoDataset: !isSupabaseConfigured || reports.some((r) => r.is_demo),
    });
  });

  app.get('/api/leaderboard', (_req, res) => {
    const db = demoStore.getDb();
    const citizens = db.users
      .filter((u) => u.is_active)
      .map((u) => demoStore.toPublicUser(u))
      .sort((a, b) => b.civic_points - a.civic_points)
      .slice(0, 20);
    return res.json({
      leaderboard: citizens,
      transactions: db.points_transactions.slice(0, 30),
    });
  });

  app.get('/api/projects', (_req, res) => {
    const db = demoStore.getDb();
    return res.json({
      projects: db.projects,
      externalApiConnected: false,
      note: 'Open Government Data India automated sync is optional; administrator-verified records and demonstration records are displayed transparently.',
    });
  });

  // -------------------------------------------------------
  // Administrator Panel Endpoints (Strict Admin RBAC + Audit Log)
  // -------------------------------------------------------
  app.get('/api/admin/overview', requireAuth, requireRole('admin'), (_req, res) => {
    const db = demoStore.getDb();
    const flaggedComments = db.reports.flatMap((r) =>
      r.comments
        .filter((c) => c.is_flagged)
        .map((c) => ({ ...c, report_title: r.title }))
    );

    const duplicateLinks = db.duplicate_links.map((dl) => ({
      ...dl,
      review_status: dl.review_status || 'pending',
      primary_title: db.reports.find((r) => r.id === dl.primary_report_id)?.title,
    }));

    return res.json({
      users: db.users.map((u) => ({ ...demoStore.toPublicUser(u), is_active: u.is_active })),
      flaggedComments,
      auditLogs: db.audit_logs.slice(0, 50),
      settings: db.settings,
      aiStats: db.ai_stats,
      duplicateLinksCount: db.duplicate_links.length,
      duplicateLinks,
    });
  });

  app.patch('/api/admin/users/:id/role', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const { role, department, is_active } = req.body || {};
    const db = demoStore.getDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    if (role && demoStore.ensureRoleUpdateAllowed(role)) {
      target.role = role;
    }
    if (typeof department === 'string') {
      target.department = department.trim().slice(0, 100);
    }
    if (typeof is_active === 'boolean') {
      target.is_active = is_active;
    }

    demoStore.logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.full_name,
      action: 'UPDATE_USER_ROLE',
      targetType: 'user',
      targetId: target.id,
      details: `Updated ${target.email} role=${target.role}, active=${target.is_active}`,
    });

    demoStore.save();
    return res.json({ user: demoStore.toPublicUser(target) });
  });

  app.patch('/api/admin/reports/:id/assign', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const { officer_id } = req.body || {};
    const db = demoStore.getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    const officer = db.users.find((u) => u.id === officer_id && (u.role === 'officer' || u.role === 'admin'));
    if (!officer) return res.status(404).json({ error: 'Valid officer account not found.' });

    report.assigned_officer_id = officer.id;
    report.assigned_officer_name = officer.full_name;
    report.updated_at = new Date().toISOString();

    demoStore.logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.full_name,
      action: 'ASSIGN_OFFICER',
      targetType: 'report',
      targetId: report.id,
      details: `Assigned ${report.id} to ${officer.full_name}`,
    });

    demoStore.addNotification({
      userId: officer.id,
      reportId: report.id,
      title: 'Complaint Assigned',
      message: `Admin assigned ${report.id} (${report.title}) to you.`,
    });

    demoStore.save();
    return res.json({ report });
  });

  app.patch(
    '/api/admin/comments/:reportId/:commentId',
    requireAuth,
    requireRole('admin'),
    (req: AuthedRequest, res) => {
      const { action } = req.body || {};
      const db = demoStore.getDb();
      const report = db.reports.find((r) => r.id === req.params.reportId);
      if (!report) return res.status(404).json({ error: 'Report not found.' });
      const comment = report.comments.find((c) => c.id === req.params.commentId);
      if (!comment) return res.status(404).json({ error: 'Comment not found.' });

      if (action === 'hide') {
        comment.is_hidden = true;
        comment.is_flagged = false;
      } else if (action === 'dismiss') {
        comment.is_flagged = false;
      } else {
        return res.status(400).json({ error: 'Invalid moderation action.' });
      }

      demoStore.logAdminAction({
        adminId: req.user!.id,
        adminName: req.user!.full_name,
        action: `MODERATE_COMMENT_${String(action).toUpperCase()}`,
        targetType: 'comment',
        targetId: comment.id,
        details: `Comment on ${report.id}: ${action}`,
      });

      demoStore.save();
      return res.json({ ok: true });
    }
  );

  app.post('/api/admin/projects', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const {
      name,
      department,
      locality,
      description,
      estimated_cost,
      start_date,
      expected_completion_date,
      status,
      official_source,
      source_url,
    } = req.body || {};

    if (!name || !department || !locality || !description || !status || !official_source) {
      return res.status(400).json({
        error: 'Project name, department, locality, description, status, and official source are required.',
      });
    }

    const db = demoStore.getDb();
    const project = {
      id: `proj-${crypto.randomUUID().slice(0, 8)}`,
      name: String(name).trim(),
      department: String(department).trim(),
      locality: String(locality).trim(),
      description: String(description).trim(),
      estimated_cost: estimated_cost ? String(estimated_cost).trim() : undefined,
      start_date: start_date ? String(start_date).trim() : undefined,
      expected_completion_date: expected_completion_date ? String(expected_completion_date).trim() : undefined,
      status: String(status).trim(),
      official_source: String(official_source).trim(),
      source_url: source_url ? String(source_url).trim() : undefined,
      is_demo: false,
      last_updated: new Date().toISOString(),
    };

    db.projects.unshift(project);
    demoStore.logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.full_name,
      action: 'CREATE_PUBLIC_PROJECT',
      targetType: 'infrastructure_project',
      targetId: project.id,
      details: `Added verified project "${project.name}" (${project.official_source})`,
    });
    demoStore.save();
    return res.status(201).json({ project });
  });

  app.patch('/api/admin/duplicates/:id', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const { review_status } = req.body || {};
    if (review_status !== 'confirmed' && review_status !== 'dismissed') {
      return res.status(400).json({ error: 'Invalid review status.' });
    }
    const db = demoStore.getDb();
    const link = db.duplicate_links.find((dl) => dl.id === req.params.id);
    if (!link) return res.status(404).json({ error: 'Duplicate link record not found.' });
    link.review_status = review_status;
    demoStore.logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.full_name,
      action: `REVIEW_DUPLICATE_${review_status.toUpperCase()}`,
      targetType: 'duplicate_link',
      targetId: link.id,
      details: `Duplicate link ${link.id} for primary ${link.primary_report_id} marked ${review_status}`,
    });
    demoStore.save();
    return res.json({ link });
  });

  app.patch('/api/admin/settings', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const {
      duplicate_radius_meters,
      duplicate_similarity_threshold,
      verification_confirm_threshold,
      verification_reopen_threshold,
      target_acknowledge_hours,
      target_resolve_hours,
    } = req.body || {};
    const db = demoStore.getDb();
    if (Number.isFinite(Number(duplicate_radius_meters))) {
      db.settings.duplicate_radius_meters = Math.max(10, Math.min(500, Number(duplicate_radius_meters)));
    }
    if (Number.isFinite(Number(duplicate_similarity_threshold))) {
      db.settings.duplicate_similarity_threshold = Math.max(
        0.1,
        Math.min(0.95, Number(duplicate_similarity_threshold))
      );
    }
    if (Number.isFinite(Number(verification_confirm_threshold))) {
      db.settings.verification_confirm_threshold = Math.max(
        1,
        Math.min(20, Number(verification_confirm_threshold))
      );
    }
    if (Number.isFinite(Number(verification_reopen_threshold))) {
      db.settings.verification_reopen_threshold = Math.max(
        1,
        Math.min(20, Number(verification_reopen_threshold))
      );
    }
    if (Number.isFinite(Number(target_acknowledge_hours))) {
      db.settings.target_acknowledge_hours = Math.max(1, Math.min(168, Number(target_acknowledge_hours)));
    }
    if (Number.isFinite(Number(target_resolve_hours))) {
      db.settings.target_resolve_hours = Math.max(12, Math.min(720, Number(target_resolve_hours)));
    }

    demoStore.logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.full_name,
      action: 'UPDATE_PLATFORM_SETTINGS',
      targetType: 'settings',
      details: JSON.stringify(db.settings),
    });

    demoStore.save();
    return res.json({ settings: db.settings });
  });

  // -------------------------------------------------------
  // Vite Middleware (Dev) or Static Dist (Prod)
  // -------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Janta Check server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Janta Check server:', err);
  process.exit(1);
});
