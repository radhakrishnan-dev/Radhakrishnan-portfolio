import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import Services from "@/components/Services";
import FeaturedDesigns from "@/components/FeaturedDesigns";
import WhyChooseMe from "@/components/WhyChooseMe";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

const Index = () => {
  const qc = useQueryClient();

  useEffect(() => {
    // Prefetch services so /services navigates instantly with no flicker
    qc.prefetchQuery({
      queryKey: ["public-services"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("is_active", true)
          .order("display_order");
        if (error) throw error;
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [qc]);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Services />
      <FeaturedDesigns />
      <WhyChooseMe />
      <Testimonials />
      <Contact />
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
