import { memo, ReactNode } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

type Props = {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
  isRare?: boolean;
  isGreenSeal?: boolean;
  greenSealAssertivity?: number;
};

export const Card = memo(function Card({ 
  title, 
  subtitle, 
  icon, 
  action, 
  children, 
  delay = 0, 
  className = "",
  isRare,
  isGreenSeal,
  greenSealAssertivity
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-xl border border-white/5 bg-[#0c0c0c] p-5 shadow-sm ${className}`}
    >
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        {isGreenSeal && (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <ShieldCheck className="h-3 w-3" />
            <span>SELADO</span>
            <span className="opacity-60 ml-1">{greenSealAssertivity?.toFixed(0)}%</span>
          </div>
        )}
      </div>

      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span className="text-primary">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="truncate text-[14px] font-medium tracking-tight text-[#eaeaea]">{title}</h2>}
              {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      {children}
    </motion.section>
  );
});
