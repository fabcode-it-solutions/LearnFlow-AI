import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// ── Lazy-loaded Route Chunks (Code Splitting for Optimal Performance) ──────────
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SubjectsPage = lazy(() => import("./pages/SubjectsPage"));
const SubjectDetailPage = lazy(() => import("./pages/SubjectDetailPage"));
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotesPage = lazy(() => import("./pages/NotesPage"));

// Layout
import AppLayout from "./components/AppLayout";

// ── Fallback Spinner for Lazy Loading ──────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="w-8 h-8 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Protected route wrapper ────────────────────────────────────────────────────
function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-8 h-8 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Redirect to onboarding if not completed
  if (user && !user.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

// ── Auth-only route (no onboarding check, no layout) ──────────────────────────
function AuthOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-8 h-8 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// ── Public route wrapper (redirect to dashboard if already logged in) ─────────
function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Onboarding (auth required, but no layout yet) */}
            <Route element={<AuthOnlyRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            {/* Protected — inside AppLayout (nav rail) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/subjects/:id" element={<SubjectDetailPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/plan" element={<StudyPlanPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
