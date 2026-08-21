import { useEffect, useState } from "react";
import { getRobotEnabled, setRobotEnabled, subscribeRobot } from "@/lib/signalsStore";
import { Radio, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PredictiveSignals } from "@/components/double/PredictiveSignals";

export default function SinaisSection() {
  const [robotOn, setRobotOn] = useState(getRobotEnabled());

  useEffect(() => {
    const sub = subscribeRobot((v) => setRobotOn(v));
    return () => sub();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] bg-[#090909] px-4 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <Radio className="h-5 w-5 text-red-500" />
        <h1 className="text-4xl font-black tracking-tighter text-white font-outfit uppercase">Feed de Sinais</h1>
      </div>
      
      <PredictiveSignals />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-2.5 backdrop-blur-md">
          <Power className="h-5 w-5 text-emerald-500" />
          <div className="text-xs leading-tight">
            <div className="text-[#9CA3AF] font-bold tracking-widest text-[9px] uppercase">ROBÔ · SINAIS</div>
            <div className="font-black text-emerald-400 text-lg font-outfit">{robotOn ? "ACTIVE" : "STANDBY"}</div>
          </div>
          <Switch checked={robotOn} onCheckedChange={(v) => { setRobotOn(v); setRobotEnabled(v); }} />
        </div>
      </div>
    </div>
  );
}
