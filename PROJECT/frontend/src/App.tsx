import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/component/ui/sonner";
import { Toaster } from "@/component/ui/toaster";
import { TooltipProvider } from "@/component/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/component/ErrorBoundary";
import { DashboardLayout } from "@/component/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Skills from "./pages/Skills";
import UsersPage from "./pages/UsersPage";
import JobRoles from "./pages/JobRoles";
import Roadmaps from "./pages/Roadmaps";
import RoadmapDetail from "./pages/RoadmapDetail";
import Subscriptions from "./pages/Subscriptions";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import AIChat from "./pages/AIChat";
import AIRoadmapGenerator from "./pages/AIRoadmapGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Routes>
          <Route path="/"                    element={<Dashboard />} />
          <Route path="/courses"             element={<Courses />} />
          <Route path="/courses/:id"         element={<CourseDetail />} />
          <Route path="/skills"              element={<Skills />} />
          <Route path="/users"               element={<UsersPage />} />
          <Route path="/job-roles"           element={<JobRoles />} />
          <Route path="/roadmaps"            element={<Roadmaps />} />
          <Route path="/roadmaps/:id"        element={<RoadmapDetail />} />
          <Route path="/subscriptions"       element={<Subscriptions />} />
          <Route path="/ai-chat"             element={<AIChat />} />
          <Route path="/ai-roadmap"          element={<AIRoadmapGenerator />} />
          <Route path="/settings"            element={<SettingsPage />} />
          <Route path="*"                    element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </DashboardLayout>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/*"     element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
