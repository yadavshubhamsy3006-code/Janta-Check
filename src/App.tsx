/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { ExploreIssuesPage } from './pages/ExploreIssuesPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CommunityPage } from './pages/CommunityPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { OfficerDashboardPage } from './pages/OfficerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ReportDetailPage } from './pages/ReportDetailPage';

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/explore" element={<ExploreIssuesPage />} />
            <Route path="/map" element={<LiveMapPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/report/:id" element={<ReportDetailPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <CitizenDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <ReportIssuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <ExploreIssuesPage mineOnly />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <CommunityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <OfficerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
