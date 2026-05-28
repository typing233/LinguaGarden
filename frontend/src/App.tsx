import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/common/Layout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import VocabularyPage from '@/pages/VocabularyPage';
import ExercisePage from '@/pages/ExercisePage';
import ExerciseSessionPage from '@/pages/ExerciseSessionPage';
import VisionGardenPage from '@/pages/VisionGardenPage';
import ProgressPage from '@/pages/ProgressPage';
import ProfilePage from '@/pages/ProfilePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/vocabulary" element={<VocabularyPage />} />
                  <Route path="/exercises" element={<ExercisePage />} />
                  <Route path="/exercises/:id" element={<ExerciseSessionPage />} />
                  <Route path="/garden" element={<VisionGardenPage />} />
                  <Route path="/progress" element={<ProgressPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
