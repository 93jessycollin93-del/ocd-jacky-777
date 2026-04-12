import { useNavigate } from "react-router-dom";
import { FlaskConical, X } from "lucide-react";
import { useState } from "react";

export const SandboxBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed || sessionStorage.getItem("sandbox") !== "true") return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary/90 text-primary-foreground px-3 py-1.5 flex items-center justify-center gap-2 font-mono text-xs backdrop-blur-sm">
      <FlaskConical size={12} />
      <span className="uppercase tracking-widest">Sandbox Mode</span>
      <span className="hidden sm:inline text-primary-foreground/70">— no data persists</span>
      <button
        onClick={() => {
          sessionStorage.removeItem("sandbox");
          navigate("/auth");
        }}
        className="ml-3 px-2 py-0.5 rounded-sm border border-primary-foreground/30 text-[10px] uppercase hover:bg-primary-foreground/10 transition-colors"
      >
        Exit
      </button>
      <button onClick={() => setDismissed(true)} className="ml-1 hover:opacity-70">
        <X size={12} />
      </button>
    </div>
  );
};
