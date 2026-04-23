import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import Home from "./pages/Home";
import NewMatch from "./pages/NewMatch";
import History from "./pages/History";
import Account from "./pages/Account";
import Auth from "./pages/Auth";
import ScoringPage from "./pages/ScoringPage";
import ScorecardPage from "./pages/ScorecardPage";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();
const App = () => (<QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />}/>
              <Route path="/new" element={<NewMatch />}/>
              <Route path="/history" element={<History />}/>
              <Route path="/account" element={<Account />}/>
              <Route path="/auth" element={<Auth />}/>
              <Route path="/match/:id" element={<ScoringPage />}/>
              <Route path="/scorecard/:id" element={<ScorecardPage />}/>
              <Route path="/tournaments" element={<Tournaments />}/>
              <Route path="/tournament/:id" element={<TournamentDetail />}/>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />}/>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>);
export default App;
