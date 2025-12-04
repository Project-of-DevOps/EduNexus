import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, DataPersistence } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/Login';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import HelpCenter from './pages/HelpCenter';
import Activate from './pages/Activate';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ManagementDashboard from './pages/ManagementDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ParentDashboard from './pages/ParentDashboard';
import LibrarianDashboard from './pages/LibrarianDashboard';
import ManagementCode from './pages/ManagementCode';
import ManagementMailbox from './pages/ManagementMailbox';
import ManagementSignups from './pages/ManagementSignups';
import ConfirmCodePage from './pages/ConfirmCodePage';
import DevNotificationPopup from './components/DevNotificationPopup';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  return (
    <DataProvider>
      <AuthProvider>
        <ThemeProvider>
          <HashRouter>
            <DevNotificationPopup />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/login/teacher" element={<Navigate to="/login" replace />} />
              <Route path="/login/student" element={<Navigate to="/login" replace />} />
              <Route path="/login/parent" element={<Navigate to="/login" replace />} />
              <Route path="/login/management" element={<Navigate to="/login" replace />} />
              <Route path="/login/librarian" element={<Navigate to="/login" replace />} />
              <Route path="/activate" element={<Activate />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="/dashboard/management" element={
                <ProtectedRoute>
                  <ManagementDashboard />
                </ProtectedRoute>
              } />

              <Route path="/dashboard/teacher" element={
                <ProtectedRoute>
                  <TeacherDashboard />
                </ProtectedRoute>
              } />

              <Route path="/dashboard/student" element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              } />

              <Route path="/dashboard/parent" element={
                <ProtectedRoute>
                  <ParentDashboard />
                </ProtectedRoute>
              } />

              <Route path="/dashboard/librarian" element={
                <ProtectedRoute>
                  <LibrarianDashboard />
                </ProtectedRoute>
              } />

              <Route path="/dashboard/management/code" element={
                <ProtectedRoute>
                  <ManagementCode />
                </ProtectedRoute>
              } />

              <Route path="/dashboard/management/signups" element={
                <ProtectedRoute>
                  <ManagementSignups />
                </ProtectedRoute>
              } />

              <Route path="/dashboard/management/mail" element={
                <ProtectedRoute>
                  <ManagementMailbox />
                </ProtectedRoute>
              } />

              {/* public confirmation link (developer) */}
              <Route path="/confirm-code/:token" element={<ConfirmCodePage />} />

              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </HashRouter>
        </ThemeProvider>
        <DataPersistence />
      </AuthProvider>
    </DataProvider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

export default App;