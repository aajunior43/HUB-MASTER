import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "next-themes";
import EgyptFooter from "@/components/EgyptFooter";
import "./App.css";


const Hub = lazy(() => import("./pages/Hub"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Vault = lazy(() => import("./pages/Vault"));
const Passwords = lazy(() => import("./pages/Passwords"));
const Chat = lazy(() => import("./pages/Chat"));

const Reminders = lazy(() => import("./pages/Reminders"));
const Prompts = lazy(() => import("./pages/Prompts"));
const Notes = lazy(() => import("./pages/Notes"));
const Admin = lazy(() => import("./pages/Admin"));
const Extension = lazy(() => import("./pages/Extension"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeProvider
          attribute="class"
          defaultTheme="neomorphism"
          storageKey="jr-links-visual-theme"
          themes={["neomorphism", "brutalism", "dark-ui", "claymorphism", "immersive-3d", "retro", "y2k"]}
          enableSystem={false}
        >

          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={
                <div className="h-screen flex items-center justify-center bg-background">
                  <div className="w-8 h-8 bg-accent border-2 border-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] rounded-md flex items-center justify-center text-base animate-pulse">
                    📎
                  </div>
                </div>
              }>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Hub />
                    </ProtectedRoute>
                  } />
                  <Route path="/links" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/vault" element={
                    <ProtectedRoute>
                      <Vault />
                    </ProtectedRoute>
                  } />
                  <Route path="/passwords" element={
                    <ProtectedRoute>
                      <Passwords />
                    </ProtectedRoute>
                  } />
                  <Route path="/chat" element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } />
                  <Route path="/research" element={<Navigate to="/chat" replace />} />
                  <Route path="/reminders" element={
                    <ProtectedRoute>
                      <Reminders />
                    </ProtectedRoute>
                  } />
                  <Route path="/prompts" element={
                    <ProtectedRoute>
                      <Prompts />
                    </ProtectedRoute>
                  } />
                  <Route path="/notes" element={
                    <ProtectedRoute>
                      <Notes />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  } />
                  <Route path="/extensao" element={<Extension />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                <EgyptFooter />

              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
