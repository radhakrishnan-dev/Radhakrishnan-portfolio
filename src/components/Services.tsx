import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Building2, ShoppingCart, RefreshCw, LayoutDashboard, Wrench,
  Image, Video, Youtube, Globe, Code, Palette, Smartphone, Mail,
  MessageSquare, Settings, Zap, Star, Heart, Briefcase, Loader2,
  ArrowRight, LucideIcon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

const Services = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0, margin: "0px 0px -10% 0px" });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["public-services"],
    queryFn: fetchActiveServices,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const getIcon = (name: string): LucideIcon => iconMap[name] || Wrench;

  if (isLoading) {
    return (
      <section id="services" className="py-14 lg:py-20">
        <div className="section-container">
          {/* Header skeleton */}
          <div className="text-center mb-10 flex flex-col items-center">
            <Skeleton className="h-6 w-24 rounded-full mb-3" />
            <Skeleton className="h-8 w-56 mb-3" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card p-4 text-center">
                <Skeleton className="w-11 h-11 rounded-lg mx-auto mb-2.5" />
                <Skeleton className="h-3 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-2.5 w-full mb-1" />
                <Skeleton className="h-2.5 w-5/6 mx-auto mb-1" />
                <Skeleton className="h-2.5 w-2/3 mx-auto" />
              </div>
            ))}
          </div>

          {/* Chip strip skeleton */}
          <div className="mt-8 sm:mt-10">
            <div className="flex items-center justify-between mb-3 px-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-7 rounded-full"
                  style={{ width: `${70 + ((i * 17) % 60)}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="services" className="py-14 lg:py-20" ref={ref}>
      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-block text-primary font-medium text-xs tracking-wider uppercase mb-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20"
          >
            What I Do
          </motion.span>
          <h2 className="section-title text-2xl sm:text-3xl !mb-3">
            My <span className="gradient-text">Services</span>
          </h2>
          <p className="section-subtitle mx-auto text-sm sm:text-base max-w-lg">
            Comprehensive web solutions tailored to help your business thrive
          </p>
        </motion.div>

        {services.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10 text-muted-foreground"
          >
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No services available at the moment.</p>
          </motion.div>
        ) : (
          <>
            {/* Featured cards (first 8) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {services.slice(0, 8).map((service, index) => {
                const IconComponent = getIcon(service.icon);
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
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

            {/* Compact title-only chips for ALL services */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-8 sm:mt-10"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                  All Services
                </h4>
                <Link
                  to="/services"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  View all
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {services.map((service, index) => {
                  const IconComponent = getIcon(service.icon);
                  return (
                    <motion.div
                      key={`chip-${service.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, delay: 0.25 + index * 0.02 }}
                    >
                      <Link
                        to="/services"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border text-[11px] sm:text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
                      >
                        <IconComponent className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-none">{service.title}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
};

export default Services;
