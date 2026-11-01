import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageSpinner } from "./PageSpinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const onOnboardingPage = location.pathname === "/app/onboarding";
  if (!user.onboardingCompletedAt && !onOnboardingPage) {
    return <Navigate to="/app/onboarding" replace />;
  }
  if (user.onboardingCompletedAt && onOnboardingPage) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
