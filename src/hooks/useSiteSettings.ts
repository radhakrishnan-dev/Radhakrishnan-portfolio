import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_settings")
        .select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as { key: string; value: string }[]).forEach((s) => (map[s.key] = s.value));
      return map;
    },
    staleTime: 1000 * 60 * 5,
  });

  const get = (key: string, fallback = "") => settings[key] || fallback;

  return { settings, get, isLoading };
}
