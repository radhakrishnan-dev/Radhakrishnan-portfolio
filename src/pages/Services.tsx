import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Building2, ShoppingCart, RefreshCw, LayoutDashboard, Wrench,
  Image, Video, Youtube, Globe, Code, Palette, Smartphone, Mail,
  MessageSquare, Settings, Zap, Star, Heart, Briefcase, Loader2,
  ArrowLeft, LucideIcon
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Service {
  id: string;
  title: string;
  description: string;
  highlight: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  User, Building2, ShoppingCart, RefreshCw, LayoutDashboard, Wrench,
  Image, Video, Youtube, Globe, Code, Palette, Smartphone, Mail,
  MessageSquare, Settings, Zap, Star, Heart, Briefcase,
};

const fetchActiveServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return (data as Service[]) || [];
};

const ServicesPage = () => {
  useEffect(() => {
    document.title = "Services — Portfolio";
  }, []);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["public-services"],
    queryFn: fetchActiveServices,
    staleTime: 5 * 60 * 1000, // 5 minutes — avoid refetching on quick navigations
    gcTime: 30 * 60 * 1000, // keep cache 30 min
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const getIcon = (name: string): LucideIcon => iconMap[name] || Wrench;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-16 lg:pt-32 lg:pb-20">
        <div className="section-container">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-muted/40"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="inline-block text-primary font-medium text-xs tracking-wider uppercase mb-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              What I Do
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
              My <span className="gradient-text">Services</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Comprehensive web solutions tailored to help your business thrive
            </p>
          </motion.div>

          {/* Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No services available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {services.map((service, index) => {
                const IconComponent = getIcon(service.icon);
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: (index % 8) * 0.05 }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="glass-card p-4 text-center group"
                  >
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2.5 transition-transform duration-300 group-hover:scale-110">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-xs sm:text-sm text-foreground mb-1 leading-tight">
                      {service.title}
                    </h3>
                    <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
                      {service.description}
                    </p>
                    {service.highlight && (
                      <span className="inline-block text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium mt-2">
                        {service.highlight}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center mt-12"
          >
            <a
              href="/#contact"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Start a Project
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ServicesPage;
