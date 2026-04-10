import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Bot, MessageSquare, Cpu, Users, Key, LogOut, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/gunit", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/gunit/bots", icon: Bot, label: "Bot Factory" },
  { to: "/gunit/chat", icon: MessageSquare, label: "AI Chat" },
  { to: "/gunit/agents", icon: Cpu, label: "Agents" },
  { to: "/gunit/users", icon: Users, label: "Users" },
  { to: "/gunit/keys", icon: Key, label: "API Keys" },
];

export default function GunitLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-[#050508] text-[#c0c0c0] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-56 bg-[#0a0a0f] border-r border-[#00ff8820] flex flex-col transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-[#00ff8820]">
          <h1 className="font-mono text-lg font-bold tracking-widest">
            <span className="text-[#00ff88]">G</span>
            <span className="text-[#00e5ff]">-</span>
            <span className="text-[#00ff88]">UNIT</span>
          </h1>
          <p className="text-[10px] font-mono text-[#00e5ff50] tracking-[0.2em] mt-0.5">AI COMMAND SYSTEM</p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-2.5 px-3 py-2 rounded font-mono text-xs transition-all",
                isActive
                  ? "bg-[#00ff8815] text-[#00ff88] border border-[#00ff8830]"
                  : "text-[#808080] hover:text-[#c0c0c0] hover:bg-[#ffffff06]"
              )}
            >
              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-[#00ff8820]">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded font-mono text-xs text-[#808080] hover:text-red-400 hover:bg-[#ff000008] w-full transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-10 bg-[#0a0a0f] border-b border-[#00ff8815] flex items-center px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-[#00ff88]">
            <Menu className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-[#00ff88] ml-3 tracking-widest">G-UNIT</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
