import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, DataPersistence } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/Login';
import TeacherLogin from './pages/TeacherLogin';
import StudentLogin from './pages/StudentLogin';
import ParentLogin from './pages/ParentLogin';
import ManagementLogin from './pages/ManagementLogin';
import Activate from './pages/Activate';
import ManagementDashboard from './pages/ManagementDashboard';
import ManagementCode from './pages/ManagementCode';
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
              <Route path="/login/teacher" element={<TeacherLogin />} />
              <Route path="/login/student" element={<StudentLogin />} />
              <Route path="/login/parent" element={<ParentLogin />} />
              <Route path="/login/management" element={<ManagementLogin />} />
              <Route path="/activate" element={<Activate />} />

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

              <Route path="/dashboard/management/code" element={
                <ProtectedRoute>
                  <ManagementCode />
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