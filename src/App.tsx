import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Designs from "./pages/Designs";
import ServicesPage from "./pages/Services";

import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminRequestPending from "./pages/AdminRequestPending";
import Admin from "./pages/Admin";
import Dashboard from "./pages/admin/Dashboard";
import ProjectsManager from "./pages/admin/ProjectsManager";
import SkillsManager from "./pages/admin/SkillsManager";
import ServicesManager from "./pages/admin/ServicesManager";
import TestimonialsManager from "./pages/admin/TestimonialsManager";
import RolesManager from "./pages/admin/RolesManager";
import ActivityLogs from "./pages/admin/ActivityLogs";
import MessagesInbox from "./pages/admin/MessagesInbox";
import ProfileEditor from "./pages/admin/ProfileEditor";
import MediaManager from "./pages/admin/MediaManager";
import DesignsManager from "./pages/admin/DesignsManager";
import ClientsManager from "./pages/admin/ClientsManager";
import ClientHub from "./pages/admin/ClientHub";

import ClientProjectsManager from "./pages/admin/ClientProjectsManager";
import IncomeManager from "./pages/admin/IncomeManager";
import ProposalsManager from "./pages/admin/ProposalsManager";
import TimeTracker from "./pages/admin/TimeTracker";
import TasksBoard from "./pages/admin/TasksBoard";
import QuickNotes from "./pages/admin/QuickNotes";
import WhatsAppBroadcast from "./pages/admin/WhatsAppBroadcast";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/designs" element={<Designs />} />
            <Route path="/services" element={<ServicesPage />} />
            
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/pending" element={<AdminRequestPending />} />
            <Route path="/admin" element={<Admin />}>
            <Route index element={<Dashboard />} />
              <Route path="messages" element={<MessagesInbox />} />
              <Route path="projects" element={<ProjectsManager />} />
              <Route path="skills" element={<SkillsManager />} />
              <Route path="services" element={<ServicesManager />} />
              <Route path="testimonials" element={<TestimonialsManager />} />
              <Route path="designs" element={<DesignsManager />} />
              <Route path="profile" element={<ProfileEditor />} />
              <Route path="media" element={<MediaManager />} />
              <Route path="roles" element={<RolesManager />} />
              <Route path="clients" element={<ClientsManager />} />
              <Route path="clients/:id" element={<ClientHub />} />

              <Route path="tracker" element={<ClientProjectsManager />} />
              <Route path="income" element={<IncomeManager />} />
              <Route path="proposals" element={<ProposalsManager />} />
              <Route path="time" element={<TimeTracker />} />
              <Route path="tasks" element={<TasksBoard />} />
              <Route path="notes" element={<QuickNotes />} />
              <Route path="broadcast" element={<WhatsAppBroadcast />} />
              <Route path="activity" element={<ActivityLogs />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
