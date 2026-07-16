import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Results } from './pages/Results';
import { DashboardHome } from './pages/DashboardHome';
import { Scholarships } from './pages/Scholarships';
import { Subjects } from './pages/Subjects';
import { Schools } from './pages/Schools';
import { Students } from './pages/Students';
import { SpecialReg } from './pages/SpecialReg';
import { AdmitCards } from './pages/AdmitCards';
import { MarksEntry } from './pages/MarksEntry';
import { Officials } from './pages/Officials';
import { Reports } from './pages/Reports';
import { CommitteeHonour } from './pages/CommitteeHonour';
import { Security } from './pages/Security';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold text-sm">
        Verifying Session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Screen */}
          <Route path="/" element={<Login />} />

          {/* Public Results Verification Portal */}
          <Route path="/results" element={<Results />} />

          {/* Public Committee Honour Portal */}
          <Route path="/committee" element={<CommitteeHonour />} />

          {/* Protected Dashboard Admin Pages */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardHome />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/scholarships"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Scholarships />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/subjects"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Subjects />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/schools"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Schools />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/students"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Students />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/special-reg"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SpecialReg />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admit-cards"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AdmitCards />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/marks-entry"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MarksEntry />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/officials"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Officials />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/security"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Security />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Global Catch-all fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
