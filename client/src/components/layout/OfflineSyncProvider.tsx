import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listOfflineDrafts, deleteOfflineDraft } from "@/lib/offlineDrafts";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

/**
 * Watches for connectivity and drains any receipts that were saved locally
 * (via lib/offlineDrafts) while offline. Runs once on mount if already
 * online, and again every time the browser's `online` event fires.
 *
 * Known limitation: this prevents a draft being synced twice from the SAME
 * browser (it's deleted from IndexedDB right after a successful sync), but
 * it does not give the server an idempotency key, so the usual
 * possible-duplicate heuristic — not a hard guarantee — is what protects
 * against a draft being saved twice if sync is interrupted mid-way.
 */
export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const syncingRef = useRef(false);

  useEffect(() => {
    async function sync() {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const drafts = await listOfflineDrafts();
        if (drafts.length === 0) return;

        let synced = 0;
        for (const draft of drafts) {
          try {
            await api.post("/receipts", draft.payload);
            await deleteOfflineDraft(draft.id);
            synced++;
          } catch {
            // Leave it queued — likely still offline or a transient error. Stop trying this pass.
            break;
          }
        }
        if (synced > 0) {
          toast({ title: `Synced ${synced} offline receipt${synced === 1 ? "" : "s"}`, variant: "success" });
          qc.invalidateQueries({ queryKey: ["receipts"] });
          qc.invalidateQueries({ queryKey: ["analytics"] });
        }
      } finally {
        syncingRef.current = false;
      }
    }

    if (navigator.onLine) sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
