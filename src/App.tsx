import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Design from "./pages/Design";
import Play from "./pages/Play";
import TelegramShell from "./pages/TelegramShell";
import NotFound from "./pages/NotFound";
import Vault from "./pages/Vault";
import BotFoundry from "./pages/BotFoundry";
import ApiKeyManager from "./pages/ApiKeyManager";
import GunitLayout from "./pages/gunit/GunitLayout";
import GunitDashboard from "./pages/gunit/GunitDashboard";
import GunitBotFactory from "./pages/gunit/GunitBotFactory";
import GunitChat from "./pages/gunit/GunitChat";
import GunitAgents from "./pages/gunit/GunitAgents";
import GunitUsers from "./pages/gunit/GunitUsers";
import GunitApiKeys from "./pages/gunit/GunitApiKeys";

const queryClient = new QueryClient();

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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/design"
                element={
                  <ProtectedRoute>
                    <Design />
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
                path="/keys"
                element={
                  <ProtectedRoute>
                    <ApiKeyManager />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
