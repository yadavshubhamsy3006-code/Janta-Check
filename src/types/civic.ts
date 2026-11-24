export type UserRole = 'citizen' | 'officer' | 'admin';

export type SupportedLanguage = 'en' | 'hi' | 'kn';

export type TextSizePreference = 'normal' | 'large' | 'xlarge';

export type IssueCategory =
  | 'pothole'
  | 'garbage'
  | 'streetlight'
  | 'water_leakage'
  | 'drainage'
  | 'other';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Acknowledged'
  | 'In Progress'
  | 'Resolved - Awaiting Verification'
  | 'Reopened'
  | 'Closed';

export type PriorityLabel = 'Low' | 'Medium' | 'High' | 'Critical';

export type EscalationLevel =
  | 'Recently Submitted'
  | 'Waiting for Review'
  | 'On Track'
  | 'Delayed'
  | 'Requires Attention'
  | 'Resolved';

export interface NotificationPreferences {
  status_updates: boolean;
  community_replies: boolean;
  nearby_alerts: boolean;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  locality: string;
  civic_points: number;
  department?: string;
  badges: string[];
  preferred_language?: SupportedLanguage;
  notification_preferences?: NotificationPreferences;
  created_at: string;
}

export interface AIAnalysisResult {
  category: IssueCategory;
  suggested_title?: string;
  description: string;
  severity: IssueSeverity;
  confidence?: number;
  reason: string;
  unclear?: boolean;
  source: 'gemini' | 'manual_fallback';
}

export interface ComplaintAssistantSuggestion {
  improved_title: string;
  improved_description: string;
  suggested_additions: string[];
  language: SupportedLanguage;
}

export interface StatusHistoryEntry {
  id: string;
  report_id: string;
  previous_status: ReportStatus | null;
  new_status: ReportStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_by_role: UserRole;
  note: string;
  created_at: string;
}

export interface ReportComment {
  id: string;
  report_id: string;
  user_id: string;
  author_name: string;
  author_role: UserRole;
  content: string;
  is_flagged: boolean;
  flag_reason?: string;
  is_hidden: boolean;
  created_at: string;
}

export interface ResolutionVerification {
  id: string;
  report_id: string;
  user_id: string;
  user_name: string;
  confirmed: boolean;
  comment?: string;
  created_at: string;
}

export interface EscalationInfo {
  level: EscalationLevel;
  hours_elapsed: number;
  is_overdue: boolean;
  reason: string;
}

export interface CivicReport {
  id: string;
  user_id: string;
  reporter_name: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  priority_score: number;
  priority_label: PriorityLabel;
  priority_breakdown: {
    severity_points: number;
    support_points: number;
    duplicate_points: number;
    waiting_points: number;
  };
  status: ReportStatus;
  escalation?: EscalationInfo;
  latitude: number;
  longitude: number;
  locality: string;
  ward_name?: string;
  image_url: string;
  resolution_image_url?: string;
  completed_at?: string;
  ai_category?: IssueCategory;
  ai_severity?: IssueSeverity;
  ai_confidence?: number;
  ai_description?: string;
  ai_reason?: string;
  assigned_officer_id?: string;
  assigned_officer_name?: string;
  upvote_count: number;
  upvoter_ids: string[];
  follower_ids: string[];
  duplicate_count: number;
  comments: ReportComment[];
  status_history: StatusHistoryEntry[];
  verifications: ResolutionVerification[];
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DuplicateMatch {
  report: CivicReport;
  distance_meters: number;
  similarity_score: number;
}

export interface CivicNotification {
  id: string;
  user_id: string;
  report_id?: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  report_id?: string;
  action_type: string;
  points: number;
  dedup_key: string;
  created_at: string;
}

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  threshold_points: number;
  icon_name: string;
}

export interface InfrastructureProject {
  id: string;
  name: string;
  department: string;
  locality: string;
  description: string;
  estimated_cost?: string;
  start_date?: string;
  expected_completion_date?: string;
  status: string;
  official_source: string;
  source_url?: string;
  is_demo: boolean;
  last_updated: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id?: string;
  details: string;
  created_at: string;
}

export interface DuplicateLinkView {
  id: string;
  primary_report_id: string;
  primary_title?: string;
  duplicate_report_id?: string;
  reported_by: string;
  distance_meters: number;
  similarity_score: number;
  resolution_action: 'supported_existing' | 'created_separate';
  review_status: 'pending' | 'confirmed' | 'dismissed';
  created_at: string;
}

export interface PlatformSettings {
  duplicate_radius_meters: number;
  duplicate_similarity_threshold: number;
  verification_confirm_threshold: number;
  verification_reopen_threshold: number;
  target_acknowledge_hours: number;
  target_resolve_hours: number;
  ai_model: string;
}

export interface WardStat {
  locality: string;
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  resolutionRate: number;
  topCategory: IssueCategory;
  delayedCount: number;
}

export interface CivicTrendInsight {
  id: string;
  locality: string;
  category: IssueCategory;
  count: number;
  summary: string;
}

