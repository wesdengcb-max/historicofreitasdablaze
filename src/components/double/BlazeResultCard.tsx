import { memo } from "react";
import brancoTile from "@/assets/branco-tile.png.asset.json";
import type { Color } from "./types";

export const BLAZE_CARD_W = 48;
export const BLAZE_CARD_TOP_H = 48;
export const BLAZE_GAP_X = 8;
export const BLAZE_GAP_Y = 14;

const PALETTE: Record<Color, { bg: string; border: string; ring: string; fg: string }> = {
  red: { bg: "linear-gradient(180deg, #DE2143 0%, #FF1F3D 100%)", border: "rgba(255, 255, 255, 0.1)", ring: "#ffffff", fg: "#ffffff" },
  black: { bg: "linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)", border: "rgba(255, 255, 255, 0.05)", ring: "#ffffff", fg: "#ffffff" },
  white: { bg: "#ffffff", border: "#ffffff", ring: "#000000", fg: "#16171d" },
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
  onClick,
}: Props) {
  const c = PALETTE[color];
  const isWhite = color === "white";

  return (
    <div
      className="flex animate-in flex-col items-center fade-in slide-in-from-bottom-2"
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
              border: isWhite ? `3px solid ${c.ring}` : `2px solid #ffffff`,
              color: c.fg,
            }}
          >
            {n}
          </span>
        )}
      </button>

      {time && (
        <span
          className={`mt-[5px] text-center leading-none tabular-nums ${
            timeHighlight ? "font-bold text-primary" : "text-[#8ebcf0]"
          }`}
          style={{ fontSize: "var(--blaze-time, 11px)" }}
        >
          {time}
        </span>
      )}
    </div>
  );
});