import type {
  AIAnalysisResult,
  AdminAuditLog,
  CivicNotification,
  CivicReport,
  CivicTrendInsight,
  ComplaintAssistantSuggestion,
  DuplicateLinkView,
  DuplicateMatch,
  InfrastructureProject,
  IssueCategory,
  NotificationPreferences,
  PlatformSettings,
  PointsTransaction,
  ReportStatus,
  SupportedLanguage,
  UserProfile,
  UserRole,
  WardStat,
} from '../types/civic';

export interface ConfigStatus {
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
  demoModeAvailable: boolean;
  mode: 'supabase' | 'demo';
}

export interface AnalyticsResponse {
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    resolutionRate: number;
  };
  categoryDistribution: Array<{ name: string; value: number }>;
  localityComparison: Array<{ locality: string; total: number; resolved: number; pending: number }>;
  priorityDistribution: Array<{ name: string; value: number }>;
  monthlyTrends: Array<{ month: string; reported: number; resolved: number }>;
  wardStats?: WardStat[];
  trendInsights?: {
    sufficientData: boolean;
    insights: CivicTrendInsight[];
    mostCommonCategory: IssueCategory | null;
    note: string;
  };
  localities: string[];
  isDemoDataset: boolean;
}

class ApiClient {
  private token: string | null = null;

  public setToken(token: string | null) {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers || {});
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(path, { ...init, headers });
    const text = await response.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      json = { error: text || 'Unexpected server response' };
    }

    if (!response.ok) {
      const errMsg = typeof json.error === 'string' ? json.error : `Request failed (${response.status})`;
      const error = new Error(errMsg) as Error & { status?: number; details?: Record<string, unknown> };
      error.status = response.status;
      error.details = json;
      throw error;
    }

    return json as T;
  }

  getConfigStatus() {
    return this.request<ConfigStatus>('/api/config-status');
  }

  register(payload: { full_name: string; email: string; password: string; locality: string }) {
    return this.request<{ token: string; user: UserProfile; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  login(payload: { email: string; password: string }) {
    return this.request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  demoLogin(role: UserRole) {
    return this.request<{ token: string; user: UserProfile; isDemoSession: boolean }>(
      '/api/auth/demo-login',
      {
        method: 'POST',
        body: JSON.stringify({ role }),
      }
    );
  }

  forgotPassword(email: string) {
    return this.request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  getMe() {
    return this.request<{ user: UserProfile }>('/api/auth/me');
  }

  updateProfile(payload: { full_name: string; locality: string }) {
    return this.request<{ user: UserProfile }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  updatePreferences(payload: {
    preferred_language?: SupportedLanguage;
    notification_preferences?: Partial<NotificationPreferences>;
  }) {
    return this.request<{ user: UserProfile }>('/api/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  deleteAccount() {
    return this.request<{ ok: boolean; message: string }>('/api/auth/account', {
      method: 'DELETE',
    });
  }

  uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.request<{ imageUrl: string; storage: string }>('/api/uploads', {
      method: 'POST',
      body: formData,
    });
  }

  analyzeImage(fileOrSamplePath: File | string) {
    if (typeof fileOrSamplePath === 'string') {
      return this.request<{ analysis: AIAnalysisResult }>('/api/ai/analyze-image', {
        method: 'POST',
        body: JSON.stringify({ sampleImagePath: fileOrSamplePath }),
      });
    }
    const formData = new FormData();
    formData.append('image', fileOrSamplePath);
    return this.request<{ analysis: AIAnalysisResult }>('/api/ai/analyze-image', {
      method: 'POST',
      body: formData,
    });
  }

  assistComplaint(payload: {
    title: string;
    description: string;
    category: string;
    locality: string;
    language: SupportedLanguage;
  }) {
    return this.request<{ suggestion: ComplaintAssistantSuggestion }>('/api/ai/assist-complaint', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  reverseGeocode(lat: number, lng: number) {
    return this.request<{ locality: string; display_name: string }>(
      `/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    );
  }

  searchLocation(q: string) {
    return this.request<{ results: Array<{ lat: number; lng: number; display_name: string }> }>(
      `/api/geocode/search?q=${encodeURIComponent(q)}`
    );
  }

  getReports(params: Record<string, string | number | undefined> = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<{
      reports: CivicReport[];
      distances?: Record<string, number>;
      total: number;
      page: number;
      limit: number;
      isDemoDataset: boolean;
    }>(`/api/reports${suffix}`);
  }

  getReportById(id: string) {
    return this.request<{ report: CivicReport }>(`/api/reports/${encodeURIComponent(id)}`);
  }

  checkDuplicates(payload: {
    latitude: number;
    longitude: number;
    category: string;
    title: string;
    description: string;
  }) {
    return this.request<{ duplicates: DuplicateMatch[]; radiusMeters: number }>(
      '/api/reports/check-duplicates',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  createReport(payload: Record<string, unknown>) {
    return this.request<{ report: CivicReport }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  supportDuplicate(reportId: string, payload: { distance_meters: number; similarity_score: number }) {
    return this.request<{ report: CivicReport; message: string }>(
      `/api/reports/${encodeURIComponent(reportId)}/support-duplicate`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  toggleVote(reportId: string) {
    return this.request<{ report: CivicReport; voted: boolean }>(
      `/api/reports/${encodeURIComponent(reportId)}/vote`,
      { method: 'POST' }
    );
  }

  toggleFollow(reportId: string) {
    return this.request<{ following: boolean; followerCount: number }>(
      `/api/reports/${encodeURIComponent(reportId)}/follow`,
      { method: 'POST' }
    );
  }

  addComment(reportId: string, content: string) {
    return this.request<{ report: CivicReport }>(
      `/api/reports/${encodeURIComponent(reportId)}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );
  }

  flagComment(reportId: string, commentId: string, reason: string) {
    return this.request<{ message: string }>(
      `/api/reports/${encodeURIComponent(reportId)}/comments/${encodeURIComponent(commentId)}/flag`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  }

  verifyResolution(reportId: string, payload: { confirmed: boolean; comment?: string }) {
    return this.request<{ report: CivicReport }>(
      `/api/reports/${encodeURIComponent(reportId)}/verify`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  updateOfficerStatus(
    reportId: string,
    payload: { status: ReportStatus; note: string; resolution_image_url?: string }
  ) {
    return this.request<{ report: CivicReport }>(
      `/api/officer/reports/${encodeURIComponent(reportId)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  }

  getNotifications() {
    return this.request<{ notifications: CivicNotification[]; unreadCount: number }>(
      '/api/notifications'
    );
  }

  markAllNotificationsRead() {
    return this.request<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' });
  }

  markNotificationRead(id: string) {
    return this.request<{ notification: CivicNotification }>(
      `/api/notifications/${encodeURIComponent(id)}/read`,
      { method: 'PATCH' }
    );
  }

  getAnalytics(params: Record<string, string | undefined> = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'all') qs.set(k, v);
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<AnalyticsResponse>(`/api/analytics${suffix}`);
  }

  getLeaderboard() {
    return this.request<{ leaderboard: UserProfile[]; transactions: PointsTransaction[] }>(
      '/api/leaderboard'
    );
  }

  getProjects() {
    return this.request<{
      projects: InfrastructureProject[];
      externalApiConnected: boolean;
      note: string;
    }>('/api/projects');
  }

  getAdminOverview() {
    return this.request<{
      users: Array<UserProfile & { is_active: boolean }>;
      flaggedComments: Array<{
        id: string;
        report_id: string;
        report_title: string;
        author_name: string;
        content: string;
        flag_reason?: string;
        created_at: string;
      }>;
      auditLogs: AdminAuditLog[];
      settings: PlatformSettings;
      aiStats: { total_requests: number; successful_classifications: number; manual_fallbacks: number };
      duplicateLinksCount: number;
      duplicateLinks?: DuplicateLinkView[];
    }>('/api/admin/overview');
  }

  reviewDuplicate(linkId: string, review_status: 'confirmed' | 'dismissed') {
    return this.request<{ link: DuplicateLinkView }>(
      `/api/admin/duplicates/${encodeURIComponent(linkId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ review_status }),
      }
    );
  }

  updateUserRole(userId: string, payload: { role?: UserRole; department?: string; is_active?: boolean }) {
    return this.request<{ user: UserProfile }>(
      `/api/admin/users/${encodeURIComponent(userId)}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  }

  assignOfficer(reportId: string, officerId: string) {
    return this.request<{ report: CivicReport }>(
      `/api/admin/reports/${encodeURIComponent(reportId)}/assign`,
      {
        method: 'PATCH',
        body: JSON.stringify({ officer_id: officerId }),
      }
    );
  }

  moderateComment(reportId: string, commentId: string, action: 'hide' | 'dismiss') {
    return this.request<{ ok: boolean }>(
      `/api/admin/comments/${encodeURIComponent(reportId)}/${encodeURIComponent(commentId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }
    );
  }

  createProject(payload: Record<string, string>) {
    return this.request<{ project: InfrastructureProject }>('/api/admin/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateSettings(payload: Partial<PlatformSettings>) {
    return this.request<{ settings: PlatformSettings }>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();
