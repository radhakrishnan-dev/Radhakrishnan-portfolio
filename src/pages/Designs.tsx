import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Palette, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Design {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

const Designs = () => {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [lightbox, setLightbox] = useState<Design | null>(null);

  useEffect(() => {
    document.title = "Graphic Designs — Portfolio";
    const fetchDesigns = async () => {
      const { data, error } = await (supabase as any)
        .from("designs")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) console.error("Designs fetch error:", error);
      else setDesigns((data as Design[]) || []);
      setIsLoading(false);
    };
    fetchDesigns();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(designs.map((d) => d.category || "General"));
    return ["All", ...Array.from(set)];
  }, [designs]);

  const filtered = useMemo(
    () =>
      activeCategory === "All"
        ? designs
        : designs.filter((d) => (d.category || "General") === activeCategory),
    [designs, activeCategory]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-16 lg:pt-32 lg:pb-20">
        <div className="section-container">
          {/* Back link — left aligned */}
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
              Creative Showcase
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
              Graphic <span className="gradient-text">Designs</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              A curated collection of posters, social creatives, thumbnails, and brand visuals.
            </p>
          </motion.div>

          {/* Category Filter */}
          {!isLoading && designs.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-2 mb-10"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Palette className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No designs to display yet.</p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((design, index) => (
                  <motion.div
                    key={design.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.35, delay: (index % 8) * 0.04 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setLightbox(design)}
                    className="group relative cursor-pointer rounded-xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl transition-shadow duration-300"
                  >
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={design.image_url}
                        alt={design.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                      <span className="text-[10px] uppercase tracking-wider text-primary-foreground/80 mb-1">
                        {design.category}
                      </span>
                      <h3 className="text-white font-semibold text-sm leading-tight line-clamp-1">
                        {design.title}
                      </h3>
                      {design.description && (
                        <p className="text-white/80 text-xs line-clamp-2 mt-1">
                          {design.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-card border border-border text-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl w-full max-h-[90vh] flex flex-col gap-3"
            >
              <img
                src={lightbox.image_url}
                alt={lightbox.title}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
              <div className="text-center px-4">
                <span className="text-xs uppercase tracking-wider text-primary">
                  {lightbox.category}
                </span>
                <h3 className="font-heading text-xl font-semibold mt-1">{lightbox.title}</h3>
                {lightbox.description && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
                    {lightbox.description}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default Designs;
