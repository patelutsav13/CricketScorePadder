import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { loadMatches, setActiveMatchId } from "@/lib/cricket/storage";
import { useEffect, useState } from "react";
import { Plus, Play, Trophy, Activity, Clock, Award, Crown } from "lucide-react";
import { formatOvers } from "@/lib/cricket/engine";
import { getTrophyCabinet } from "@/lib/cricket/tournament";
const Home = () => {
    const { user } = useAuth();
    const [matches, setMatches] = useState([]);
    const [trophies, setTrophies] = useState([]);
    useEffect(() => {
        setMatches(loadMatches());
        setTrophies(getTrophyCabinet());
    }, []);
    const live = matches.filter((m) => m.status === "in_progress").slice(0, 3);
    const recent = matches.filter((m) => m.status === "completed").slice(0, 3);
    return (<div className="space-y-6">
      <section className="rounded-2xl bg-gradient-card border border-border/60 shadow-card-soft p-6 md:p-10 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl"/>
        <div className="absolute -left-10 -bottom-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl"/>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Activity className="w-3 h-3"/> Live Cricket Scoring
          </div>
          <h1 className="text-3xl md:text-5xl font-black leading-tight">
            Score every ball.<br />
            <span className="text-gradient-primary">Own the match.</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-lg">
            CricPadder is a fast, modern scorebook for backyard, school and club cricket.
            Track runs, wickets, overs and players in real time — on any device.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-neon hover:opacity-90">
              <Link to="/new"><Plus className="w-4 h-4"/> Start a New Match</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/tournaments"><Award className="w-4 h-4"/> Tournaments</Link>
            </Button>
            {!user && (<Button asChild variant="outline" size="lg">
                <Link to="/auth">Create free account</Link>
              </Button>)}
          </div>
          {!user && (<p className="text-xs text-muted-foreground mt-3">
              No account needed — guest mode works. Sign in to keep your history safe.
            </p>)}
        </div>
      </section>

      {live.length > 0 && (<section>
          <SectionTitle icon={<Play className="w-4 h-4"/>} title="Continue scoring"/>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {live.map((m) => <MatchCard key={m.id} match={m} live/>)}
          </div>
        </section>)}

      {trophies.length > 0 && (<section>
          <SectionTitle icon={<Crown className="w-4 h-4"/>} title="Trophy cabinet"/>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trophies.map((t) => (<Card key={t.teamId} className="p-4 bg-gradient-scoreboard border-primary/30 shadow-card-soft relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-primary/10 blur-2xl"/>
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary grid place-items-center shadow-neon">
                    <Trophy className="w-6 h-6 text-primary-foreground"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold truncate">{t.teamName}</div>
                    <div className="text-xs text-muted-foreground">{t.count}× champion</div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(t.count, 5) }).map((_, i) => (<Trophy key={i} className="w-3.5 h-3.5 text-primary"/>))}
                  </div>
                </div>
                <div className="relative mt-3 space-y-1">
                  {t.tournaments.slice(0, 3).map((tt) => (<Link key={tt.id} to={`/tournament/${tt.id}`} className="text-xs text-muted-foreground hover:text-primary block truncate">
                      • {tt.name} <span className="opacity-60">({tt.format})</span>
                    </Link>))}
                </div>
              </Card>))}
          </div>
        </section>)}

      {recent.length > 0 && (<section>
          <SectionTitle icon={<Trophy className="w-4 h-4"/>} title="Recent results"/>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recent.map((m) => <MatchCard key={m.id} match={m}/>)}
          </div>
        </section>)}

      {matches.length === 0 && (<Card className="p-8 text-center bg-gradient-card border-border/60">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3"/>
          <h3 className="font-semibold text-lg">No matches yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Start a new match to see it here.</p>
        </Card>)}
    </div>);
};
const SectionTitle = ({ icon, title }) => (<div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-md bg-secondary grid place-items-center text-primary">{icon}</div>
    <h2 className="font-bold text-lg">{title}</h2>
  </div>);
const MatchCard = ({ match, live }) => {
    const a = match.settings.teamA.name;
    const b = match.settings.teamB.name;
    const i1 = match.innings1;
    const i2 = match.innings2;
    return (<Link to={live ? `/match/${match.id}` : `/scorecard/${match.id}`} onClick={() => live && setActiveMatchId(match.id)} className="block group">
      <Card className="p-4 bg-gradient-card border-border/60 hover:border-primary/50 transition-colors shadow-card-soft">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{match.settings.totalOvers} overs</span>
          {live ? (<span className="inline-flex items-center gap-1 text-destructive font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"/> LIVE
            </span>) : (<span className="text-success font-semibold">FT</span>)}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-semibold truncate">{a}</span>
          <span className="font-mono-score text-sm">
            {i1.battingTeamId === match.settings.teamA.id
            ? `${i1.runs}/${i1.wickets} (${formatOvers(i1.legalBalls)})`
            : i2 ? `${i2.runs}/${i2.wickets} (${formatOvers(i2.legalBalls)})` : "—"}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-semibold truncate">{b}</span>
          <span className="font-mono-score text-sm">
            {i1.battingTeamId === match.settings.teamB.id
            ? `${i1.runs}/${i1.wickets} (${formatOvers(i1.legalBalls)})`
            : i2 ? `${i2.runs}/${i2.wickets} (${formatOvers(i2.legalBalls)})` : "—"}
          </span>
        </div>
        {match.result && (<div className="mt-3 text-xs text-primary font-semibold">{match.result}</div>)}
      </Card>
    </Link>);
};
export default Home;
