import { memo } from "react";
import { motion } from "framer-motion";
import type { Color } from "./types";
import brancoAsset from "@/assets/branco-vip.png.asset.json";

type Size = "sm" | "md" | "lg" | "fluid";

const sizes: Record<Size, string> = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 sm:h-10 sm:w-10 text-xs sm:text-sm",
  lg: "h-14 w-14 text-lg",
  fluid: "w-full aspect-square text-[clamp(10px,2.4vw,14px)]",
};

type Props = {
  color: Color;
  n?: number;
  size?: Size;
  animate?: boolean;
  delay?: number;
  glow?: boolean;
  className?: string;
};

export const ResultCircle = memo(function ResultCircle({ color, n, size = "md", animate = true, delay = 0, glow = false, className }: Props) {
  const base = "relative grid place-items-center overflow-hidden rounded-full font-semibold tabular-nums tile-shadow ring-1 transition-transform duration-200 hover:scale-[1.08]";

  const colorClasses =
    color === "red"
      ? "text-white ring-white/10"
      : color === "white"
        ? "text-black ring-white/40"
        : "text-white ring-white/10";

  const bgStyle =
    color === "red"
      ? { background: "linear-gradient(180deg, #FF3554 0%, #FF1F3D 100%)" }
      : color === "white"
        ? { background: "#FFFFFF" }
        : { background: "linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)" };

  const glowStyle = glow
    ? color === "red"
      ? { boxShadow: "var(--shadow-red-glow), var(--shadow-tile)" }
      : color === "white"
        ? { boxShadow: "0 0 28px oklch(1 0 0 / 0.35), var(--shadow-tile)" }
        : { boxShadow: "var(--shadow-tile)" }
    : {};

  const content =
    color === "white" && (n === 0 || n === undefined) ? (
      <img
        src={brancoAsset.url}
        alt="Branco"
        className="h-full w-full object-cover scale-110 select-none pointer-events-none"
        draggable={false}
      />

    ) : (
      n
    );

  if (!animate) {
    return (
      <div className={`${base} ${sizes[size]} ${colorClasses} ${className || ""}`} style={{ ...bgStyle, ...glowStyle }}>
        {content}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`${base} ${sizes[size]} ${colorClasses} ${className || ""}`}
      style={{ ...bgStyle, ...glowStyle }}
    >
      {content}
    </motion.div>
  );
});
