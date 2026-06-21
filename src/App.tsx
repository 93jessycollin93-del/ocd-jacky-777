import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useSearchParams, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { I18nProvider } from "@/game/i18n";
import { useEffect, lazy, Suspense } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Sandbox from "./pages/Sandbox";
import { SandboxBanner } from "./components/SandboxBanner";

import Play from "./pages/Play";
import TelegramShell from "./pages/TelegramShell";
import NotFound from "./pages/NotFound";
import Vault from "./pages/Vault";
import BotFoundry from "./pages/BotFoundry";
import BotSwarm from "./pages/BotSwarm";
import ApiKeyManager from "./pages/ApiKeyManager";
import GunitLayout from "./pages/gunit/GunitLayout";
import GunitDashboard from "./pages/gunit/GunitDashboard";
import GunitBotFactory from "./pages/gunit/GunitBotFactory";
import GunitChat from "./pages/gunit/GunitChat";
import GunitAgents from "./pages/gunit/GunitAgents";
import GunitUsers from "./pages/gunit/GunitUsers";
import GunitApiKeys from "./pages/gunit/GunitApiKeys";
import SphereCommand from "./pages/SphereCommand";
import JackieControl from "./pages/JackieControl";
import VeilOps from "./pages/VeilOps";
const EruRouter = lazy(() => import("./eru/EruRouter"));
const FloatingEditorNav = lazy(() => import("./eru/FloatingEditorNav"));
const VisualizerLab = lazy(() => import("./eru/VisualizerLab"));

const queryClient = new QueryClient();

const SandboxCatcher = ({ children }: { children: React.ReactNode }) => {
  const [params] = useSearchParams();
  const location = useLocation();
  useEffect(() => {
    // Sandbox flag is only honoured on the dedicated /sandbox route — it never
    // grants access to other protected routes or AI edge functions.
    if (params.get("sandbox") === "true" && location.pathname.startsWith("/sandbox")) {
      sessionStorage.setItem("sandbox", "true");
    }
  }, [params, location.pathname]);
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="font-mono text-4xl font-bold text-primary animate-pulse">J</span>
      </div>
    );
  }

  if (!user) return <Auth />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <SandboxBanner />
            <SandboxCatcher>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/sandbox" element={<Sandbox />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/play"
                element={
                  <ProtectedRoute>
                    <Play />
                  </ProtectedRoute>
                }
              />
              <Route path="/hub" element={<TelegramShell />} />
              <Route
                path="/vault"
                element={
                  <ProtectedRoute>
                    <Vault />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bots"
                element={
                  <ProtectedRoute>
                    <BotFoundry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/swarm"
                element={
                  <ProtectedRoute>
                    <BotSwarm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/keys"
                element={
                  <ProtectedRoute>
                    <ApiKeyManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gunit"
                element={
                  <ProtectedRoute>
                    <GunitLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<GunitDashboard />} />
                <Route path="bots" element={<GunitBotFactory />} />
                <Route path="chat" element={<GunitChat />} />
                <Route path="agents" element={<GunitAgents />} />
                <Route path="users" element={<GunitUsers />} />
                <Route path="keys" element={<GunitApiKeys />} />
              </Route>
              <Route
                path="/sphere"
                element={
                  <ProtectedRoute>
                    <SphereCommand />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/control"
                element={
                  <ProtectedRoute>
                    <JackieControl />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/veilops"
                element={
                  <ProtectedRoute>
                    <VeilOps />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/eru/visualizers"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={null}><VisualizerLab /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/eru/*"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={null}><EruRouter /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Suspense fallback={null}><FloatingEditorNav /></Suspense>
            </SandboxCatcher>
          </BrowserRouter>
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
