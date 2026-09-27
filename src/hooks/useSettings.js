import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Settings.list();
        if (list[0]) setSettings(list[0]);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  return { settings, loading };
}