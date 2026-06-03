import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  MessageSquare,
  LogOut,
  Home,
  Loader2,
  Shield,
  Briefcase,
  History,
  Mail,
  User,
  Image,
  Palette,
  Menu,
  X,
  Users,
  ListChecks,
  DollarSign,
  FileSignature,
  Clock,
  KanbanSquare,
  StickyNote,
  MessageCircle,
} from "lucide-react";
import AdminChat from "@/components/admin/AdminChat";

const Admin = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name?: string | null; avatar_url?: string | null } | null>(null);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    const checkAdmin = async () => {
      if (loading) return;
      if (!user) {
        navigate("/admin/login", { replace: true });
        return;
      }
      try {
        const { data: adminStatus, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (cancelled) return;
        if (error || !adminStatus) {
          setHasAdminAccess(false);
          navigate("/admin/login", { replace: true });
          return;
        }
        setHasAdminAccess(true);
        // Try fetching profile (best-effort)
        const { data: p } = await (supabase as any)
          .from("profiles")
          .select("full_name, avatar_url")
          .maybeSingle();
        if (!cancelled && p) setProfile(p);
      } catch (err) {
        if (!cancelled) {
          setHasAdminAccess(false);
          navigate("/admin/login", { replace: true });
        }
      } finally {
        if (!cancelled) setCheckingAdmin(false);
      }
    };
    checkAdmin();
    return () => { cancelled = true; };
  }, [user, loading, navigate]);

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !hasAdminAccess) return null;

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { path: "/admin/messages", icon: Mail, label: "Messages" },
    { path: "/admin/clients", icon: Users, label: "Client Hub" },
    { path: "/admin/tracker", icon: ListChecks, label: "Project Tracker" },
    { path: "/admin/income", icon: DollarSign, label: "Income" },
    { path: "/admin/proposals", icon: FileSignature, label: "Proposals" },
    { path: "/admin/time", icon: Clock, label: "Time Tracker" },
    { path: "/admin/tasks", icon: KanbanSquare, label: "Tasks" },
    { path: "/admin/notes", icon: StickyNote, label: "Quick Notes" },
    { path: "/admin/broadcast", icon: MessageCircle, label: "WA Broadcast" },
    { path: "/admin/projects", icon: FolderKanban, label: "Projects" },
    { path: "/admin/skills", icon: Sparkles, label: "Skills" },
    { path: "/admin/services", icon: Briefcase, label: "Services" },
    { path: "/admin/testimonials", icon: MessageSquare, label: "Testimonials" },
    { path: "/admin/designs", icon: Palette, label: "Designs" },
    { path: "/admin/profile", icon: User, label: "Profile" },
    { path: "/admin/media", icon: Image, label: "Media" },
    { path: "/admin/roles", icon: Shield, label: "Roles" },
    { path: "/admin/activity", icon: History, label: "Activity Logs" },
  ];

  const isActiveRoute = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Admin";
  const initials = (profile?.full_name || user.email || "A")
    .split(/[\s@.]+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarContent = (
    <>
      {/* Header: brand */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-sm tracking-tight text-foreground">Admin Panel</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Control Center</p>
          </div>
        </div>
        <button
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User card */}
      <div className="mx-4 mb-4 p-3 rounded-xl bg-secondary/40 border border-border/60 flex items-center gap-3">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={displayName} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/30" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-primary/30 flex items-center justify-center text-xs font-bold text-primary">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-semibold border-primary/40 text-primary bg-primary/10">
              ADMIN
            </Badge>
            <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActiveRoute(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-primary/10 text-foreground font-medium shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2),0_0_20px_-8px_hsl(var(--primary)/0.5)]"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2.5px] rounded-r bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              )}
              <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : ""}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border/60 space-y-1.5">
        <Link to="/">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9 text-xs">
            <Home className="w-4 h-4" />
            View Website
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur border-b border-border flex items-center justify-between px-4 h-14">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-foreground hover:bg-secondary">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-heading font-bold text-lg gradient-text">Admin</h1>
        <div className="w-9" />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-card/60 backdrop-blur-xl border-r border-border/60 flex-col flex-shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col md:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 relative overflow-auto">
        {/* Subtle dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.25] [background-image:radial-gradient(hsl(var(--muted-foreground)/0.18)_1px,transparent_1px)] [background-size:22px_22px]"
          aria-hidden
        />
        <div className="relative p-4 pt-18 md:p-8 md:pt-8">
          <Outlet />
        </div>
      </main>

      <AdminChat />
    </div>
  );
};

export default Admin;
