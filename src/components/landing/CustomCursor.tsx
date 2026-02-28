"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!visible) setVisible(true);
      pendingRef.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const p = pendingRef.current;
        if (p) setPos(p);
      });
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    const handlePointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.("a, button, [role='button']")) setHover(true);
    };
    const handlePointerOut = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.("a, button, [role='button']")) setHover(false);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.body.addEventListener("mouseleave", onLeave);
    document.body.addEventListener("mouseenter", onEnter);
    document.body.addEventListener("pointerover", handlePointerOver);
    document.body.addEventListener("pointerout", handlePointerOut);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.body.removeEventListener("mouseleave", onLeave);
      document.body.removeEventListener("mouseenter", onEnter);
      document.body.removeEventListener("pointerover", handlePointerOver);
      document.body.removeEventListener("pointerout", handlePointerOut);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible]);

  if (typeof window === "undefined" || !visible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed z-[9999] mix-blend-difference"
      style={{ left: pos.x, top: pos.y }}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        scale: hover ? 1.8 : 1,
        opacity: 1,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div
        className="h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.5)" }}
      />
    </motion.div>
  );
}
