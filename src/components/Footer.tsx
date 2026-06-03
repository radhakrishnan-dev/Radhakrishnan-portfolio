import { Github, Instagram, Linkedin, Heart, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { get } = useSiteSettings();

  const name = get("name", "Radhakrishnan");
  const title = get("title", "Web Developer & Creative Designer");
  const instagram = get("instagram", "mr_krishzz_07");
  const githubUrl = get("github_url", "https://github.com/radhakrishnan-dev");
  const linkedinUrl = get("linkedin_url", "https://www.linkedin.com/in/radhakrishnan-m-478628263");

  const socialLinks = [
    { icon: Github, href: githubUrl, label: "GitHub" },
    { icon: Instagram, href: `https://instagram.com/${instagram}`, label: "Instagram" },
    { icon: Linkedin, href: linkedinUrl, label: "LinkedIn" },
  ];

  return (
    <footer className="py-12 border-t border-border">
      <div className="section-container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <a href="#" className="font-heading font-bold text-xl text-foreground">
              {name}<span className="text-primary">.</span>
            </a>
            <p className="text-sm text-muted-foreground mt-1">
              {title}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            © {currentYear} {name}. Made with{" "}
            <Heart className="w-4 h-4 text-destructive fill-destructive" /> in India
          </p>
          <Link 
            to="/admin/login" 
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
          >
            <Lock className="w-3 h-3" />
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
