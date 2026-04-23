import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { loadMatches } from "@/lib/cricket/storage";
import { useEffect, useState } from "react";
import { LogOut, User as UserIcon, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const Account = () => {
    const { user, signOut } = useAuth();
    const { toast } = useToast();
    const [stats, setStats] = useState({ total: 0, completed: 0, live: 0 });
    useEffect(() => {
        const all = loadMatches();
        setStats({
            total: all.length,
            completed: all.filter((m) => m.status === "completed").length,
            live: all.filter((m) => m.status === "in_progress").length,
        });
    }, []);
    if (!user) {
        return (<div className="max-w-md mx-auto py-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary grid place-items-center">
          <UserIcon className="w-8 h-8 text-muted-foreground"/>
        </div>
        <h2 className="text-xl font-bold">You're scoring as Guest</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to keep your scorecards safe and identify yourself across devices.
        </p>
        <Button asChild className="bg-gradient-primary text-primary-foreground shadow-neon">
          <Link to="/auth">Sign in or create account</Link>
        </Button>
      </div>);
    }
    return (<div className="max-w-xl mx-auto space-y-4">
      <Card className="p-5 bg-gradient-card border-border/60 shadow-card-soft">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-extrabold text-xl">
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-lg truncate">{user.name}</div>
            <div className="text-sm text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Matches" value={stats.total}/>
        <Stat label="Live" value={stats.live}/>
        <Stat label="Done" value={stats.completed}/>
      </div>

      <Card className="p-5 bg-gradient-card border-border/60 shadow-card-soft">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="w-5 h-5 text-primary"/>
          <span className="font-semibold">Your data</span>
        </div>
        <p className="text-sm text-muted-foreground">
          All scorecards are saved on this device's localStorage. Clearing browser data will remove them.
        </p>
      </Card>

      <Button variant="outline" className="w-full" onClick={() => { signOut(); toast({ title: "Signed out" }); }}>
        <LogOut className="w-4 h-4"/> Sign out
      </Button>
    </div>);
};
const Stat = ({ label, value }) => (<Card className="p-4 text-center bg-gradient-card border-border/60">
    <div className="text-2xl font-extrabold font-mono-score text-gradient-primary">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </Card>);
export default Account;
