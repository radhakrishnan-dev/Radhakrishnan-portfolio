import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  Wallet, 
  Rocket, 
  MessageSquare, 
  Brain, 
  HeadphonesIcon,
  CheckCircle2 
} from "lucide-react";

const reasons = [
  {
    icon: Wallet,
    title: "Affordable Pricing",
    description: "Quality work that fits your budget. No hidden costs or surprise fees.",
  },
  {
    icon: Rocket,
    title: "Fast Delivery",
    description: "Quick turnaround times without compromising on quality or attention to detail.",
  },
  {
    icon: MessageSquare,
    title: "Clear Communication",
    description: "Regular updates and transparent communication throughout your project.",
  },
  {
    icon: Brain,
    title: "Business Mindset",
    description: "I understand business goals and design websites that drive real results.",
  },
  {
    icon: HeadphonesIcon,
    title: "Post-Project Support",
    description: "Continued support even after project completion. I'm here when you need me.",
  },
];

const WhyChooseMe = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 lg:py-28" ref={ref}>
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-primary font-medium text-sm tracking-wider uppercase mb-4 block">
              Why Work With Me
            </span>
            <h2 className="section-title">
              Results You Can <span className="gradient-text">Trust</span>
            </h2>
            <p className="section-subtitle mb-8">
              More than just a developer — I'm your partner in building a successful online presence.
            </p>

            <div className="space-y-4">
              {reasons.map((reason, index) => (
                <motion.div
                  key={reason.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <reason.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">{reason.title}</h3>
                    <p className="text-sm text-muted-foreground">{reason.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-card p-8 lg:p-10">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                
                <h3 className="font-heading font-bold text-2xl text-foreground mb-4">
                  Ready to Start?
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  Let's discuss your project and bring your vision to life.
                </p>

                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-all w-full"
                >
                  Get a Free Quote
                </a>

                <p className="text-sm text-muted-foreground mt-4">
                  No commitment required
                </p>
              </div>
            </div>

            {/* Decorative */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-primary/5 rounded-full blur-xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseMe;
