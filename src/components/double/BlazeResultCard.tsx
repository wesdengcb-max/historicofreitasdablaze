import { memo } from "react";
import brancoTile from "@/assets/branco-tile.png.asset.json";
import type { Color } from "./types";

export const BLAZE_CARD_W = 52;
export const BLAZE_CARD_TOP_H = 50;
export const BLAZE_GAP_X = 8;
export const BLAZE_GAP_Y = 18;

const PALETTE: Record<Color, { bg: string; border: string; ring: string; fg: string }> = {
  red: { bg: "#DE2143", border: "#ff5f7a", ring: "#ffffff", fg: "#ffffff" },
  black: { bg: "#16171d", border: "#3a3d4a", ring: "#ffffff", fg: "#ffffff" },
  white: { bg: "#ffffff", border: "#d9dbe3", ring: "#16171d", fg: "#16171d" },
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

/** Card de resultado no padrão do histórico da Blaze (52px, círculo 30px, hora 12px). */
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
      style={{ width: BLAZE_CARD_W, animationDelay: delay > 0 ? `${delay}s` : undefined }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center justify-center overflow-hidden transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5"
        style={{
          height: BLAZE_CARD_TOP_H,
          borderRadius: 8,
          border: `2px solid ${selected ? "var(--primary)" : c.border}`,
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
            className="flex items-center justify-center rounded-full text-[13px] font-bold leading-none tabular-nums"
            style={{ height: 30, width: 30, border: `3px solid ${c.ring}`, color: c.fg }}
          >
            {n}
          </span>
        )}
      </button>

      {time && (
        <span
          className={`mt-1 text-center text-[12px] leading-none tabular-nums ${
            timeHighlight ? "font-bold text-primary" : "text-muted-foreground"
          }`}
        >
          {time}
        </span>
      )}
    </div>
  );
});