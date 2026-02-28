"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function LandingLenis({ children }: { children: ReactNode }) {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let mounted = true;
    let started = false;

    // Defer Lenis until after idle (first paint + user interaction or 2s) to avoid competing with initial load
    const startLenis = () => {
      if (!mounted || started) return;
      started = true;
      import("lenis").then(({ default: Lenis }) => {
        if (!mounted) return;
        lenis = new Lenis({ lerp: 0.1, duration: 1 });
        function raf(time: number) {
          lenis?.raf(time);
          rafRef.current = requestAnimationFrame(raf);
        }
        rafRef.current = requestAnimationFrame(raf);
      });
    };

    let idleId: number | ReturnType<typeof setTimeout>;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as Window & { requestIdleCallback: typeof requestIdleCallback }).requestIdleCallback(startLenis, { timeout: 2000 });
    } else {
      idleId = setTimeout(startLenis, 1500);
    }

    const scrollOpts: AddEventListenerOptions = { passive: true };
    const onFirstScroll = () => {
      startLenis();
      window.removeEventListener("scroll", onFirstScroll, scrollOpts);
    };
    window.addEventListener("scroll", onFirstScroll, scrollOpts);

    return () => {
      mounted = false;
      if (typeof window !== "undefined" && "cancelIdleCallback" in window)
        (window as Window & { cancelIdleCallback: typeof cancelIdleCallback }).cancelIdleCallback(idleId as number);
      else clearTimeout(idleId);
      window.removeEventListener("scroll", onFirstScroll);
      cancelAnimationFrame(rafRef.current);
      lenis?.destroy();
    };
  }, []);

  return <>{children}</>;
}
