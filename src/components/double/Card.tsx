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

export function Card({ title, subtitle, icon, action, children, delay = 0, className = "" }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card rounded-2xl p-3 sm:p-5 lg:p-7 ${className}`}
    >
      {(title || action) && (
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-primary ring-1 ring-white/5">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h2>}
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      {children}
    </motion.section>
  );
}
