import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { deleteMatch, loadMatches, setActiveMatchId } from "@/lib/cricket/storage";
import { formatOvers } from "@/lib/cricket/engine";
import { Trash2, Play, Eye, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const History = () => {
    const [matches, setMatches] = useState([]);
    const { toast } = useToast();
    const navigate = useNavigate();
    useEffect(() => { setMatches(loadMatches()); }, []);
    const refresh = () => setMatches(loadMatches());
    if (matches.length === 0) {
        return (<div className="max-w-md mx-auto text-center py-12 space-y-4">
        <h2 className="text-xl font-bold">No matches yet</h2>
        <p className="text-sm text-muted-foreground">Start your first scorecard to see it here.</p>
        <Button asChild className="bg-gradient-primary text-primary-foreground shadow-neon">
          <Link to="/new"><Plus className="w-4 h-4"/> New match</Link>
        </Button>
      </div>);
    }
    return (<div className="space-y-3 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold">Match History</h1>
      {matches.map((m) => {
            const a = m.settings.teamA.name;
            const b = m.settings.teamB.name;
            const teamScore = (teamId) => {
                if (m.innings1.battingTeamId === teamId)
                    return `${m.innings1.runs}/${m.innings1.wickets} (${formatOvers(m.innings1.legalBalls)})`;
                if (m.innings2 && m.innings2.battingTeamId === teamId)
                    return `${m.innings2.runs}/${m.innings2.wickets} (${formatOvers(m.innings2.legalBalls)})`;
                return "—";
            };
            return (<Card key={m.id} className="p-4 bg-gradient-card border-border/60 shadow-card-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>{m.settings.totalOvers} overs</span>
                  <span>•</span>
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                  {m.status === "in_progress" ? (<span className="ml-auto text-destructive font-semibold">LIVE</span>) : (<span className="ml-auto text-success font-semibold">DONE</span>)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold truncate">{a}</span>
                  <span className="font-mono-score text-sm">{teamScore(m.settings.teamA.id)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold truncate">{b}</span>
                  <span className="font-mono-score text-sm">{teamScore(m.settings.teamB.id)}</span>
                </div>
                {m.result && <div className="text-xs text-primary font-semibold mt-2">{m.result}</div>}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {m.status === "in_progress" ? (<Button size="sm" className="flex-1 bg-gradient-primary text-primary-foreground" onClick={() => { setActiveMatchId(m.id); navigate(`/match/${m.id}`); }}>
                  <Play className="w-4 h-4"/> Resume
                </Button>) : (<Button asChild size="sm" variant="outline" className="flex-1">
                  <Link to={`/scorecard/${m.id}`}><Eye className="w-4 h-4"/> Scorecard</Link>
                </Button>)}
              <Button size="sm" variant="outline" onClick={() => {
                    if (confirm("Delete this match?")) {
                        deleteMatch(m.id);
                        refresh();
                        toast({ title: "Match deleted" });
                    }
                }}>
                <Trash2 className="w-4 h-4"/>
              </Button>
            </div>
          </Card>);
        })}
    </div>);
};
export default History;
