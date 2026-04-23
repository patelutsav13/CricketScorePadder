import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, Trophy, History, User, Plus, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
const navItems = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/new", label: "New", icon: Plus },
    { to: "/tournaments", label: "Cups", icon: Award },
    { to: "/history", label: "History", icon: History },
    { to: "/account", label: "Account", icon: User },
];
const AppLayout = () => {
    const { user } = useAuth();
    const location = useLocation();
    // Hide chrome on the live scoring page for max real estate
    const isScoring = location.pathname.startsWith("/match/");
    return (<div className="min-h-screen flex flex-col">
      {!isScoring && (<header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/60">
          <div className="container flex items-center justify-between h-14">
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary grid place-items-center shadow-neon">
                <Trophy className="w-4 h-4 text-primary-foreground"/>
              </div>
              <span className="font-extrabold text-lg tracking-tight">
                Cric<span className="text-gradient-primary">Padder</span>
              </span>
            </NavLink>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((n) => (<NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary")}>
                  {n.label}
                </NavLink>))}
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              {user ? user.name : "Guest"}
            </div>
          </div>
        </header>)}

      <main className="flex-1 container py-4 md:py-8 pb-24 md:pb-8 animate-fade-in">
        <Outlet />
      </main>

      {!isScoring && (<nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/85 backdrop-blur-xl border-t border-border/60">
          <ul className="grid grid-cols-5">
            {navItems.map((n) => (<li key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => cn("flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
                  <n.icon className="w-5 h-5"/>
                  {n.label}
                </NavLink>
              </li>))}
          </ul>
        </nav>)}
    </div>);
};
export default AppLayout;
