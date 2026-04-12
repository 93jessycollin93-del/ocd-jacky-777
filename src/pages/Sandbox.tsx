import { useNavigate } from "react-router-dom";
import { Zap, Gamepad2, Bot, Key, Shield, Package, Globe } from "lucide-react";

const sections = [
  { path: "/", label: "Jackie Chat", icon: Zap, desc: "AI assistant" },
  { path: "/play", label: "Play Game", icon: Gamepad2, desc: "Strategy game" },
  
  { path: "/bots", label: "Bot Foundry", icon: Bot, desc: "Build bots" },
  { path: "/keys", label: "API Keys", icon: Key, desc: "Key vault" },
  { path: "/gunit", label: "G-UNIT", icon: Shield, desc: "AI platform" },
  { path: "/vault", label: "Media Vault", icon: Package, desc: "File tools" },
  { path: "/hub", label: "Telegram Hub", icon: Globe, desc: "Mini-apps" },
];

const Sandbox = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
            <Zap size={12} className="text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Sandbox Mode
            </span>
          </div>
          <h1 className="font-mono text-2xl font-bold text-foreground">Jackie Sandbox</h1>
          <p className="font-mono text-xs text-muted-foreground">
            Explore all app sections — no login required
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {sections.map((s) => (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-md border border-border bg-card hover:bg-accent hover:border-primary/40 transition-all duration-150 btn-mechanical group"
            >
              <s.icon size={20} className="text-primary group-hover:scale-110 transition-transform" />
              <span className="font-mono text-xs font-semibold text-foreground">{s.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{s.desc}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem("sandbox");
            navigate("/auth");
          }}
          className="w-full py-2 rounded-sm font-mono text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-secondary transition-colors"
        >
          Exit Sandbox → Sign In
        </button>
      </div>
    </div>
  );
};

export default Sandbox;
