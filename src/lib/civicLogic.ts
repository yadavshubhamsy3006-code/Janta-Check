import type {
  AIAnalysisResult,
  BadgeDefinition,
  CivicReport,
  CivicTrendInsight,
  DuplicateMatch,
  EscalationInfo,
  IssueCategory,
  IssueSeverity,
  PriorityLabel,
  ReportStatus,
  ResolutionVerification,
  WardStat,
} from '../types/civic';

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  pothole: 'Potholes & Damaged Roads',
  garbage: 'Garbage Accumulation',
  streetlight: 'Damaged Streetlights',
  water_leakage: 'Water Leakage',
  drainage: 'Drainage & Sanitation',
  other: 'Other Infrastructure',
};

export const CATEGORY_COLORS: Record<IssueCategory, string> = {
  pothole: '#DC2626',
  garbage: '#D97706',
  streetlight: '#0284C7',
  water_leakage: '#2563EB',
  drainage: '#7C3AED',
  other: '#475569',
};

export const ALL_REPORT_STATUSES: ReportStatus[] = [
  'Submitted',
  'Under Review',
  'Acknowledged',
  'In Progress',
  'Resolved - Awaiting Verification',
  'Reopened',
  'Closed',
];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    slug: 'first-reporter',
    name: 'First Reporter',
    description: 'Submitted your first verified civic infrastructure report.',
    threshold_points: 20,
    icon_name: 'Flag',
  },
  {
    slug: 'community-helper',
    name: 'Community Helper',
    description: 'Earned 35+ Civic Points supporting neighborhood complaints.',
    threshold_points: 35,
    icon_name: 'HeartHandshake',
  },
  {
    slug: 'infrastructure-watcher',
    name: 'Infrastructure Watcher',
    description: 'Earned 60+ Civic Points monitoring and verifying city fixes.',
    threshold_points: 60,
    icon_name: 'Eye',
  },
  {
    slug: 'clean-city-contributor',
    name: 'Clean City Contributor',
    description: 'Earned 90+ Civic Points helping resolve local hazards.',
    threshold_points: 90,
    icon_name: 'Leaf',
  },
  {
    slug: 'civic-champion',
    name: 'Civic Champion',
    description: 'Reached 150+ Civic Points as a trusted neighborhood steward.',
    threshold_points: 150,
    icon_name: 'Award',
  },
];

/**
 * Transparent project-defined Priority Scoring (0 - 100):
 * 30% Severity + 30% Community Support + 20% Duplicate Report Frequency + 20% Waiting Time
 */
export function calculatePriorityScore(input: {
  severity: IssueSeverity;
  upvoteCount: number;
  duplicateCount: number;
  createdAt: string | Date;
  now?: Date;
  status?: ReportStatus;
}): {
  score: number;
  label: PriorityLabel;
  breakdown: {
    severity_points: number;
    support_points: number;
    duplicate_points: number;
    waiting_points: number;
  };
} {
  const severityWeights: Record<IssueSeverity, number> = {
    low: 0.25,
    medium: 0.5,
    high: 0.8,
    critical: 1.0,
  };

  const severityNorm = severityWeights[input.severity] ?? 0.5;
  const supportNorm = Math.min(1, Math.max(0, input.upvoteCount) / 25);
  const duplicateNorm = Math.min(1, Math.max(0, input.duplicateCount) / 5);

  const createdMs = new Date(input.createdAt).getTime();
  const nowMs = (input.now ?? new Date()).getTime();
  const daysWaiting = Math.max(0, (nowMs - createdMs) / (1000 * 60 * 60 * 24));
  const waitingNorm = Math.min(1, daysWaiting / 14);

  const severity_points = Math.round(severityNorm * 30 * 10) / 10;
  const support_points = Math.round(supportNorm * 30 * 10) / 10;
  const duplicate_points = Math.round(duplicateNorm * 20 * 10) / 10;
  const waiting_points = Math.round(waitingNorm * 20 * 10) / 10;

  let rawScore = severity_points + support_points + duplicate_points + waiting_points;
  if (input.status === 'Closed') {
    rawScore = Math.min(rawScore, 15);
  }
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let label: PriorityLabel = 'Low';
  if (score >= 75) label = 'Critical';
  else if (score >= 55) label = 'High';
  else if (score >= 30) label = 'Medium';

  return {
    score,
    label,
    breakdown: {
      severity_points,
      support_points,
      duplicate_points,
      waiting_points,
    },
  };
}

/**
 * Haversine great-circle distance in meters between two WGS84 coordinates.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'near',
  'this',
  'that',
  'from',
  'have',
  'been',
  'there',
  'here',
  'road',
  'area',
  'issue',
]);

export function tokenizeText(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return new Set(tokens);
}

/**
 * Computes combined text + category similarity score (0..1)
 */
export function computeTextSimilarity(a: string, b: string): number {
  const setA = tokenizeText(a);
  const setB = tokenizeText(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 1000) / 1000;
}

/**
 * Finds potentially duplicate unresolved reports within configurable radius & similarity threshold.
 */
export function detectPotentialDuplicates(
  candidate: {
    latitude: number;
    longitude: number;
    category: IssueCategory;
    title: string;
    description: string;
  },
  existingReports: CivicReport[],
  options: { radiusMeters?: number; similarityThreshold?: number } = {}
): DuplicateMatch[] {
  const radiusMeters = options.radiusMeters ?? 50;
  const similarityThreshold = options.similarityThreshold ?? 0.35;

  const matches: DuplicateMatch[] = [];
  for (const report of existingReports) {
    if (report.status === 'Closed') continue;

    const distance = haversineDistanceMeters(
      candidate.latitude,
      candidate.longitude,
      report.latitude,
      report.longitude
    );

    if (distance > radiusMeters) continue;

    const textSim = computeTextSimilarity(
      `${candidate.title} ${candidate.description}`,
      `${report.title} ${report.description}`
    );
    const sameCategory = candidate.category === report.category;
    const distanceFactor = Math.max(0, 1 - distance / Math.max(1, radiusMeters));
    const combinedSimilarity =
      Math.round(((sameCategory ? 0.45 : 0.1) + textSim * 0.35 + distanceFactor * 0.2) * 1000) /
      1000;

    if (sameCategory || combinedSimilarity >= similarityThreshold) {
      matches.push({
        report,
        distance_meters: distance,
        similarity_score: combinedSimilarity,
      });
    }
  }

  return matches.sort((a, b) => a.distance_meters - b.distance_meters);
}

const VALID_CATEGORIES: Set<IssueCategory> = new Set([
  'pothole',
  'garbage',
  'streetlight',
  'water_leakage',
  'drainage',
  'other',
]);

const VALID_SEVERITIES: Set<IssueSeverity> = new Set(['low', 'medium', 'high', 'critical']);

/**
 * Validates and normalizes JSON returned by Gemini AI image analysis.
 * Never fabricates confidence if omitted by model.
 */
export function validateAIAnalysisPayload(raw: unknown): AIAnalysisResult {
  if (!raw || typeof raw !== 'object') {
    return {
      category: 'other',
      description: 'Image could not be classified automatically. Please select a category.',
      severity: 'medium',
      reason: 'Unclear visual response from image analysis.',
      unclear: true,
      source: 'manual_fallback',
    };
  }

  const record = raw as Record<string, unknown>;
  const rawCategory = String(record.category ?? 'other').toLowerCase().trim() as IssueCategory;
  const category: IssueCategory = VALID_CATEGORIES.has(rawCategory) ? rawCategory : 'other';

  const rawSeverity = String(record.severity ?? 'medium').toLowerCase().trim() as IssueSeverity;
  const severity: IssueSeverity = VALID_SEVERITIES.has(rawSeverity) ? rawSeverity : 'medium';

  const description =
    typeof record.description === 'string' && record.description.trim().length > 0
      ? record.description.trim().slice(0, 400)
      : 'Infrastructure issue detected in uploaded photograph.';

  const reason =
    typeof record.reason === 'string' && record.reason.trim().length > 0
      ? record.reason.trim().slice(0, 300)
      : 'Visual cues observed in the submitted image.';

  let confidence: number | undefined;
  if (typeof record.confidence === 'number' && Number.isFinite(record.confidence)) {
    if (record.confidence >= 0 && record.confidence <= 1) {
      confidence = Math.round(record.confidence * 100) / 100;
    }
  }

  const suggested_title =
    typeof record.suggested_title === 'string' && record.suggested_title.trim().length > 0
      ? record.suggested_title.trim().slice(0, 120)
      : undefined;

  const unclear = Boolean(record.unclear) || (confidence !== undefined && confidence < 0.45);

  return {
    category,
    suggested_title,
    description,
    severity,
    confidence,
    reason,
    unclear,
    source: 'gemini',
  };
}

/**
 * Evaluates whether community resolution verifications reach close or reopen thresholds.
 */
export function evaluateCommunityVerification(
  verifications: ResolutionVerification[],
  options: { confirmThreshold?: number; reopenThreshold?: number } = {}
): {
  confirmCount: number;
  reopenCount: number;
  nextStatus: ReportStatus;
} {
  const confirmThreshold = options.confirmThreshold ?? 2;
  const reopenThreshold = options.reopenThreshold ?? 2;

  const confirmCount = verifications.filter((v) => v.confirmed).length;
  const reopenCount = verifications.filter((v) => !v.confirmed).length;

  let nextStatus: ReportStatus = 'Resolved - Awaiting Verification';
  if (reopenCount >= reopenThreshold) {
    nextStatus = 'Reopened';
  } else if (confirmCount >= confirmThreshold) {
    nextStatus = 'Closed';
  }

  return { confirmCount, reopenCount, nextStatus };
}

/**
 * Returns earned badge names based on total civic points & whether user has reported.
 */
export function computeEarnedBadges(civicPoints: number, hasSubmittedReport: boolean): string[] {
  const earned: string[] = [];
  if (hasSubmittedReport) {
    earned.push('First Reporter');
  }
  for (const badge of BADGE_DEFINITIONS) {
    if (badge.slug === 'first-reporter') continue;
    if (civicPoints >= badge.threshold_points) {
      earned.push(badge.name);
    }
  }
  return earned;
}

/**
 * Project-defined Smart Escalation indicator based on elapsed time and status.
 * Uses configurable response targets (never fabricated municipal SLAs).
 */
export function computeEscalationStatus(
  report: Pick<CivicReport, 'status' | 'created_at' | 'updated_at' | 'severity'>,
  options: { targetAcknowledgeHours?: number; targetResolveHours?: number; now?: Date } = {}
): EscalationInfo {
  const targetAckHours = options.targetAcknowledgeHours ?? 24;
  const targetResolveHours = options.targetResolveHours ?? 96;
  const nowMs = (options.now ?? new Date()).getTime();
  const createdMs = new Date(report.created_at).getTime();
  const hoursElapsed = Math.max(0, Math.round(((nowMs - createdMs) / 3600_000) * 10) / 10);

  if (report.status === 'Closed' || report.status === 'Resolved - Awaiting Verification') {
    return {
      level: 'Resolved',
      hours_elapsed: hoursElapsed,
      is_overdue: false,
      reason: 'Work completed or awaiting community verification.',
    };
  }

  if (report.status === 'Reopened') {
    return {
      level: 'Requires Attention',
      hours_elapsed: hoursElapsed,
      is_overdue: true,
      reason: 'Reopened by citizen verification feedback — requires priority follow-up.',
    };
  }

  if (report.status === 'Submitted' || report.status === 'Under Review') {
    if (hoursElapsed >= targetResolveHours || (report.severity === 'critical' && hoursElapsed >= targetAckHours)) {
      return {
        level: 'Requires Attention',
        hours_elapsed: hoursElapsed,
        is_overdue: true,
        reason: `Unacknowledged for ${Math.round(hoursElapsed)}h (exceeds ${targetAckHours}h review target).`,
      };
    }
    if (hoursElapsed >= targetAckHours) {
      return {
        level: 'Delayed',
        hours_elapsed: hoursElapsed,
        is_overdue: true,
        reason: `Waiting for initial review past ${targetAckHours}h target.`,
      };
    }
    if (hoursElapsed <= 6) {
      return {
        level: 'Recently Submitted',
        hours_elapsed: hoursElapsed,
        is_overdue: false,
        reason: 'Submitted recently within standard intake window.',
      };
    }
    return {
      level: 'Waiting for Review',
      hours_elapsed: hoursElapsed,
      is_overdue: false,
      reason: 'Queued for officer acknowledgement.',
    };
  }

  // Acknowledged or In Progress
  if (hoursElapsed >= targetResolveHours) {
    return {
      level: 'Delayed',
      hours_elapsed: hoursElapsed,
      is_overdue: true,
      reason: `Open for ${Math.round(hoursElapsed)}h (past ${targetResolveHours}h project resolution target).`,
    };
  }

  return {
    level: 'On Track',
    hours_elapsed: hoursElapsed,
    is_overdue: false,
    reason: 'Officer acknowledged and actively being addressed within target window.',
  };
}

/**
 * Aggregates stored reports by ward/locality without inventing ward names.
 */
export function computeWardStatistics(
  reports: CivicReport[],
  options: { targetAcknowledgeHours?: number; targetResolveHours?: number; now?: Date } = {}
): WardStat[] {
  const byWard = new Map<
    string,
    {
      total: number;
      pending: number;
      inProgress: number;
      resolved: number;
      delayedCount: number;
      catCounts: Map<IssueCategory, number>;
    }
  >();

  for (const r of reports) {
    const localityName = (r.ward_name || r.locality || 'Unspecified Locality').trim();
    const entry = byWard.get(localityName) || {
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      delayedCount: 0,
      catCounts: new Map<IssueCategory, number>(),
    };

    entry.total += 1;
    if (r.status === 'Closed' || r.status === 'Resolved - Awaiting Verification') {
      entry.resolved += 1;
    } else if (r.status === 'In Progress' || r.status === 'Acknowledged' || r.status === 'Under Review') {
      entry.inProgress += 1;
    } else {
      entry.pending += 1;
    }

    const esc = computeEscalationStatus(r, options);
    if (esc.is_overdue) entry.delayedCount += 1;

    entry.catCounts.set(r.category, (entry.catCounts.get(r.category) || 0) + 1);
    byWard.set(localityName, entry);
  }

  const stats: WardStat[] = [];
  for (const [locality, data] of byWard.entries()) {
    let topCategory: IssueCategory = 'other';
    let topCount = -1;
    for (const [cat, cnt] of data.catCounts.entries()) {
      if (cnt > topCount) {
        topCount = cnt;
        topCategory = cat;
      }
    }
    stats.push({
      locality,
      total: data.total,
      pending: data.pending,
      inProgress: data.inProgress,
      resolved: data.resolved,
      resolutionRate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
      topCategory,
      delayedCount: data.delayedCount,
    });
  }

  return stats.sort((a, b) => b.total - a.total);
}

/**
 * Generates conservative data-backed trend insights only when sufficient history exists.
 * Never fabricates accident predictions or external statistics.
 */
export function computeCivicTrendInsights(
  reports: CivicReport[],
  minClusterReports = 2
): {
  sufficientData: boolean;
  insights: CivicTrendInsight[];
  mostCommonCategory: IssueCategory | null;
  note: string;
} {
  if (reports.length < 3) {
    return {
      sufficientData: false,
      insights: [],
      mostCommonCategory: null,
      note: 'Not enough stored complaints yet to identify recurring neighborhood patterns. Insights will appear once more reports are logged.',
    };
  }

  const categoryTotals = new Map<IssueCategory, number>();
  const clusterMap = new Map<string, { locality: string; category: IssueCategory; count: number }>();

  for (const r of reports) {
    categoryTotals.set(r.category, (categoryTotals.get(r.category) || 0) + 1);
    const key = `${r.locality}::${r.category}`;
    const existing = clusterMap.get(key) || { locality: r.locality, category: r.category, count: 0 };
    existing.count += 1;
    clusterMap.set(key, existing);
  }

  let mostCommonCategory: IssueCategory | null = null;
  let maxCatCount = 0;
  for (const [cat, count] of categoryTotals.entries()) {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostCommonCategory = cat;
    }
  }

  const insights: CivicTrendInsight[] = Array.from(clusterMap.values())
    .filter((item) => item.count >= minClusterReports)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((item, idx) => ({
      id: `insight-${idx + 1}`,
      locality: item.locality,
      category: item.category,
      count: item.count,
      summary: `${item.count} ${CATEGORY_LABELS[item.category]} complaints logged in ${item.locality}, indicating a recurring local maintenance hotspot.`,
    }));

  if (insights.length === 0) {
    return {
      sufficientData: false,
      insights: [],
      mostCommonCategory,
      note: 'Current complaints are spread across different categories and localities. Recurring cluster insights require multiple similar reports in the same area.',
    };
  }

  return {
    sufficientData: true,
    insights,
    mostCommonCategory,
    note: 'Patterns derived strictly from historical complaint frequency stored in Janta Check.',
  };
}

/**
 * Filters unresolved reports within a specified radius from user coordinates.
 */
export function filterNearbyReports(
  reports: CivicReport[],
  coords: { latitude: number; longitude: number },
  radiusMeters = 3000
): Array<{ report: CivicReport; distance_meters: number }> {
  return reports
    .filter((r) => r.status !== 'Closed')
    .map((report) => ({
      report,
      distance_meters: haversineDistanceMeters(
        coords.latitude,
        coords.longitude,
        report.latitude,
        report.longitude
      ),
    }))
    .filter((item) => item.distance_meters <= radiusMeters)
    .sort((a, b) => a.distance_meters - b.distance_meters);
}
