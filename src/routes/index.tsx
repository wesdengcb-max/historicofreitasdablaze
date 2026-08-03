import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import freitasKing from "@/assets/freitas-king.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "FREITAS DA BLAZE — O Início" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  // Partículas animadas de fundo
  const particles = useMemo(() => 
    Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    })), []);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate({ to: "/app" });
    }, 620);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0a0c] font-sans">
      {/* Background Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.4, 0],
              y: ["0%", "-20%"],
              scale: [0, 1, 0.5]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut"
            }}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              filter: "blur(1px)",
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {!isExiting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -40, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="z-10 flex flex-col items-center gap-8 px-4 text-center"
          >
            <div className="relative group cursor-pointer" onClick={handleEnter}>
              <div className="absolute -inset-4 bg-white/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <motion.img
                src={freitasKing.url}
                alt="Freitas King"
                className="relative h-64 w-64 object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.15)]"
                animate={{ 
                  y: [0, -12, 0],
                  filter: ["brightness(1) contrast(1)", "brightness(1.1) contrast(1.05)", "brightness(1) contrast(1)"]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tighter text-white sm:text-6xl uppercase italic">
                FREITAS DA BLAZE
              </h1>
              <p className="text-lg font-medium text-white/50 tracking-widest uppercase">
                A evolução do histórico chegou.
              </p>
            </div>

            <button
              onClick={handleEnter}
              className="group relative mt-4 overflow-hidden rounded-full bg-white px-10 py-4 font-bold text-black transition-all hover:scale-105 active:scale-95"
            >
              <span className="relative z-10 uppercase tracking-tight">Entrar Agora</span>
              <div className="absolute inset-0 translate-y-full bg-neutral-200 transition-transform duration-300 group-hover:translate-y-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 text-[10px] font-medium uppercase tracking-[0.3em] text-white/20">
        Versão 2.0 • 2026 • © Freitas
      </div>
    </div>
  );
}
