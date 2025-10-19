import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 1500,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<string>();
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const currentData = JSON.stringify(data);

    // Skip if data hasn't changed or is same as initial load
    if (currentData === previousDataRef.current || !previousDataRef.current) {
      previousDataRef.current = currentData;
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      try {
        await onSave(data);
        previousDataRef.current = JSON.stringify(data);
        
        toast({
          title: "Saved ✓",
          description: "Changes saved successfully",
          duration: 2000,
        });
      } catch (error) {
        console.error("Auto-save error:", error);
        toast({
          title: "Save Failed",
          description: "Failed to save changes. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        isSavingRef.current = false;
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, delay, enabled]);
}
