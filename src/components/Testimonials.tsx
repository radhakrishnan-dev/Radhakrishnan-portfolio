import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultTestimonials = [
  {
    name: "Pradeep",
    role: "Owner & Founder, FixMyAc",
    project: "AC Service Booking Website",
    content:
      "Radhakrishnan built exactly what my AC repair business needed. The online booking system works flawlessly and has helped streamline our customer appointments.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "Boutique Owner",
    project: "E-commerce Website",
    content:
      "Radhakrishnan delivered exactly what I needed for my online store. The website is beautiful, easy to manage, and my sales have increased since launch!",
    rating: 5,
  },
  {
    name: "Vikram Patel",
    role: "Fitness Trainer",
    project: "Portfolio Website",
    content:
      "Super professional and easy to work with. My portfolio looks amazing and I've gotten new clients through the website. Highly recommended!",
    rating: 5,
  },
  {
    name: "Anita Desai",
    role: "Interior Designer",
    project: "Business Website",
    content:
      "Great communication throughout the project. The website captures my brand perfectly and the admin panel makes it easy to update my work.",
    rating: 5,
  },
];

type TItem = {
  name: string;
  role: string;
  project: string;
  content: string;
  rating: number;
};

const TestimonialCard = ({ t, index }: { t: TItem; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative flex flex-col text-left rounded-xl p-5 lg:p-6",
        "bg-[hsl(var(--card))] border border-border/60",
        "transition-all duration-300",
        "hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.35)]"
      )}
    >
      {/* Teal top border accent */}
      <span
        aria-hidden
        className="absolute top-0 left-4 right-4 h-[3px] rounded-b-full bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-70 group-hover:opacity-100 transition-opacity"
      />

      {/* Header: quote + stars */}
      <div className="flex items-center justify-between mb-3">
        <Quote className="w-4 h-4 text-primary" />
        <div className="flex gap-0.5">
          {[...Array(t.rating || 5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
          ))}
        </div>
      </div>

      {/* Content */}
      <p className="text-[14.5px] leading-relaxed text-foreground/85 line-clamp-4 mb-5">
        {t.content}
      </p>

      {/* Footer: avatar + name + project badge */}
      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {t.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="font-heading font-semibold text-foreground text-sm truncate">
              {t.name}
            </h4>
            <p className="text-xs text-muted-foreground truncate">{t.role}</p>
          </div>
        </div>

        {t.project && (
          <span className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {t.project.length > 18 ? t.project.slice(0, 16) + "…" : t.project}
          </span>
        )}
      </div>
    </motion.article>
  );
};

const Testimonials = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const { data: dbTestimonials } = useQuery({
    queryKey: ["public-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const testimonials: TItem[] =
    dbTestimonials && dbTestimonials.length > 0
      ? dbTestimonials.map((t) => ({
          name: t.client_name,
          role: t.company ? `${t.client_role}, ${t.company}` : t.client_role,
          project: t.company || "",
          content: t.content,
          rating: t.rating,
        }))
      : defaultTestimonials;

  const count = testimonials.length;
  const useMarquee = count > 6;

  // Grid columns: 1 -> centered single, 2 -> 2-col centered, >=3 -> 3-col
  const gridCls =
    count === 1
      ? "grid-cols-1 max-w-md mx-auto"
      : count === 2
      ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="py-20 lg:py-28 bg-secondary/30" ref={ref}>
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <span className="text-primary font-medium text-sm tracking-wider uppercase mb-4 block">
            Testimonials
          </span>
          <h2 className="section-title">
            What Clients <span className="gradient-text">Say</span>
          </h2>
          <p className="section-subtitle mx-auto">
            Feedback from people I've had the pleasure of working with
          </p>
        </motion.div>

        {useMarquee ? (
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <motion.div
              className="flex gap-5 w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                duration: Math.max(20, count * 4),
                ease: "linear",
                repeat: Infinity,
              }}
            >
              {[...testimonials, ...testimonials].map((t, i) => (
                <div key={i} className="w-[320px] sm:w-[360px] shrink-0">
                  <TestimonialCard t={t} index={i % count} />
                </div>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className={cn("grid gap-5 lg:gap-6", gridCls)}>
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} t={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
