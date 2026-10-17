import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useRef, useState } from "react";

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ["mousemove", "keydown", "click", "scroll", "touchstart"];
const RETURN_TO_KEY = "returnTo";
const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/track", "/tentang-ssci"]);

/** Menyimpan halaman saat ini agar pengguna kembali ke sini setelah login ulang. */
export function rememberReturnTo() {
  try {
    const { pathname, search, hash } = window.location;
    if (PUBLIC_PATHS.has(pathname)) return;
    sessionStorage.setItem(RETURN_TO_KEY, `${pathname}${search}${hash}`);
  } catch {
    // sessionStorage tidak tersedia (mode privat); abaikan.
  }
}

/** Mengambil lalu menghapus halaman tujuan yang disimpan sebelum sesi berakhir. */
export function consumeReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
  } catch {
    return null;
  }
}

/** URL login dengan alasan sesi habis, supaya halaman login dapat menjelaskannya. */
export function sessionExpiredLoginUrl() {
  const base = getLoginUrl();
  if (!base.startsWith("/")) return base;
  return `${base}${base.includes("?") ? "&" : "?"}alasan=sesi-habis`;
}

/**
 * Memantau ketidakaktifan. Satu menit sebelum batas, `warningOpen` bernilai
 * true dan `secondsLeft` menghitung mundur; `stayLoggedIn` mereset timer.
 */
export function useSessionTimeout() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const logoutMutation = trpc.auth.logout.useMutation();
  const logoutRef = useRef(logoutMutation.mutateAsync);
  logoutRef.current = logoutMutation.mutateAsync;
  const refetchRef = useRef(meQuery.refetch);
  refetchRef.current = meQuery.refetch;

  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_BEFORE_MS / 1000);
  const warningOpenRef = useRef(false);
  const deadlineRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetRef = useRef<() => void>(() => {});
  const isAuthenticated = Boolean(meQuery.data);

  useEffect(() => {
    if (!isAuthenticated) return;

    const clearTimers = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      timeoutRef.current = null;
      warningRef.current = null;
      tickRef.current = null;
    };

    const showWarning = (open: boolean) => {
      warningOpenRef.current = open;
      setWarningOpen(open);
    };

    const handleTimeout = () => {
      clearTimers();
      rememberReturnTo();
      void logoutRef.current()
        .catch(() => {
          // Abaikan kegagalan logout; pengguna tetap diarahkan ke login.
        })
        .finally(() => {
          window.location.href = sessionExpiredLoginUrl();
        });
    };

    const handleWarning = () => {
      showWarning(true);
      setSecondsLeft(Math.round(WARNING_BEFORE_MS / 1000));
      tickRef.current = setInterval(() => {
        setSecondsLeft(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)));
      }, 1000);
    };

    const resetTimer = () => {
      clearTimers();
      showWarning(false);
      deadlineRef.current = Date.now() + INACTIVITY_LIMIT_MS;
      warningRef.current = setTimeout(handleWarning, INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS);
      timeoutRef.current = setTimeout(handleTimeout, INACTIVITY_LIMIT_MS);
    };
    resetRef.current = resetTimer;

    // Selama dialog peringatan terbuka, gerakan mouse tidak otomatis
    // memperpanjang sesi; pengguna harus menekan "Tetap masuk".
    const onActivity = () => {
      if (warningOpenRef.current) return;
      resetTimer();
    };

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      clearTimers();
      showWarning(false);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [isAuthenticated]);

  const stayLoggedIn = useCallback(() => {
    resetRef.current();
    void refetchRef.current();
  }, []);

  const logoutNow = useCallback(() => {
    void logoutRef.current()
      .catch(() => {})
      .finally(() => {
        window.location.href = getLoginUrl();
      });
  }, []);

  return { isAuthenticated, warningOpen, secondsLeft, stayLoggedIn, logoutNow };
}
