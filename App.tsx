
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, DataPersistence } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  return (
    <DataProvider>
      <AuthProvider>
        <ThemeProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/dashboard" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </HashRouter>
        </ThemeProvider>
        <DataPersistence />
      </AuthProvider>
    </DataProvider>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};


export default App;