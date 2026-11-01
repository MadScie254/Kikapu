import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { PageSpinner } from "@/components/layout/PageSpinner";

const Home = lazy(() => import("@/pages/marketing/Home"));
const Features = lazy(() => import("@/pages/marketing/Features"));
const HowItWorks = lazy(() => import("@/pages/marketing/HowItWorks"));
const About = lazy(() => import("@/pages/marketing/About"));
const Privacy = lazy(() => import("@/pages/marketing/Privacy"));
const Demo = lazy(() => import("@/pages/marketing/Demo"));
const Login = lazy(() => import("@/pages/marketing/Login"));
const Register = lazy(() => import("@/pages/marketing/Register"));
const NotFound = lazy(() => import("@/pages/marketing/NotFound"));

const Onboarding = lazy(() => import("@/pages/app/Onboarding"));
const Dashboard = lazy(() => import("@/pages/app/Dashboard"));
const Scan = lazy(() => import("@/pages/app/Scan"));
const Receipts = lazy(() => import("@/pages/app/Receipts"));
const ReceiptDetail = lazy(() => import("@/pages/app/ReceiptDetail"));
const Analytics = lazy(() => import("@/pages/app/Analytics"));
const Budgets = lazy(() => import("@/pages/app/Budgets"));
const ShoppingLists = lazy(() => import("@/pages/app/ShoppingLists"));
const ShoppingListDetail = lazy(() => import("@/pages/app/ShoppingListDetail"));
const Stores = lazy(() => import("@/pages/app/Stores"));
const Settings = lazy(() => import("@/pages/app/Settings"));
const Admin = lazy(() => import("@/pages/app/Admin"));

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public marketing site */}
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Onboarding (authenticated, but outside the main app shell) */}
        <Route
          path="/app/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Authenticated application */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="scan" element={<Scan />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="receipts/:id" element={<ReceiptDetail />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="shopping-lists" element={<ShoppingLists />} />
          <Route path="shopping-lists/:id" element={<ShoppingListDetail />} />
          <Route path="stores" element={<Stores />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
