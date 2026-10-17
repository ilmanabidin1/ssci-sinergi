import { useEffect } from "react";

/** Menetapkan judul tab browser per halaman, misalnya "Dashboard | SSCI". */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} | SSCI`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
