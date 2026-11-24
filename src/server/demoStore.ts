import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AdminAuditLog,
  CivicNotification,
  CivicReport,
  InfrastructureProject,
  PlatformSettings,
  PointsTransaction,
  UserProfile,
  UserRole,
} from '../types/civic';
import {
  calculatePriorityScore,
  computeEarnedBadges,
  computeEscalationStatus,
} from '../lib/civicLogic';

export interface StoredUser extends UserProfile {
  passwordHash: string;
  passwordSalt: string;
  is_active: boolean;
}

export interface DuplicateLinkRecord {
  id: string;
  primary_report_id: string;
  duplicate_report_id?: string;
  reported_by: string;
  distance_meters: number;
  similarity_score: number;
  resolution_action: 'supported_existing' | 'created_separate';
  review_status?: 'pending' | 'confirmed' | 'dismissed';
  created_at: string;
}

export interface DemoDatabase {
  users: StoredUser[];
  reports: CivicReport[];
  notifications: CivicNotification[];
  points_transactions: PointsTransaction[];
  duplicate_links: DuplicateLinkRecord[];
  projects: InfrastructureProject[];
  audit_logs: AdminAuditLog[];
  settings: PlatformSettings;
  ai_stats: {
    total_requests: number;
    successful_classifications: number;
    manual_fallbacks: number;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'janta-check-store.json');

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: candidate } = hashPassword(password, salt);
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function buildSeedDatabase(): DemoDatabase {
  const demoDemoCred = crypto.randomBytes(16).toString('hex');
  const citizenCred = hashPassword(demoDemoCred);
  const officerCred = hashPassword(demoDemoCred);
  const adminCred = hashPassword(demoDemoCred);

  const users: StoredUser[] = [
    {
      id: 'demo-citizen-1',
      full_name: 'Ananya Deshmukh (Demo Citizen)',
      email: 'citizen.demo@jantacheck.local',
      role: 'citizen',
      locality: 'Indiranagar Demo Sector',
      civic_points: 75,
      badges: ['First Reporter', 'Community Helper', 'Infrastructure Watcher'],
      created_at: '2026-10-12T08:30:00.000Z',
      passwordHash: citizenCred.hash,
      passwordSalt: citizenCred.salt,
      is_active: true,
    },
    {
      id: 'demo-citizen-2',
      full_name: 'Rohan Kulkarni (Demo Citizen)',
      email: 'rohan.demo@jantacheck.local',
      role: 'citizen',
      locality: 'Koramangala Demo Block 4',
      civic_points: 115,
      badges: ['First Reporter', 'Community Helper', 'Infrastructure Watcher', 'Clean City Contributor'],
      created_at: '2026-10-05T10:15:00.000Z',
      passwordHash: citizenCred.hash,
      passwordSalt: citizenCred.salt,
      is_active: true,
    },
    {
      id: 'demo-officer-1',
      full_name: 'Vikram Nair (Demo Field Officer)',
      email: 'officer.demo@jantacheck.local',
      role: 'officer',
      locality: 'Central Civic Zone',
      department: 'Municipal Roads & Sanitation Division',
      civic_points: 40,
      badges: ['Community Helper'],
      created_at: '2026-09-20T09:00:00.000Z',
      passwordHash: officerCred.hash,
      passwordSalt: officerCred.salt,
      is_active: true,
    },
    {
      id: 'demo-admin-1',
      full_name: 'Meera Iyer (Demo Administrator)',
      email: 'admin.demo@jantacheck.local',
      role: 'admin',
      locality: 'Municipal HQ',
      department: 'Civic Governance & Moderation',
      civic_points: 60,
      badges: ['Infrastructure Watcher'],
      created_at: '2026-09-01T09:00:00.000Z',
      passwordHash: adminCred.hash,
      passwordSalt: adminCred.salt,
      is_active: true,
    },
  ];

  const baseReports: Array<Omit<CivicReport, 'priority_score' | 'priority_label' | 'priority_breakdown'>> = [
    {
      id: 'JC-DEMO-101',
      user_id: 'demo-citizen-1',
      reporter_name: 'Ananya Deshmukh (Demo Citizen)',
      title: 'Deep asphalt pothole near 100 Feet Road junction',
      description:
        'A 1.2m wide pothole has formed along the left commuter lane near the bus shelter, causing two-wheelers to swerve abruptly during peak traffic.',
      category: 'pothole',
      severity: 'high',
      status: 'In Progress',
      latitude: 12.9784,
      longitude: 77.6408,
      locality: 'Indiranagar Demo Sector',
      image_url: '/src/assets/images/issue_pothole_sample_1795516922335.jpg',
      ai_category: 'pothole',
      ai_severity: 'high',
      ai_confidence: 0.94,
      ai_description: 'Deep asphalt road depression with cracked pavement rim near concrete curb.',
      ai_reason: 'Visible fractured asphalt cavity adjacent to main traffic lane.',
      assigned_officer_id: 'demo-officer-1',
      assigned_officer_name: 'Vikram Nair (Demo Field Officer)',
      upvote_count: 19,
      upvoter_ids: ['demo-citizen-1', 'demo-citizen-2'],
      follower_ids: ['demo-citizen-1', 'demo-citizen-2'],
      duplicate_count: 3,
      comments: [
        {
          id: 'cmt-1',
          report_id: 'JC-DEMO-101',
          user_id: 'demo-citizen-2',
          author_name: 'Rohan Kulkarni (Demo Citizen)',
          author_role: 'citizen',
          content: 'Confirmed this morning—water collects inside after rain making it hard to spot.',
          is_flagged: false,
          is_hidden: false,
          created_at: '2026-11-18T07:45:00.000Z',
        },
      ],
      status_history: [
        {
          id: 'sh-101-1',
          report_id: 'JC-DEMO-101',
          previous_status: null,
          new_status: 'Submitted',
          changed_by_id: 'demo-citizen-1',
          changed_by_name: 'Ananya Deshmukh (Demo Citizen)',
          changed_by_role: 'citizen',
          note: 'Initial demonstration report submitted with photograph and GPS coordinates.',
          created_at: '2026-11-12T08:15:00.000Z',
        },
        {
          id: 'sh-101-2',
          report_id: 'JC-DEMO-101',
          previous_status: 'Submitted',
          new_status: 'Acknowledged',
          changed_by_id: 'demo-officer-1',
          changed_by_name: 'Vikram Nair (Demo Field Officer)',
          changed_by_role: 'officer',
          note: 'Assigned to Road Patch Crew B for inspection.',
          created_at: '2026-11-14T11:20:00.000Z',
        },
        {
          id: 'sh-101-3',
          report_id: 'JC-DEMO-101',
          previous_status: 'Acknowledged',
          new_status: 'In Progress',
          changed_by_id: 'demo-officer-1',
          changed_by_name: 'Vikram Nair (Demo Field Officer)',
          changed_by_role: 'officer',
          note: 'Cold-mix resurfacing scheduled; barricades placed around perimeter.',
          created_at: '2026-11-19T09:10:00.000Z',
        },
      ],
      verifications: [],
      is_demo: true,
      created_at: '2026-11-12T08:15:00.000Z',
      updated_at: '2026-11-19T09:10:00.000Z',
    },
    {
      id: 'JC-DEMO-102',
      user_id: 'demo-citizen-2',
      reporter_name: 'Rohan Kulkarni (Demo Citizen)',
      title: 'Overflowing waste bins blocking corner footpath',
      description:
        'Three municipal bins at the 80 Feet Road corner have remained unemptied for four days, spilling bags across the pedestrian crossing.',
      category: 'garbage',
      severity: 'high',
      status: 'Submitted',
      latitude: 12.9352,
      longitude: 77.6245,
      locality: 'Koramangala Demo Block 4',
      image_url: '/src/assets/images/issue_garbage_sample_1795516923005.jpg',
      ai_category: 'garbage',
      ai_severity: 'high',
      ai_confidence: 0.92,
      ai_description: 'Accumulated bagged refuse overflowing municipal bins onto pedestrian walkway.',
      ai_reason: 'Multiple overflowing waste containers and scattered plastic bags on curb.',
      assigned_officer_id: 'demo-officer-1',
      assigned_officer_name: 'Vikram Nair (Demo Field Officer)',
      upvote_count: 14,
      upvoter_ids: ['demo-citizen-2'],
      follower_ids: ['demo-citizen-2'],
      duplicate_count: 2,
      comments: [],
      status_history: [
        {
          id: 'sh-102-1',
          report_id: 'JC-DEMO-102',
          previous_status: null,
          new_status: 'Submitted',
          changed_by_id: 'demo-citizen-2',
          changed_by_name: 'Rohan Kulkarni (Demo Citizen)',
          changed_by_role: 'citizen',
          note: 'Demonstration sanitation complaint logged.',
          created_at: '2026-11-16T06:40:00.000Z',
        },
      ],
      verifications: [],
      is_demo: true,
      created_at: '2026-11-16T06:40:00.000Z',
      updated_at: '2026-11-16T06:40:00.000Z',
    },
    {
      id: 'JC-DEMO-103',
      user_id: 'demo-citizen-1',
      reporter_name: 'Ananya Deshmukh (Demo Citizen)',
      title: 'Tilted LED streetlight pole with exposed wiring',
      description:
        'A streetlamp pole near MG Road Metro Exit B is leaning at 25 degrees after a delivery truck impact and flickers intermittently at dusk.',
      category: 'streetlight',
      severity: 'critical',
      status: 'Resolved - Awaiting Verification',
      latitude: 12.9756,
      longitude: 77.6066,
      locality: 'MG Road Demo Zone',
      image_url: '/src/assets/images/issue_streetlight_sample_1795516922319.jpg',
      resolution_image_url: '/src/assets/images/hero_smart_city_1795516922199.jpg',
      ai_category: 'streetlight',
      ai_severity: 'critical',
      ai_confidence: 0.89,
      ai_description: 'Leaning municipal streetlamp pole with damaged housing and loose cables.',
      ai_reason: 'Visibly bent pole base and dangling luminaire fixture creating pedestrian hazard.',
      assigned_officer_id: 'demo-officer-1',
      assigned_officer_name: 'Vikram Nair (Demo Field Officer)',
      upvote_count: 22,
      upvoter_ids: ['demo-citizen-1', 'demo-citizen-2'],
      follower_ids: ['demo-citizen-1'],
      duplicate_count: 1,
      comments: [
        {
          id: 'cmt-3',
          report_id: 'JC-DEMO-103',
          user_id: 'demo-officer-1',
          author_name: 'Vikram Nair (Demo Field Officer)',
          author_role: 'officer',
          content: 'Electrical crew replaced the base anchor and secured the LED luminaire. Requesting citizen confirmation.',
          is_flagged: false,
          is_hidden: false,
          created_at: '2026-11-22T14:30:00.000Z',
        },
      ],
      status_history: [
        {
          id: 'sh-103-1',
          report_id: 'JC-DEMO-103',
          previous_status: null,
          new_status: 'Submitted',
          changed_by_id: 'demo-citizen-1',
          changed_by_name: 'Ananya Deshmukh (Demo Citizen)',
          changed_by_role: 'citizen',
          note: 'Demonstration electrical hazard reported.',
          created_at: '2026-11-10T17:50:00.000Z',
        },
        {
          id: 'sh-103-2',
          report_id: 'JC-DEMO-103',
          previous_status: 'Submitted',
          new_status: 'In Progress',
          changed_by_id: 'demo-officer-1',
          changed_by_name: 'Vikram Nair (Demo Field Officer)',
          changed_by_role: 'officer',
          note: 'Power isolated and replacement pole dispatched.',
          created_at: '2026-11-15T10:00:00.000Z',
        },
        {
          id: 'sh-103-3',
          report_id: 'JC-DEMO-103',
          previous_status: 'In Progress',
          new_status: 'Resolved - Awaiting Verification',
          changed_by_id: 'demo-officer-1',
          changed_by_name: 'Vikram Nair (Demo Field Officer)',
          changed_by_role: 'officer',
          note: 'Fixture replaced and tested. Open for community resolution verification.',
          created_at: '2026-11-22T14:25:00.000Z',
        },
      ],
      verifications: [
        {
          id: 'ver-103-1',
          report_id: 'JC-DEMO-103',
          user_id: 'demo-citizen-2',
          user_name: 'Rohan Kulkarni (Demo Citizen)',
          confirmed: true,
          comment: 'Light is steady and pole is upright as of last evening.',
          created_at: '2026-11-23T18:10:00.000Z',
        },
      ],
      is_demo: true,
      created_at: '2026-11-10T17:50:00.000Z',
      updated_at: '2026-11-23T18:10:00.000Z',
    },
    {
      id: 'JC-DEMO-104',
      user_id: 'demo-citizen-2',
      reporter_name: 'Rohan Kulkarni (Demo Citizen)',
      title: 'Ruptured municipal water supply valve leaking on curb',
      description:
        'Clean potable water is continuously discharging from a cracked iron flange beside the 4th Block park sidewalk, flooding the gutter.',
      category: 'water_leakage',
      severity: 'high',
      status: 'Acknowledged',
      latitude: 12.9279,
      longitude: 77.5831,
      locality: 'Jayanagar Demo Block 4',
      image_url: '/src/assets/images/issue_water_leak_sample_1795516923271.jpg',
      ai_category: 'water_leakage',
      ai_severity: 'high',
      ai_confidence: 0.91,
      ai_description: 'Fractured cast-iron roadside water pipe discharging water into street gutter.',
      ai_reason: 'Active pressurized water stream escaping from damaged roadside pipe flange.',
      assigned_officer_id: 'demo-officer-1',
      assigned_officer_name: 'Vikram Nair (Demo Field Officer)',
      upvote_count: 11,
      upvoter_ids: ['demo-citizen-2'],
      follower_ids: ['demo-citizen-1', 'demo-citizen-2'],
      duplicate_count: 1,
      comments: [],
      status_history: [
        {
          id: 'sh-104-1',
          report_id: 'JC-DEMO-104',
          previous_status: null,
          new_status: 'Submitted',
          changed_by_id: 'demo-citizen-2',
          changed_by_name: 'Rohan Kulkarni (Demo Citizen)',
          changed_by_role: 'citizen',
          note: 'Demonstration water leak logged.',
          created_at: '2026-11-20T09:00:00.000Z',
        },
        {
          id: 'sh-104-2',
          report_id: 'JC-DEMO-104',
          previous_status: 'Submitted',
          new_status: 'Acknowledged',
          changed_by_id: 'demo-officer-1',
          changed_by_name: 'Vikram Nair (Demo Field Officer)',
          changed_by_role: 'officer',
          note: 'Water supply valve crew notified for emergency flange clamp.',
          created_at: '2026-11-21T13:15:00.000Z',
        },
      ],
      verifications: [],
      is_demo: true,
      created_at: '2026-11-20T09:00:00.000Z',
      updated_at: '2026-11-21T13:15:00.000Z',
    },
    {
      id: 'JC-DEMO-105',
      user_id: 'demo-citizen-1',
      reporter_name: 'Ananya Deshmukh (Demo Citizen)',
      title: 'Clogged stormwater drain grate causing ankle-deep puddles',
      description:
        'Silt and fallen leaves have blocked the stormwater inlet beside Residency Cross Road, creating standing water near the school gate.',
      category: 'drainage',
      severity: 'medium',
      status: 'Closed',
      latitude: 12.9689,
      longitude: 77.6012,
      locality: 'MG Road Demo Zone',
      image_url: '/src/assets/images/issue_water_leak_sample_1795516923271.jpg',
      resolution_image_url: '/src/assets/images/hero_smart_city_1795516922199.jpg',
      ai_category: 'drainage',
      ai_severity: 'medium',
      ai_confidence: 0.78,
      ai_description: 'Standing water accumulation near clogged street curb drain.',
      ai_reason: 'Pooled roadside water alongside concrete storm gutter.',
      assigned_officer_id: 'demo-officer-1',
      assigned_officer_name: 'Vikram Nair (Demo Field Officer)',
      upvote_count: 9,
      upvoter_ids: ['demo-citizen-1'],
      follower_ids: ['demo-citizen-1'],
      duplicate_count: 0,
      comments: [],
      status_history: [
        {
          id: 'sh-105-1',
          report_id: 'JC-DEMO-105',
          previous_status: null,
          new_status: 'Submitted',
          changed_by_id: 'demo-citizen-1',
          changed_by_name: 'Ananya Deshmukh (Demo Citizen)',
          changed_by_role: 'citizen',
          note: 'Demonstration drainage report created.',
          created_at: '2026-10-28T07:20:00.000Z',
        },
        {
          id: 'sh-105-2',
          report_id: 'JC-DEMO-105',
          previous_status: 'Resolved - Awaiting Verification',
          new_status: 'Closed',
          changed_by_id: 'demo-citizen-2',
          changed_by_name: 'Rohan Kulkarni (Demo Citizen)',
          changed_by_role: 'citizen',
          note: 'Community verification threshold reached after desilting.',
          created_at: '2026-11-04T15:00:00.000Z',
        },
      ],
      verifications: [
        {
          id: 'ver-105-1',
          report_id: 'JC-DEMO-105',
          user_id: 'demo-citizen-1',
          user_name: 'Ananya Deshmukh (Demo Citizen)',
          confirmed: true,
          created_at: '2026-11-03T12:00:00.000Z',
        },
        {
          id: 'ver-105-2',
          report_id: 'JC-DEMO-105',
          user_id: 'demo-citizen-2',
          user_name: 'Rohan Kulkarni (Demo Citizen)',
          confirmed: true,
          created_at: '2026-11-04T15:00:00.000Z',
        },
      ],
      is_demo: true,
      created_at: '2026-10-28T07:20:00.000Z',
      updated_at: '2026-11-04T15:00:00.000Z',
    },
  ];

  const reports: CivicReport[] = baseReports.map((rep) => {
    const prio = calculatePriorityScore({
      severity: rep.severity,
      upvoteCount: rep.upvote_count,
      duplicateCount: rep.duplicate_count,
      createdAt: rep.created_at,
      status: rep.status,
    });
    return {
      ...rep,
      priority_score: prio.score,
      priority_label: prio.label,
      priority_breakdown: prio.breakdown,
    };
  });

  const notifications: CivicNotification[] = [
    {
      id: 'notif-1',
      user_id: 'demo-citizen-1',
      report_id: 'JC-DEMO-103',
      title: 'Community Verification Requested',
      message: 'JC-DEMO-103 (Tilted LED streetlight pole) was marked resolved. Please verify the fix on-site.',
      is_read: false,
      created_at: '2026-11-22T14:26:00.000Z',
    },
    {
      id: 'notif-2',
      user_id: 'demo-citizen-1',
      report_id: 'JC-DEMO-101',
      title: 'Report In Progress',
      message: 'Vikram Nair updated JC-DEMO-101 to In Progress: Cold-mix resurfacing scheduled.',
      is_read: false,
      created_at: '2026-11-19T09:12:00.000Z',
    },
  ];

  const points_transactions: PointsTransaction[] = [
    {
      id: 'pt-1',
      user_id: 'demo-citizen-1',
      report_id: 'JC-DEMO-101',
      action_type: 'First valid report',
      points: 20,
      dedup_key: 'first_report:demo-citizen-1',
      created_at: '2026-11-12T08:15:00.000Z',
    },
    {
      id: 'pt-2',
      user_id: 'demo-citizen-1',
      report_id: 'JC-DEMO-105',
      action_type: 'Verified resolution contribution',
      points: 15,
      dedup_key: 'verify:JC-DEMO-105:demo-citizen-1',
      created_at: '2026-11-03T12:00:00.000Z',
    },
  ];

  const projects: InfrastructureProject[] = [
    {
      id: 'proj-demo-1',
      name: 'Sample Smart Solar Streetlight Corridor (Demo Record)',
      department: 'Urban Lighting & Energy Cell (Demonstration)',
      locality: 'MG Road Demo Zone',
      description:
        'Illustrative demonstration record showing how verified municipal LED & solar luminaire upgrades appear when synced from Open Government Data India or administrator-verified publications.',
      estimated_cost: 'Unverified in Demo (Enter Official Budget)',
      start_date: '2026-08-01',
      expected_completion_date: '2027-02-15',
      status: 'Demonstration Record — Ongoing',
      official_source: 'Demo Seed Module (Admin-Verified Placeholder)',
      source_url: 'https://data.gov.in/',
      is_demo: true,
      last_updated: '2026-11-15T10:00:00.000Z',
    },
    {
      id: 'proj-demo-2',
      name: 'Sample Stormwater Micro-Drainage Rehabilitation (Demo Record)',
      department: 'Stormwater & Sanitation Engineering (Demonstration)',
      locality: 'Indiranagar Demo Sector',
      description:
        'Illustrative project card demonstrating transparent schedule, department attribution, and source verification without fabricating official government budget figures.',
      estimated_cost: 'Pending Official Disclosure',
      start_date: '2026-09-15',
      expected_completion_date: '2027-04-30',
      status: 'Demonstration Record — Planning',
      official_source: 'Demo Seed Module (Admin-Verified Placeholder)',
      source_url: 'https://pgportal.gov.in/',
      is_demo: true,
      last_updated: '2026-11-18T12:00:00.000Z',
    },
  ];

  const audit_logs: AdminAuditLog[] = [
    {
      id: 'audit-1',
      admin_id: 'demo-admin-1',
      admin_name: 'Meera Iyer (Demo Administrator)',
      action: 'INITIALIZED_DEMO_DATASET',
      target_type: 'system',
      details: 'Seeded clearly labelled demonstration records for civic evaluation.',
      created_at: '2026-11-01T09:00:00.000Z',
    },
  ];

  return {
    users,
    reports,
    notifications,
    points_transactions,
    duplicate_links: [],
    projects,
    audit_logs,
    settings: {
      duplicate_radius_meters: 50,
      duplicate_similarity_threshold: 0.35,
      verification_confirm_threshold: 2,
      verification_reopen_threshold: 2,
      target_acknowledge_hours: 24,
      target_resolve_hours: 96,
      ai_model: 'gemini-4-hydrogen',
    },
    ai_stats: {
      total_requests: 5,
      successful_classifications: 5,
      manual_fallbacks: 0,
    },
  };
}

class DemoStoreManager {
  private db: DemoDatabase;

  constructor() {
    this.db = this.load();
  }

  private load(): DemoDatabase {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DemoDatabase;
        if (parsed && Array.isArray(parsed.reports) && Array.isArray(parsed.users)) {
          // Backfill new optional fields safely without dropping existing user data
          parsed.settings = {
            duplicate_radius_meters: parsed.settings?.duplicate_radius_meters ?? 50,
            duplicate_similarity_threshold: parsed.settings?.duplicate_similarity_threshold ?? 0.35,
            verification_confirm_threshold: parsed.settings?.verification_confirm_threshold ?? 2,
            verification_reopen_threshold: parsed.settings?.verification_reopen_threshold ?? 2,
            target_acknowledge_hours: parsed.settings?.target_acknowledge_hours ?? 24,
            target_resolve_hours: parsed.settings?.target_resolve_hours ?? 96,
            ai_model: parsed.settings?.ai_model || 'gemini-4-hydrogen',
          };
          parsed.duplicate_links = (parsed.duplicate_links || []).map((dl) => ({
            ...dl,
            review_status: dl.review_status || 'pending',
          }));
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to read demo store, re-seeding:', err);
    }
    const seed = buildSeedDatabase();
    this.save(seed);
    return seed;
  }

  public getDb(): DemoDatabase {
    return this.db;
  }

  public save(nextDb?: DemoDatabase): void {
    if (nextDb) {
      this.db = nextDb;
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
  }

  public recalculateReportPriority(report: CivicReport): void {
    const prio = calculatePriorityScore({
      severity: report.severity,
      upvoteCount: report.upvote_count,
      duplicateCount: report.duplicate_count,
      createdAt: report.created_at,
      status: report.status,
    });
    report.priority_score = prio.score;
    report.priority_label = prio.label;
    report.priority_breakdown = prio.breakdown;
    report.escalation = computeEscalationStatus(report, {
      targetAcknowledgeHours: this.db?.settings?.target_acknowledge_hours ?? 24,
      targetResolveHours: this.db?.settings?.target_resolve_hours ?? 96,
    });
  }

  public awardPoints(params: {
    userId: string;
    reportId?: string;
    actionType: string;
    points: number;
    dedupKey: string;
  }): boolean {
    const exists = this.db.points_transactions.some((tx) => tx.dedup_key === params.dedupKey);
    if (exists) return false;

    const user = this.db.users.find((u) => u.id === params.userId);
    if (!user) return false;

    this.db.points_transactions.unshift({
      id: `pt-${crypto.randomUUID()}`,
      user_id: params.userId,
      report_id: params.reportId,
      action_type: params.actionType,
      points: params.points,
      dedup_key: params.dedupKey,
      created_at: new Date().toISOString(),
    });

    user.civic_points += params.points;
    const hasSubmitted = this.db.reports.some((r) => r.user_id === user.id);
    user.badges = computeEarnedBadges(user.civic_points, hasSubmitted);
    return true;
  }

  public addNotification(params: {
    userId: string;
    reportId?: string;
    title: string;
    message: string;
  }): void {
    this.db.notifications.unshift({
      id: `notif-${crypto.randomUUID()}`,
      user_id: params.userId,
      report_id: params.reportId,
      title: params.title,
      message: params.message,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  public logAdminAction(params: {
    adminId: string;
    adminName: string;
    action: string;
    targetType: string;
    targetId?: string;
    details: string;
  }): void {
    this.db.audit_logs.unshift({
      id: `audit-${crypto.randomUUID()}`,
      admin_id: params.adminId,
      admin_name: params.adminName,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      details: params.details,
      created_at: new Date().toISOString(),
    });
  }

  public toPublicUser(u: StoredUser): UserProfile {
    return {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      locality: u.locality,
      civic_points: u.civic_points,
      department: u.department,
      badges: u.badges,
      preferred_language: u.preferred_language || 'en',
      notification_preferences: u.notification_preferences || {
        status_updates: true,
        community_replies: true,
        nearby_alerts: true,
      },
      created_at: u.created_at,
    };
  }

  public ensureRoleUpdateAllowed(targetRole: UserRole): boolean {
    return targetRole === 'citizen' || targetRole === 'officer' || targetRole === 'admin';
  }
}

export const demoStore = new DemoStoreManager();
