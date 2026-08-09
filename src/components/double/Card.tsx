import { memo } from "react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
};

export const Card = memo(function Card({ title, subtitle, icon, action, children, delay = 0, className = "" }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-xl border border-white/5 bg-[#0c0c0c] p-4 shadow-sm ${className}`}
    >

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
