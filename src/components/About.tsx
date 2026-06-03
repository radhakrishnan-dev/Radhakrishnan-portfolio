import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Target, Heart, Lightbulb } from "lucide-react";
import defaultPhoto from "@/assets/profile-photo.png";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const About = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { get } = useSiteSettings();

  const name = get("name", "Radhakrishnan");
  const title = get("title", "Web Developer & Designer");
  const bio = get("bio", "I'm a passionate web developer with a strong business mindset. I believe every brand deserves a powerful online presence that drives real results. My focus is on creating websites that are not just beautiful, but also fast, functional, and business-ready.");
  const bioSecondary = get("bio_secondary", "Whether you're a small business owner, startup founder, or freelancer, I'm here to help you establish your digital footprint. I combine clean code with thoughtful design to deliver solutions that truly work for your business goals.");
  const quote = get("quote", "Your website is your 24/7 salesperson. Let's make it work for you.");
  const profilePhoto = get("profile_photo_url") || defaultPhoto;

  return (
    <section id="about" className="py-20 lg:py-28 relative" ref={ref}>
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          {/* Left - Image/Visual */}
          <div className="relative">
            <div className="glass-card p-8 lg:p-12">
              <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center overflow-hidden">
                <img 
                  src={profilePhoto} 
                  alt={`${name} - ${title}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/10 rounded-xl blur-2xl" />
          </div>

          {/* Right - Content */}
          <div>
            <span className="text-primary font-medium text-sm tracking-wider uppercase mb-4 block">
              About Me
            </span>
            <h2 className="section-title">
              Turning Ideas Into
              <span className="gradient-text"> Digital Reality</span>
            </h2>
            
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              {bio}
            </p>

            <p className="text-muted-foreground leading-relaxed mb-8">
              {bioSecondary}
            </p>

            {/* Quote */}
            <blockquote className="border-l-4 border-primary pl-6 py-2 mb-8">
              <p className="text-foreground italic text-lg">
                "{quote}"
              </p>
            </blockquote>

            {/* Values */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="glass-card p-4 text-center">
                <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Business Focus</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Heart className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Dedicated Care</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Lightbulb className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Creative Solutions</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default About;
