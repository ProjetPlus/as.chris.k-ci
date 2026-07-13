import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Component, lazy, Suspense, type ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Login from "./pages/Login";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Lazy-loaded routes for 2G/slow networks (code-splitting per route).
// We keep references to the dynamic imports so we can prefetch the most-used
// routes after the first paint without blocking initial render.
const importDashboard = () => import("./pages/Dashboard");
const importMembers = () => import("./pages/Members");
const importMemberProfile = () => import("./pages/MemberProfile");
const importRegisterStep1 = () => import("./pages/RegisterStep1");
const importRegisterStep2 = () => import("./pages/RegisterStep2");
const importDeaths = () => import("./pages/Deaths");
const importContributions = () => import("./pages/Contributions");
const importTreasury = () => import("./pages/Treasury");
const importScanner = () => import("./pages/Scanner");
const importReports = () => import("./pages/Reports");
const importCards = () => import("./pages/Cards");
const importAccess = () => import("./pages/AccessManagement");
const importSettings = () => import("./pages/Settings");
const importSync = () => import("./pages/Sync");
const importNotFound = () => import("./pages/NotFound");

const Dashboard = lazy(importDashboard);
const Members = lazy(importMembers);
const MemberProfile = lazy(importMemberProfile);
const RegisterStep1 = lazy(importRegisterStep1);
const RegisterStep2 = lazy(importRegisterStep2);
const Deaths = lazy(importDeaths);
const Contributions = lazy(importContributions);
const Treasury = lazy(importTreasury);
const Scanner = lazy(importScanner);
const Reports = lazy(importReports);
const Cards = lazy(importCards);
const AccessManagement = lazy(importAccess);
const SettingsPage = lazy(importSettings);
const Sync = lazy(importSync);
const NotFound = lazy(importNotFound);

/**
 * Smart prefetch: after first paint, cache route chunks while online so the PWA
 * can reopen after an offline refresh. On 2G/save-data we only delay more.
 */
function schedulePrefetch() {
  if (typeof window === "undefined") return;
  const conn: any = (navigator as any).connection;
  if (!navigator.onLine) return;
  const slow = conn?.saveData || (conn?.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType));
  const idle = (cb: () => void) =>
    (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb, { timeout: slow ? 12000 : 3000 }) : setTimeout(cb, slow ? 8000 : 1500);
  idle(() => {
    importDashboard(); importMembers(); importScanner();
    idle(() => {
      importRegisterStep1(); importRegisterStep2(); importMemberProfile();
      importContributions(); importDeaths(); importTreasury();
      importReports(); importCards(); importSettings(); importSync(); importAccess(); importNotFound();
    });
  });
}
if (typeof window !== "undefined") schedulePrefetch();

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-background">
        <div className="max-w-sm space-y-3">
          <h1 className="text-xl font-display font-bold text-bordeaux-dark">Application hors ligne</h1>
          <p className="text-sm text-muted-foreground">Cette page n’est pas encore disponible dans le cache local. Revenez à l’accueil ou rouvrez l’application.</p>
          <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm" onClick={() => { location.href = "/dashboard"; }}>Revenir au tableau de bord</button>
        </div>
      </div>
    );
  }
}

const RouteFallback = () => (
  <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
    <div className="animate-pulse">Chargement…</div>
  </div>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ChunkErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/:id" element={<MemberProfile />} />
            <Route path="/register" element={<RegisterStep1 />} />
            <Route path="/register/step2" element={<RegisterStep2 />} />
            <Route path="/deaths" element={<Deaths />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/treasury" element={<Treasury />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/access" element={<AccessManagement />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/sync" element={<Sync />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
            <PWAInstallPrompt />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
