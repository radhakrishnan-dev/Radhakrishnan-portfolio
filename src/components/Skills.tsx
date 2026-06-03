import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Code2, Palette, Wrench, Sparkles } from "lucide-react";

const getCategoryForSkill = (skillName: string): string => {
  const name = skillName.toLowerCase();
  if (
    name.includes("html") || name.includes("javascript") || name.includes("css") ||
    name.includes("react") || name.includes("php") || name.includes("mysql") ||
    name.includes("database") || name.includes("responsive") || name.includes("admin") ||
    name.includes("optimization")
  ) return "Development";
  if (
    name.includes("design") || name.includes("ui") || name.includes("ux") ||
    name.includes("photoshop") || name.includes("canva")
  ) return "Design";
  return "Tools";
};

const getLevelLabel = (level: number): string => {
  if (level >= 90) return "Expert";
  if (level >= 75) return "Advanced";
  if (level >= 50) return "Intermediate";
  return "Beginner";
};

const levelStyles: Record<string, string> = {
  Expert: "bg-primary/15 text-primary border-primary/30",
  Advanced: "bg-primary/10 text-primary border-primary/20",
  Intermediate: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  Beginner: "bg-muted-foreground/5 text-muted-foreground border-muted-foreground/15",
};

const categoryMeta: Record<string, { icon: typeof Code2; label: string }> = {
  Development: { icon: Code2, label: "Development" },
  Design: { icon: Palette, label: "Design" },
  Tools: { icon: Wrench, label: "Tools" },
  Other: { icon: Sparkles, label: "Other" },
};

const categoryOrder = ["Development", "Design", "Tools", "Other"];

const defaultSkills = [
  { name: "HTML5, CSS3 & JavaScript", level: 95 },
  { name: "UI/UX Design", level: 85 },
  { name: "PHP & MySQL", level: 80 },
  { name: "Responsive Design", level: 90 },
  { name: "Website Optimization", level: 85 },
  { name: "Admin Panels", level: 80 },
  { name: "Photoshop", level: 60 },
  { name: "Canva", level: 90 },
  { name: "Video Editing (CapCut)", level: 80 },
];

const Skills = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const { data: dbSkills } = useQuery({
    queryKey: ["public-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const skills = dbSkills && dbSkills.length > 0
    ? dbSkills.map((s) => ({
        name: s.name,
        level: s.percentage,
        category: s.category || getCategoryForSkill(s.name),
      }))
    : defaultSkills.map((s) => ({ ...s, category: getCategoryForSkill(s.name) }));

  const grouped = categoryOrder
    .map((cat) => ({ category: cat, items: skills.filter((s) => s.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <section id="skills" className="py-16 lg:py-24 bg-secondary/30" ref={ref}>
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-primary font-medium text-sm tracking-wider uppercase mb-3 block">
            My Skills
          </span>
          <h2 className="section-title">
            Technologies I <span className="gradient-text">Work With</span>
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-10">
          {grouped.map((group, groupIdx) => {
            const Icon = categoryMeta[group.category]?.icon || Sparkles;
            return (
              <motion.div
                key={group.category}
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: groupIdx * 0.12 }}
              >
                {/* Category header with divider */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-widest text-foreground">
                      {group.category}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {group.items.length}
                  </span>
                </div>

                {/* Skills grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((skill, idx) => {
                    const label = getLevelLabel(skill.level);
                    return (
                      <motion.div
                        key={skill.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.35, delay: groupIdx * 0.12 + idx * 0.04 }}
                        whileHover={{ y: -2 }}
                        className="group relative flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-card/60 border border-border/60 hover:border-primary/40 hover:bg-card transition-all duration-300 hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.35)]"
                      >
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-0 w-[2px] bg-primary rounded-r group-hover:h-2/3 transition-all duration-300" />
                        <span className="text-sm font-semibold text-foreground truncate">
                          {skill.name}
                        </span>
                        <span
                          className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${levelStyles[label]}`}
                        >
                          {label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Skills;
