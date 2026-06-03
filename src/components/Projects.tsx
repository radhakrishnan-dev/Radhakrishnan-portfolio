import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Github, ShoppingBag, Briefcase, Wrench, Layout } from "lucide-react";

const defaultProjects = [
  {
    title: "Krishzz Craftz",
    description: "A beautiful e-commerce website for handmade gifts and crafts with product catalog and order management.",
    tech: ["HTML5", "CSS3", "JavaScript", "PHP", "MySQL"],
    image: "",
    liveUrl: "#",
    codeUrl: "#",
  },
  {
    title: "Business Portfolio",
    description: "Modern portfolio website for a consulting firm featuring services, team profiles, and contact forms.",
    tech: ["React", "Tailwind CSS", "Framer Motion"],
    image: "",
    liveUrl: "#",
    codeUrl: "#",
  },
  {
    title: "FixMyAc",
    description: "AC service and repair shop website with online slot booking system for AC maintenance and repair services.",
    tech: ["PHP", "MySQL", "Bootstrap", "JavaScript"],
    image: "",
    liveUrl: "#",
    codeUrl: "#",
  },
  {
    title: "Kalai Fashions",
    description: "E-commerce web application for selling traditional dresses like sarees and dhotis direct from manufacturer to customers.",
    tech: ["HTML5", "CSS3", "JavaScript", "PHP", "MySQL"],
    image: "",
    liveUrl: "#",
    codeUrl: "#",
  },
  {
    title: "Landing Pages",
    description: "High-converting landing page designs for various businesses including fitness, real estate, and tech startups.",
    tech: ["HTML5", "CSS3", "JavaScript", "GSAP"],
    image: "",
    liveUrl: "#",
    codeUrl: "#",
  },
];

const getIconForProject = (title: string) => {
  const name = title.toLowerCase();
  if (name.includes("craft") || name.includes("fashion") || name.includes("shop") || name.includes("commerce")) return ShoppingBag;
  if (name.includes("portfolio") || name.includes("business")) return Briefcase;
  if (name.includes("fix") || name.includes("service") || name.includes("repair")) return Wrench;
  return Layout;
};

const getInitials = (title: string) =>
  title
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Projects = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const { data: dbProjects } = useQuery({
    queryKey: ["public-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const projects = dbProjects && dbProjects.length > 0
    ? dbProjects.map((p) => ({
        title: p.title,
        description: p.description,
        tech: p.tech_stack as string[],
        image: p.image_url || "",
        liveUrl: p.live_url || "#",
        codeUrl: p.github_url || "#",
      }))
    : defaultProjects;

  return (
    <section id="projects" className="py-20 lg:py-28" ref={ref}>
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <span className="text-primary font-medium text-sm tracking-wider uppercase mb-4 block">
            My Portfolio
          </span>
          <h2 className="section-title">
            Featured <span className="gradient-text">Projects</span>
          </h2>
          <p className="section-subtitle mx-auto">
            A selection of projects that showcase my skills and dedication to quality
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {projects.map((project, index) => {
            const Icon = getIconForProject(project.title);
            const hasImage = project.image && project.image.startsWith("http");
            return (
              <motion.article
                key={project.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -6 }}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border border-border/60 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.45)]"
              >
                {/* Image / Preview */}
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-secondary/60 to-background">
                  {hasImage ? (
                    <img
                      src={project.image}
                      alt={project.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.25),transparent_55%),radial-gradient(circle_at_75%_80%,hsl(var(--primary)/0.18),transparent_50%)]" />
                      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:24px_24px]" />
                      <span className="relative font-heading text-5xl sm:text-6xl font-bold text-primary/70 tracking-tight">
                        {getInitials(project.title)}
                      </span>
                    </div>
                  )}
                  {/* Dark overlay + teal tint */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent mix-blend-overlay" />

                  {/* Floating chip */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/70 backdrop-blur-md border border-border/60">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
                      Project
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-5 sm:p-6">
                  <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {project.description}
                  </p>

                  {/* Tech pills */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {project.tech.slice(0, 5).map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary/90 border border-primary/15"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2">
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Live Demo
                    </a>
                    <a
                      href={project.codeUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-foreground/80 text-xs font-semibold hover:border-foreground/40 hover:text-foreground transition-colors"
                    >
                      <Github className="w-3.5 h-3.5" />
                      View Code
                    </a>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Projects;
