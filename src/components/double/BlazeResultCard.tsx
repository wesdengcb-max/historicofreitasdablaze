import { memo } from "react";
import brancoTile from "@/assets/branco-tile.png.asset.json";
import type { Color } from "./types";
import type { StoredSignal } from "@/lib/signalsStore";

export const BLAZE_CARD_W = 54;
export const BLAZE_CARD_TOP_H = 54;
export const BLAZE_GAP_X = 6;
export const BLAZE_GAP_Y = 16;

const PALETTE: Record<Color, { bg: string; border: string; ring: string; fg: string }> = {
  red: { bg: "#DE2143", border: "rgba(255, 255, 255, 0.1)", ring: "#ffffff", fg: "#ffffff" },
  black: { bg: "#16171d", border: "rgba(255, 255, 255, 0.05)", ring: "#ffffff", fg: "#ffffff" },
  white: { bg: "#ffffff", border: "#ffffff", ring: "#16171d", fg: "#16171d" },
};

type Props = {
  n: number;
  color: Color;
  time?: string;
  numbered?: boolean;
  timeHighlight?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  delay?: number;
  signal?: StoredSignal;
  onClick?: () => void;
};

/** Card de resultado no padrão do histórico da Blaze (48px, círculo 32px, hora 11px). */
export const BlazeResultCard = memo(function BlazeResultCard({
  n,
  color,
  time,
  numbered = false,
  timeHighlight = false,
  dimmed = false,
  selected = false,
  delay = 0,
  signal,
  onClick,
}: Props) {
  const c = PALETTE[color];
  const isWhite = color === "white";

  return (
    <div
      className="blaze-result-card relative flex animate-in flex-col items-center fade-in slide-in-from-bottom-2"
      style={{
        width: `var(--blaze-card-w, ${BLAZE_CARD_W}px)`,
        animationDelay: delay > 0 ? `${delay}s` : undefined,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center justify-center overflow-hidden transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5"
        style={{
          height: `var(--blaze-card-h, ${BLAZE_CARD_TOP_H}px)`,
          borderRadius: 6,
          border: selected ? `2px solid var(--primary)` : isWhite ? `2px solid ${c.border}` : `none`,
          background: c.bg,
          opacity: dimmed ? 0.25 : 1,
        }}
      >
        {isWhite && !numbered ? (
          <img
            src={brancoTile.url}
            alt="Branco"
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span
            className="flex items-center justify-center rounded-full font-bold leading-none tabular-nums"
            style={{
              height: "32px",
              width: "32px",
              fontSize: "14px",
              border: isWhite ? `3px solid ${c.ring}` : `2px solid #ffffff90`,
              color: c.fg,
            }}
          >
            {n}
          </span>
        )}
      </button>

      {signal && (
        <div className="absolute top-0 z-10 flex w-full justify-center">
          <span className={`inline-flex h-3 items-center rounded-full px-1 text-[7px] font-black tracking-wider shadow-sm sm:h-3.5 sm:px-1.5 sm:text-[8px] ${
            signal.outcome === "green" 
              ? "bg-emerald-500 text-black border border-emerald-300"
              : "bg-emerald-500 text-black border border-emerald-300"
          }`}>
            SINAL
          </span>
        </div>
      )}

      {time && (
        <span
          className={`mt-[6px] text-center leading-none tabular-nums ${
            timeHighlight ? "font-bold text-primary" : "text-muted-foreground"
          }`}
          style={{ fontSize: "var(--blaze-time, 11px)" }}
        >
          {time}
        </span>
      )}
    </div>
  );
});