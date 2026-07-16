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

import NotFound from "./pages/NotFound";
import { WidgetDockProvider, WidgetDockBar } from "./components/widgets/WidgetDock";

// Heavy sections are lazy-loaded so the initial bundle stays small enough to
// precache and boots fast; each route downloads on first visit.
const Play = lazy(() => import("./pages/Play"));
const TelegramShell = lazy(() => import("./pages/TelegramShell"));
const Vault = lazy(() => import("./pages/Vault"));
const BotFoundry = lazy(() => import("./pages/BotFoundry"));
const BotSwarm = lazy(() => import("./pages/BotSwarm"));
const ApiKeyManager = lazy(() => import("./pages/ApiKeyManager"));
const GunitLayout = lazy(() => import("./pages/gunit/GunitLayout"));
const GunitDashboard = lazy(() => import("./pages/gunit/GunitDashboard"));
const GunitBotFactory = lazy(() => import("./pages/gunit/GunitBotFactory"));
const GunitChat = lazy(() => import("./pages/gunit/GunitChat"));
const GunitAgents = lazy(() => import("./pages/gunit/GunitAgents"));
const GunitUsers = lazy(() => import("./pages/gunit/GunitUsers"));
const GunitApiKeys = lazy(() => import("./pages/gunit/GunitApiKeys"));
const SphereCommand = lazy(() => import("./pages/SphereCommand"));
const JackieControl = lazy(() => import("./pages/JackieControl"));
const VeilOps = lazy(() => import("./pages/VeilOps"));
const MarvelsRace = lazy(() => import("./pages/MarvelsRace"));
const SentinelDashboard = lazy(() => import("./pages/SentinelDashboard"));
const SentinelBoard = lazy(() => import("./pages/SentinelBoard"));
const ApexHub = lazy(() => import("./pages/ApexHub"));
const AIProviders = lazy(() => import("./pages/AIProviders"));
const PodStation = lazy(() => import("./pages/PodStation"));
const PCDesktop = lazy(() => import("./pages/PCDesktop"));
const EruRouter = lazy(() => import("./eru/EruRouter"));
const FloatingEditorNav = lazy(() => import("./eru/FloatingEditorNav"));
const VisualizerLab = lazy(() => import("./eru/VisualizerLab"));

const RouteLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <span className="font-mono text-4xl font-bold text-primary animate-pulse">J</span>
  </div>
);

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
            <WidgetDockProvider>
              <Suspense fallback={<RouteLoader />}>
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
              <Route path="/marvels" element={<ProtectedRoute><MarvelsRace /></ProtectedRoute>} />
              <Route path="/sentinel" element={<ProtectedRoute><SentinelDashboard /></ProtectedRoute>} />
              <Route path="/sentinel/board" element={<ProtectedRoute><SentinelBoard /></ProtectedRoute>} />
              <Route path="/apex" element={<ProtectedRoute><ApexHub /></ProtectedRoute>} />
              <Route path="/providers" element={<ProtectedRoute><AIProviders /></ProtectedRoute>} />
              <Route path="/pods" element={<ProtectedRoute><PodStation /></ProtectedRoute>} />
              <Route path="/pc" element={<ProtectedRoute><PCDesktop /></ProtectedRoute>} />
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
              </Suspense>
            <Suspense fallback={null}><FloatingEditorNav /></Suspense>
            <WidgetDockBar />
            </WidgetDockProvider>
            </SandboxCatcher>
          </BrowserRouter>
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
