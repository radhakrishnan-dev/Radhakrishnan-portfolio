import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Save, Loader2, User, Mail, Phone, MapPin, Instagram, MessageCircle, Quote,
  Camera, Upload, Github, Linkedin, BarChart3, Briefcase, FileText, Trash2, Crop,
  UserCircle2, MessageSquareQuote, AtSign, Link2, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/useActivityLog";
import PhotoCropper from "@/components/PhotoCropper";

interface SiteSetting { id: string; key: string; value: string; }

type FieldType = "text" | "email" | "textarea";
interface Field { key: string; label: string; type: FieldType; placeholder?: string; maxLength?: number; full?: boolean; }

const SECTIONS: { id: string; title: string; subtitle: string; icon: any; fields: Field[] }[] = [
  {
    id: "identity", title: "Identity", subtitle: "Your name, title and availability", icon: UserCircle2,
    fields: [
      { key: "name", label: "Full Name", type: "text", placeholder: "Jane Doe" },
      { key: "title", label: "Job Title", type: "text", placeholder: "Full-Stack Developer" },
      { key: "location", label: "Location", type: "text", placeholder: "Berlin, DE" },
    ],
  },
  {
    id: "bio", title: "Bio & Quote", subtitle: "How you introduce yourself", icon: MessageSquareQuote,
    fields: [
      { key: "bio", label: "Primary Bio", type: "textarea", full: true, maxLength: 400 },
      { key: "bio_secondary", label: "Secondary Bio", type: "textarea", full: true, maxLength: 400 },
      { key: "quote", label: "Personal Quote", type: "text", full: true, maxLength: 160 },
    ],
  },
  {
    id: "contact", title: "Contact", subtitle: "How clients reach you", icon: AtSign,
    fields: [
      { key: "email", label: "Email", type: "email", placeholder: "you@domain.com" },
      { key: "phone", label: "Phone", type: "text", placeholder: "+1 555 0100" },
      { key: "whatsapp", label: "WhatsApp Number", type: "text", placeholder: "+1 555 0100", full: true },
    ],
  },
  {
    id: "social", title: "Social Links", subtitle: "Your online presence", icon: Link2,
    fields: [
      { key: "instagram", label: "Instagram Handle", type: "text", placeholder: "@yourhandle" },
      { key: "github_url", label: "GitHub URL", type: "text", placeholder: "https://github.com/..." },
      { key: "linkedin_url", label: "LinkedIn URL", type: "text", placeholder: "https://linkedin.com/in/..." },
    ],
  },
  {
    id: "stats", title: "Stats", subtitle: "Numbers shown in your hero section", icon: TrendingUp,
    fields: [
      { key: "stat_years", label: "Years Experience (value)", type: "text", placeholder: "5+" },
      { key: "stat_years_label", label: "Years Experience (label)", type: "text", placeholder: "Years Experience" },
      { key: "stat_projects", label: "Projects Done (value)", type: "text", placeholder: "50+" },
      { key: "stat_projects_label", label: "Projects Done (label)", type: "text", placeholder: "Projects" },
      { key: "stat_clients", label: "Happy Clients (value)", type: "text", placeholder: "30+" },
      { key: "stat_clients_label", label: "Happy Clients (label)", type: "text", placeholder: "Clients" },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap(s => s.fields.map(f => f.key)).concat(["available_for_work"]);

const ProfileEditor = () => {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("site_settings").select("*");
      if (error) throw error;
      return data as SiteSetting[];
    },
  });

  useEffect(() => {
    if (settings.length > 0) {
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value));
      setFormData(map);
    }
  }, [settings]);

  const settingsMap = useMemo(() => {
    const m: Record<string, SiteSetting> = {};
    settings.forEach(s => (m[s.key] = s));
    return m;
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const key of ALL_KEYS) {
        const value = formData[key] ?? "";
        const existing = settingsMap[key];
        if (existing) {
          await (supabase as any).from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
        } else {
          await (supabase as any).from("site_settings").insert({ key, value });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      logActivity({ actionType: "profile_updated", entityType: "settings", entityName: "Site Profile" });
      toast.success("Profile saved successfully!");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const openCropFor = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); setCropOpen(true); };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (blob: Blob) => {
    setUploadingPhoto(true);
    try {
      const fileName = `profile-photo-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("media").upload(fileName, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
      const photoUrl = urlData.publicUrl;
      const existing = settingsMap["profile_photo_url"];
      if (existing) {
        await (supabase as any).from("site_settings").update({ value: photoUrl, updated_at: new Date().toISOString() }).eq("key", "profile_photo_url");
      } else {
        await (supabase as any).from("site_settings").insert({ key: "profile_photo_url", value: photoUrl });
      }
      setFormData((p) => ({ ...p, profile_photo_url: photoUrl }));
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      logActivity({ actionType: "profile_updated", entityType: "settings", entityName: "Profile Photo" });
      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadResume = async (file: File) => {
    setUploadingResume(true);
    try {
      const fileName = `resume-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
      const resumeUrl = urlData.publicUrl;
      const existing = settingsMap["resume_url"];
      if (existing) {
        await (supabase as any).from("site_settings").update({ value: resumeUrl, updated_at: new Date().toISOString() }).eq("key", "resume_url");
      } else {
        await (supabase as any).from("site_settings").insert({ key: "resume_url", value: resumeUrl });
      }
      setFormData((p) => ({ ...p, resume_url: resumeUrl }));
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      logActivity({ actionType: "profile_updated", entityType: "settings", entityName: "Resume/CV" });
      toast.success("Resume uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingResume(false);
    }
  };

  const removeSetting = async (key: string, label: string) => {
    const existing = settingsMap[key];
    if (existing) {
      await (supabase as any).from("site_settings").update({ value: "", updated_at: new Date().toISOString() }).eq("key", key);
    }
    setFormData((p) => ({ ...p, [key]: "" }));
    queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    logActivity({ actionType: "profile_updated", entityType: "settings", entityName: `${label} removed` });
    toast.success(`${label} removed`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPhoto = formData["profile_photo_url"];
  const isAvailable = formData["available_for_work"] !== "false";

  const renderField = (field: Field) => {
    const val = formData[field.key] || "";
    const inputCls = "bg-secondary/40 border-border/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 transition-all";
    return (
      <div key={field.key} className={field.full ? "md:col-span-2" : ""}>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs font-medium text-foreground/80 uppercase tracking-wide">{field.label}</Label>
          {field.maxLength && (
            <span className={`text-[10px] tabular-nums ${val.length > field.maxLength ? "text-destructive" : "text-muted-foreground"}`}>
              {val.length}/{field.maxLength}
            </span>
          )}
        </div>
        {field.type === "textarea" ? (
          <Textarea
            value={val}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
            rows={4}
            className={inputCls}
          />
        ) : (
          <Input
            type={field.type}
            value={val}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
            className={inputCls}
          />
        )}
      </div>
    );
  };

  return (
    <div className="pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-4 mb-6 bg-background/80 backdrop-blur-xl border-b border-border/60 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Profile Editor</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your public portfolio identity</p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)]"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        {/* Photo + Availability Hero Card */}
        <Card className="border-l-2 border-l-primary bg-card/60 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-primary/40 bg-secondary ring-4 ring-primary/10">
                    {currentPhoto ? (
                      <img src={currentPhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-background/70 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <input
                  ref={photoInputRef} type="file" className="hidden" accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) openCropFor(f); e.target.value = ""; }}
                />
                <div className="flex flex-wrap gap-1.5 justify-center">
                  <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                    <Upload className="w-3.5 h-3.5 mr-1" />{currentPhoto ? "Change" : "Upload"}
                  </Button>
                  {currentPhoto && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setCropSrc(currentPhoto); setCropOpen(true); }}>
                        <Crop className="w-3.5 h-3.5 mr-1" />Crop
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeSetting("profile_photo_url", "Photo")}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Availability + Quick info */}
              <div className="flex-1 w-full space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/40 border border-border/60">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        Available for Work
                        <Badge
                          variant="outline"
                          className={isAvailable
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-destructive/10 text-destructive border-destructive/30"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isAvailable ? "bg-emerald-400 animate-pulse" : "bg-destructive"}`} />
                          {isAvailable ? "Available" : "Not Available"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Controls the badge in your Hero section</p>
                    </div>
                  </div>
                  <Switch
                    checked={isAvailable}
                    onCheckedChange={(c) => setFormData((p) => ({ ...p, available_for_work: c ? "true" : "false" }))}
                  />
                </div>

                {/* Resume */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/40 border border-border/60 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-semibold text-sm">Resume / CV</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formData["resume_url"] ? "PDF uploaded — visible on public site" : "PDF only — adds Download CV button"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={resumeInputRef} type="file" className="hidden" accept="application/pdf,.pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { if (f.type !== "application/pdf") { toast.error("PDF only"); return; } uploadResume(f); }
                        e.target.value = "";
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={() => resumeInputRef.current?.click()} disabled={uploadingResume}>
                      {uploadingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                      {formData["resume_url"] ? "Replace" : "Upload"}
                    </Button>
                    {formData["resume_url"] && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <a href={formData["resume_url"]} target="_blank" rel="noopener noreferrer">View</a>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => removeSetting("resume_url", "CV")}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <PhotoCropper open={cropOpen} onOpenChange={setCropOpen} imageSrc={cropSrc} onCropped={uploadPhoto} aspect={1} />

        {/* Sections */}
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id} className="border-l-2 border-l-primary/70 bg-card/60 backdrop-blur transition-all hover:border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/50">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base text-foreground">{section.title}</h2>
                    <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
                  {section.fields.map(renderField)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileEditor;
