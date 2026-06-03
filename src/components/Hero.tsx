import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Sparkles, Download } from "lucide-react";
import defaultPhoto from "@/assets/profile-photo.png";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Hero = () => {
  const { get } = useSiteSettings();

  const name = get("name", "Radhakrishnan");
  const title = get("title", "Web Developer & Creative Designer");
  const bio = get("bio", "I design and develop simple, fast & business-ready websites that help brands grow online.");
  const whatsapp = get("whatsapp", "919363053725");
  const availableForWork = get("available_for_work", "true") !== "false";
  const profilePhoto = get("profile_photo_url") || defaultPhoto;
  const resumeUrl = get("resume_url");

  return (
    <section className="min-h-screen flex items-center pt-20 pb-12 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-8 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1 px-1"
          >
            {availableForWork && (
              <div className="inline-flex items-center gap-2 bg-secondary/50 border border-border rounded-full px-3 sm:px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">Available for freelance work</span>
              </div>
            )}

            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4 sm:mb-6">
              Hi, I'm{" "}
              <span className="gradient-text">{name}</span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground font-medium mb-4">
              {title}
            </p>

            <p className="text-lg text-muted-foreground max-w-lg mb-8">
              {bio}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#projects"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-all hover-lift group"
              >
                View My Work
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium border border-border hover:bg-muted transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Me
              </a>
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium border border-border hover:bg-muted transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download CV
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">
              <div>
                <p className="text-xl sm:text-3xl font-heading font-bold text-foreground">{get("stat_years", "3+")}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{get("stat_years_label", "Years Experience")}</p>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-heading font-bold text-foreground">{get("stat_projects", "20+")}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{get("stat_projects_label", "Projects Done")}</p>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-heading font-bold text-foreground">{get("stat_clients", "15+")}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{get("stat_clients_label", "Happy Clients")}</p>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2 flex justify-center"
          >
            <div className="relative">
              <div className="relative w-56 h-56 sm:w-72 sm:h-72 lg:w-96 lg:h-96 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-float p-2 mx-auto">
                <div className="absolute inset-2 rounded-full overflow-hidden border-4 border-primary/30">
                  <img 
                    src={profilePhoto} 
                    alt={`${name} - ${title}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-12 h-12 sm:w-16 sm:h-16 bg-primary/20 rounded-xl flex items-center justify-center animate-float" style={{ animationDelay: "1s" }}>
                <span className="text-lg sm:text-2xl">🎨</span>
              </div>
              <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-10 h-10 sm:w-14 sm:h-14 bg-secondary rounded-xl flex items-center justify-center border border-border animate-float" style={{ animationDelay: "2s" }}>
                <span className="text-base sm:text-xl">💻</span>
              </div>
              <div className="absolute top-1/2 -right-4 sm:-right-8 w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center animate-float" style={{ animationDelay: "1.5s" }}>
                <span className="text-sm sm:text-lg">⚡</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
