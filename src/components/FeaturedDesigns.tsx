import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Palette, Loader2 } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface Design {
  id: string;
  title: string;
  category: string;
  image_url: string;
}

const FeaturedDesigns = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const [designs, setDesigns] = useState<Design[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const autoplayRef = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("designs")
          .select("id, title, category, image_url")
          .eq("is_active", true)
          .order("display_order")
          .limit(12);
        if (error) console.error("Featured designs error:", error);
        else setDesigns((data as Design[]) || []);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDesigns();
  }, []);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => api?.scrollTo(index),
    [api]
  );

  if (!isLoading && designs.length === 0) return null;

  const useCarousel = designs.length > 4;

  const renderCard = (design: Design) => (
    <Link
      to="/designs"
      className="group block relative rounded-xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl transition-shadow duration-300"
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
        <span className="text-[10px] uppercase tracking-wider text-primary-foreground/80 mb-1 flex items-center gap-1">
          <Palette className="w-3 h-3" />
          {design.category}
        </span>
        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-1">
          {design.title}
        </h3>
      </div>
    </Link>
  );

  return (
    <section id="featured-designs" className="py-14 lg:py-20" ref={ref}>
      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8"
        >
          <div>
            <span className="inline-block text-primary font-medium text-xs tracking-wider uppercase mb-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              Creative Work
            </span>
            <h2 className="section-title text-2xl sm:text-3xl !mb-2">
              Featured <span className="gradient-text">Designs</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md">
              A glimpse of recent graphic design work — posters, thumbnails, and more.
            </p>
          </div>
          <Link
            to="/designs"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Grid or Carousel */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : useCarousel ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Carousel
              setApi={setApi}
              opts={{ align: "start", loop: true }}
              plugins={[autoplayRef.current]}
              className="w-full"
            >
              <CarouselContent className="-ml-3 sm:-ml-4">
                {designs.map((design) => (
                  <CarouselItem
                    key={design.id}
                    className="pl-3 sm:pl-4 basis-1/2 lg:basis-1/4"
                  >
                    {renderCard(design)}
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            {/* Navigation Dots */}
            {count > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollTo(index)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      current === index
                        ? "w-6 bg-primary"
                        : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {designs.map((design, index) => (
              <motion.div
                key={design.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
              >
                {renderCard(design)}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedDesigns;
