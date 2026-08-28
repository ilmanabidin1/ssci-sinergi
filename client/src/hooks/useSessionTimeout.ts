import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
const WARNING_AT_MS = 14 * 60 * 1000;
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ["mousemove", "keydown", "click", "scroll"];

export function useSessionTimeout() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const logoutMutation = trpc.auth.logout.useMutation();
  const logoutRef = useRef(logoutMutation.mutateAsync);
  logoutRef.current = logoutMutation.mutateAsync;

  const warningShownRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthenticated = Boolean(meQuery.data);

  useEffect(() => {
    if (!isAuthenticated) return;

    const clearTimers = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
        warningRef.current = null;
      }
    };

    const handleTimeout = () => {
      void logoutRef.current().catch(() => {
        // ignore logout errors; redirect anyway
      });
      toast.error("Sesi berakhir karena tidak ada aktivitas");
      window.location.href = getLoginUrl();
    };

    const handleWarning = () => {
      if (warningShownRef.current) return;
      warningShownRef.current = true;
      toast.warning("Sesi akan berakhir dalam 1 menit");
    };

    const resetTimer = () => {
      warningShownRef.current = false;
      clearTimers();
      warningRef.current = setTimeout(handleWarning, WARNING_AT_MS);
      timeoutRef.current = setTimeout(handleTimeout, INACTIVITY_LIMIT_MS);
    };

    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [isAuthenticated]);

  return { isAuthenticated };
}
