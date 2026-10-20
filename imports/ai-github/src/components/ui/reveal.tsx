"use client";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
// Keep SSR content visible. Reduced-motion and no-JS users never receive hidden sections.
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={false}
      whileInView={reduced ? undefined : { opacity: [0.88, 1], y: [10, 0] }}
      viewport={{ once: true, margin: "0px 0px -30px 0px" }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
