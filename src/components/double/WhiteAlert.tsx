import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import type { Spin } from "./types";
import brancoVip from "@/assets/branco-vip.png.asset.json";

type Props = {
  spin: Spin | null;
  onClose: () => void;
  autoCloseTime?: number;
};

export function WhiteAlert({ spin, onClose, autoCloseTime = 3000 }: Props) {
  useEffect(() => {
    if (spin) {
      const timer = setTimeout(onClose, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [spin, onClose, autoCloseTime]);

  return (
    <AnimatePresence>
      {spin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed left-1/2 top-6 z-[110] -translate-x-1/2"
          role="status"
          aria-live="assertive"
        >
          <motion.div
            initial={{ y: -24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -24, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card pointer-events-auto relative flex items-center gap-4 rounded-2xl px-5 py-3"
            style={{ 
              boxShadow: "0 20px 50px -12px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)"
            }}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-white/50">
              <img src={brancoVip.url} alt="Branco" className="h-full w-full object-cover" />
              <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-white/60" />
            </div>

            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                Alerta de Branco
              </p>
              <p className="text-base font-black tracking-tight text-white">
                BRANCO CONFIRMADO
              </p>
              <p className="text-[10px] text-white/50">IA Freitas · {spin.time}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-muted-foreground transition-colors duration-200 hover:bg-white/5 hover:text-foreground"
              aria-label="Fechar alerta"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
