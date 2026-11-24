import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePriorityScore,
  computeCivicTrendInsights,
  computeEarnedBadges,
  computeEscalationStatus,
  computeWardStatistics,
  detectPotentialDuplicates,
  evaluateCommunityVerification,
  filterNearbyReports,
  haversineDistanceMeters,
  validateAIAnalysisPayload,
} from './civicLogic';
import type { CivicReport } from '../types/civic';

test('calculatePriorityScore stays within 0-100 and weights components accurately', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const fourteenDaysAgo = new Date('2026-11-10T12:00:00Z');

  const critical = calculatePriorityScore({
    severity: 'critical',
    upvoteCount: 25,
    duplicateCount: 5,
    createdAt: fourteenDaysAgo,
    now,
    status: 'Submitted',
  });
  assert.equal(critical.score, 100);
  assert.equal(critical.label, 'Critical');

  const low = calculatePriorityScore({
    severity: 'low',
    upvoteCount: 0,
    duplicateCount: 0,
    createdAt: now,
    now,
    status: 'Submitted',
  });
  assert.equal(low.score, 8);
  assert.equal(low.label, 'Low');

  const closedCap = calculatePriorityScore({
    severity: 'critical',
    upvoteCount: 50,
    duplicateCount: 10,
    createdAt: fourteenDaysAgo,
    now,
    status: 'Closed',
  });
  assert.equal(closedCap.score, 15);
});

test('haversineDistanceMeters calculates nearby distance accurately', () => {
  const distSame = haversineDistanceMeters(12.9716, 77.5946, 12.9716, 77.5946);
  assert.equal(distSame, 0);

  // ~30 meters north
  const distNearby = haversineDistanceMeters(12.9716, 77.5946, 12.97187, 77.5946);
  assert.ok(distNearby > 25 && distNearby < 35, `Expected ~30m, got ${distNearby}`);
});

test('detectPotentialDuplicates finds unresolved reports within 50m without matching closed or far reports', () => {
  const baseReport: CivicReport = {
    id: 'rep-1',
    user_id: 'u-1',
    reporter_name: 'Aarav',
    title: 'Deep pothole near metro gate',
    description: 'Deep pothole causing two-wheeler skids near metro pillar 12',
    category: 'pothole',
    severity: 'high',
    priority_score: 62,
    priority_label: 'High',
    priority_breakdown: { severity_points: 24, support_points: 18, duplicate_points: 8, waiting_points: 12 },
    status: 'Submitted',
    latitude: 12.9716,
    longitude: 77.5946,
    locality: 'MG Road Demo Zone',
    image_url: '/sample.jpg',
    upvote_count: 15,
    upvoter_ids: [],
    follower_ids: [],
    duplicate_count: 2,
    comments: [],
    status_history: [],
    verifications: [],
    is_demo: true,
    created_at: '2026-11-20T00:00:00Z',
    updated_at: '2026-11-20T00:00:00Z',
  };

  const closedReport: CivicReport = {
    ...baseReport,
    id: 'rep-closed',
    status: 'Closed',
  };

  const farReport: CivicReport = {
    ...baseReport,
    id: 'rep-far',
    latitude: 12.985,
    longitude: 77.61,
  };

  const matches = detectPotentialDuplicates(
    {
      latitude: 12.97175,
      longitude: 77.59462,
      category: 'pothole',
      title: 'Pothole near metro pillar',
      description: 'Large pothole damaging cars near metro gate',
    },
    [baseReport, closedReport, farReport],
    { radiusMeters: 50 }
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].report.id, 'rep-1');
  assert.ok(matches[0].distance_meters <= 50);
});

test('validateAIAnalysisPayload validates JSON and does not invent confidence', () => {
  const valid = validateAIAnalysisPayload({
    category: 'pothole',
    description: 'Visible asphalt cavity on main lane',
    severity: 'high',
    confidence: 0.91,
    reason: 'Cracked asphalt edge with water pooling inside cavity',
  });
  assert.equal(valid.category, 'pothole');
  assert.equal(valid.severity, 'high');
  assert.equal(valid.confidence, 0.91);
  assert.equal(valid.unclear, false);

  const noConfidence = validateAIAnalysisPayload({
    category: 'unknown_thing',
    description: 'Blurry night photo',
    severity: 'invalid',
    reason: 'Too dark to identify',
    unclear: true,
  });
  assert.equal(noConfidence.category, 'other');
  assert.equal(noConfidence.severity, 'medium');
  assert.equal(noConfidence.confidence, undefined);
  assert.equal(noConfidence.unclear, true);
});

test('evaluateCommunityVerification closes or reopens when threshold is reached', () => {
  const mkVerification = (id: string, confirmed: boolean) => ({
    id,
    report_id: 'rep-1',
    user_id: id,
    user_name: 'Citizen',
    confirmed,
    created_at: '2026-11-24T00:00:00Z',
  });

  const pending = evaluateCommunityVerification([mkVerification('u1', true)], {
    confirmThreshold: 2,
    reopenThreshold: 2,
  });
  assert.equal(pending.nextStatus, 'Resolved - Awaiting Verification');

  const closed = evaluateCommunityVerification(
    [mkVerification('u1', true), mkVerification('u2', true)],
    { confirmThreshold: 2, reopenThreshold: 2 }
  );
  assert.equal(closed.nextStatus, 'Closed');

  const reopened = evaluateCommunityVerification(
    [mkVerification('u1', false), mkVerification('u2', false)],
    { confirmThreshold: 2, reopenThreshold: 2 }
  );
  assert.equal(reopened.nextStatus, 'Reopened');
});

test('computeEarnedBadges unlocks badges accurately', () => {
  assert.deepEqual(computeEarnedBadges(0, false), []);
  assert.deepEqual(computeEarnedBadges(20, true), ['First Reporter']);
  assert.ok(computeEarnedBadges(160, true).includes('Civic Champion'));
});

test('computeEscalationStatus transitions accurately by age, status, and severity', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const recent = computeEscalationStatus(
    {
      status: 'Submitted',
      severity: 'medium',
      created_at: '2026-11-24T10:00:00Z',
      updated_at: '2026-11-24T10:00:00Z',
    },
    { targetAcknowledgeHours: 24, targetResolveHours: 96, now }
  );
  assert.equal(recent.level, 'Recently Submitted');
  assert.equal(recent.is_overdue, false);

  const delayed = computeEscalationStatus(
    {
      status: 'Submitted',
      severity: 'medium',
      created_at: '2026-11-22T12:00:00Z',
      updated_at: '2026-11-22T12:00:00Z',
    },
    { targetAcknowledgeHours: 24, targetResolveHours: 96, now }
  );
  assert.equal(delayed.level, 'Delayed');
  assert.equal(delayed.is_overdue, true);

  const reopened = computeEscalationStatus(
    {
      status: 'Reopened',
      severity: 'low',
      created_at: '2026-11-24T11:00:00Z',
      updated_at: '2026-11-24T11:00:00Z',
    },
    { now }
  );
  assert.equal(reopened.level, 'Requires Attention');
  assert.equal(reopened.is_overdue, true);
});

test('computeWardStatistics and computeCivicTrendInsights derive honest data-backed insights', () => {
  const mkReport = (id: string, locality: string, category: CivicReport['category'], status: CivicReport['status']): CivicReport => ({
    id,
    user_id: 'u1',
    reporter_name: 'Citizen',
    title: 'Sample civic report title',
    description: 'Detailed sample civic report description.',
    category,
    severity: 'medium',
    priority_score: 50,
    priority_label: 'Medium',
    priority_breakdown: { severity_points: 15, support_points: 15, duplicate_points: 10, waiting_points: 10 },
    status,
    latitude: 12.97,
    longitude: 77.6,
    locality,
    image_url: '/sample.jpg',
    upvote_count: 5,
    upvoter_ids: [],
    follower_ids: [],
    duplicate_count: 0,
    comments: [],
    status_history: [],
    verifications: [],
    is_demo: true,
    created_at: '2026-11-20T00:00:00Z',
    updated_at: '2026-11-20T00:00:00Z',
  });

  const tooFew = computeCivicTrendInsights([mkReport('1', 'Ward A', 'pothole', 'Submitted')]);
  assert.equal(tooFew.sufficientData, false);
  assert.equal(tooFew.insights.length, 0);

  const sampleList = [
    mkReport('1', 'Ward A', 'pothole', 'Submitted'),
    mkReport('2', 'Ward A', 'pothole', 'In Progress'),
    mkReport('3', 'Ward B', 'garbage', 'Closed'),
  ];

  const wards = computeWardStatistics(sampleList);
  assert.equal(wards.length, 2);
  assert.equal(wards[0].locality, 'Ward A');
  assert.equal(wards[0].topCategory, 'pothole');
  assert.equal(wards[1].resolutionRate, 100);

  const trends = computeCivicTrendInsights(sampleList, 2);
  assert.equal(trends.sufficientData, true);
  assert.equal(trends.mostCommonCategory, 'pothole');
  assert.equal(trends.insights[0].locality, 'Ward A');

  const nearby = filterNearbyReports(sampleList, { latitude: 12.97, longitude: 77.6 }, 500);
  assert.equal(nearby.length, 2); // Closed report #3 excluded
});
