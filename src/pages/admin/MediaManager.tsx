import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Copy, Loader2, Image, FileText } from "lucide-react";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/useActivityLog";

interface MediaFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any> | null;
}

const MediaManager = () => {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["media-files"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("media").list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      return (data || []).filter((f) => f.name !== ".emptyFolderPlaceholder") as MediaFile[];
    },
  });

  const uploadFile = async (file: File) => {
    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("media").upload(fileName, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["media-files"] });
      logActivity({ actionType: "media_uploaded", entityType: "media", entityName: fileName });
      toast.success("File uploaded!");
    }
    setUploading(false);
  };

  const deleteFile = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.storage.from("media").remove([name]);
      if (error) throw error;
    },
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ["media-files"] });
      logActivity({ actionType: "media_deleted", entityType: "media", entityName: name });
      toast.success("File deleted");
    },
  });

  const getPublicUrl = (name: string) => {
    const { data } = supabase.storage.from("media").getPublicUrl(name);
    return data.publicUrl;
  };

  const copyUrl = (name: string) => {
    navigator.clipboard.writeText(getPublicUrl(name));
    toast.success("URL copied to clipboard");
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Media Manager</h1>
          <p className="text-muted-foreground mt-1">{files.length} file{files.length !== 1 ? "s" : ""} uploaded</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload File
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Image className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No files uploaded yet</p>
            <p className="text-sm mt-1">Upload images and documents to use across your portfolio</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <Card key={file.id || file.name} className="glass-card overflow-hidden group">
              <div className="aspect-square relative bg-secondary flex items-center justify-center">
                {isImage(file.name) ? (
                  <img
                    src={getPublicUrl(file.name)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <FileText className="w-12 h-12 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" onClick={() => copyUrl(file.name)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => deleteFile.mutate(file.name)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-xs text-foreground truncate">{file.name}</p>
                {file.metadata?.size && (
                  <p className="text-[10px] text-muted-foreground">{formatSize(file.metadata.size)}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaManager;
