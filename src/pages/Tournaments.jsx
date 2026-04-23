import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Plus, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createTournament, loadTournaments, deleteTournament, } from "@/lib/cricket/tournament";
/** Default IPL-style colors as "H S% L%" HSL triplets so we stay on the design system. */
const PRESET_TEAMS = [
    { name: "Mumbai Indians", shortName: "MI", color: "215 80% 35%" },
    { name: "Chennai Super Kings", shortName: "CSK", color: "45 100% 50%" },
    { name: "Royal Challengers", shortName: "RCB", color: "0 80% 45%" },
    { name: "Kolkata Knight Riders", shortName: "KKR", color: "270 60% 35%" },
    { name: "Delhi Capitals", shortName: "DC", color: "215 95% 45%" },
    { name: "Rajasthan Royals", shortName: "RR", color: "330 80% 55%" },
    { name: "Sunrisers Hyderabad", shortName: "SRH", color: "20 95% 55%" },
    { name: "Punjab Kings", shortName: "PBKS", color: "0 85% 55%" },
];
const COLOR_SWATCHES = [
    "215 80% 35%", "45 100% 50%", "0 80% 45%", "270 60% 35%",
    "215 95% 45%", "330 80% 55%", "20 95% 55%", "142 70% 40%",
    "180 70% 40%", "300 65% 45%", "60 90% 50%", "0 0% 25%",
];
const Tournaments = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [list, setList] = useState([]);
    // form state
    const [name, setName] = useState("CricPadder Cup");
    const [format, setFormat] = useState("T20");
    const [overs, setOvers] = useState(5);
    const [leagueMatches, setLeagueMatches] = useState(12);
    const [teamCount, setTeamCount] = useState(4);
    const [teams, setTeams] = useState(PRESET_TEAMS.slice(0, 4).map((t) => ({ ...t, players: ["", "", "", "", "", ""] })));
    useEffect(() => { setList(loadTournaments()); }, []);
    const setTeamCountSafe = (n) => {
        const v = Math.max(2, Math.min(10, n));
        setTeamCount(v);
        setTeams((prev) => {
            const copy = [...prev];
            while (copy.length < v) {
                const preset = PRESET_TEAMS[copy.length] ?? {
                    name: `Team ${copy.length + 1}`,
                    shortName: `T${copy.length + 1}`,
                    color: COLOR_SWATCHES[copy.length % COLOR_SWATCHES.length],
                };
                copy.push({ ...preset, players: ["", "", "", "", "", ""] });
            }
            return copy.slice(0, v);
        });
    };
    const updateTeam = (i, field, value) => {
        setTeams((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
    };
    const updatePlayer = (ti, pi, value) => {
        setTeams((prev) => prev.map((t, idx) => idx === ti
            ? { ...t, players: t.players.map((p, j) => j === pi ? value : p) }
            : t));
    };
    const addPlayer = (ti) => setTeams((prev) => prev.map((t, idx) => idx === ti ? { ...t, players: [...t.players, ""] } : t));
    const removePlayer = (ti, pi) => setTeams((prev) => prev.map((t, idx) => idx === ti ? { ...t, players: t.players.filter((_, j) => j !== pi) } : t));
    const create = () => {
        // Squad size should scale with overs so a side isn't bowled out in 1-2 overs.
        // Rule of thumb: need at least ceil(overs / 4) + 2 players, capped at 11, min 2.
        const minPlayers = Math.max(2, Math.min(11, Math.ceil(overs / 4) + 2));
        for (const t of teams) {
            const filled = t.players.filter((p) => p.trim()).length;
            if (filled < minPlayers) {
                toast({
                    title: `Add at least ${minPlayers} players for ${t.name}`,
                    description: `For ${overs}-over matches, each squad needs ${minPlayers}+ players so the innings actually lasts.`,
                    variant: "destructive",
                });
                return;
            }
        }
        // All teams must have the same number of players (engine assumes equal sides).
        const sizes = new Set(teams.map((t) => t.players.filter((p) => p.trim()).length));
        if (sizes.size > 1) {
            toast({ title: "All teams must have the same number of players", variant: "destructive" });
            return;
        }
        if (leagueMatches < teamCount - 1) {
            toast({ title: "Too few matches", description: "League must have at least n-1 matches.", variant: "destructive" });
            return;
        }
        const tour = createTournament({
            name, format, oversPerInnings: overs, leagueMatches,
            teams: teams.map((t) => ({ name: t.name, shortName: t.shortName, color: t.color, players: t.players })),
        });
        const all = loadTournaments();
        all.unshift(tour);
        localStorage.setItem("cricpadder.tournaments.v1", JSON.stringify(all));
        setList(all);
        navigate(`/tournament/${tour.id}`);
    };
    const remove = (id) => {
        deleteTournament(id);
        setList(loadTournaments());
    };
    return (<div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary"/> Tournaments
          </h1>
          <p className="text-sm text-muted-foreground">Create a tournament, play matches, watch the points table evolve.</p>
        </div>
      </div>

      {list.length > 0 && (<Card className="p-4 bg-gradient-card border-border/60 shadow-card-soft">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Your tournaments</div>
          <div className="space-y-2">
            {list.map((t) => (<div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border/60">
                <Trophy className="w-4 h-4 text-primary"/>
                <div className="min-w-0 flex-1">
                  <Link to={`/tournament/${t.id}`} className="font-bold hover:text-primary truncate block">{t.name}</Link>
                  <div className="text-xs text-muted-foreground">
                    {t.format} · {t.teams.length} teams · {t.leagueMatches} league matches · {t.status === "completed" ? "Completed" : "In progress"}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline"><Link to={`/tournament/${t.id}`}>Open</Link></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4"/></Button>
              </div>))}
          </div>
        </Card>)}

      <Card className="p-4 md:p-5 bg-gradient-card border-border/60 shadow-card-soft space-y-4">
        <h2 className="font-bold text-lg flex items-center gap-2"><Plus className="w-4 h-4 text-primary"/> New tournament</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tournament name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="IPL 2026 / World Cup"/>
          </div>
          <div className="space-y-1.5">
            <Label>Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {["T20", "ODI", "Test"].map((f) => (<button key={f} onClick={() => setFormat(f)} className={`px-2 py-2 rounded-lg text-sm font-bold border transition-colors ${format === f ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>
                  {f}
                </button>))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Overs per innings</Label>
            <Input type="number" min={1} max={50} value={overs} onChange={(e) => setOvers(parseInt(e.target.value) || 0)}/>
            <p className="text-[11px] text-muted-foreground">
              Need at least <b>{Math.max(2, Math.min(11, Math.ceil(overs / 4) + 2))}</b> players per team for {overs} overs (so the side isn't all out too quickly).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Total league matches</Label>
            <Input type="number" min={1} max={120} value={leagueMatches} onChange={(e) => setLeagueMatches(parseInt(e.target.value) || 0)}/>
            <p className="text-[11px] text-muted-foreground">e.g. IPL = 56. Top 4 teams advance to Semi-Finals.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Number of teams (min 4 to seed semis)</Label>
          <Input type="number" min={4} max={10} value={teamCount} onChange={(e) => setTeamCountSafe(parseInt(e.target.value) || 4)}/>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {teams.map((t, ti) => (<Card key={ti} className="p-3 bg-secondary/30 border-2" style={{
                borderColor: t.color ? `hsl(${t.color} / 0.55)` : undefined,
                background: t.color
                    ? `linear-gradient(135deg, hsl(${t.color} / 0.18), hsl(var(--secondary) / 0.4))`
                    : undefined,
            }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full border-2 border-white/20 shrink-0 shadow" style={{ background: t.color ? `hsl(${t.color})` : "hsl(var(--muted))" }} aria-label="Team color"/>
                <Input value={t.name} onChange={(e) => updateTeam(ti, "name", e.target.value)} className="font-bold"/>
                <Input value={t.shortName} onChange={(e) => updateTeam(ti, "shortName", e.target.value)} className="w-20 uppercase font-bold"/>
              </div>

              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Team color</div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_SWATCHES.map((c) => {
                const active = t.color === c;
                return (<button key={c} type="button" onClick={() => updateTeam(ti, "color", c)} className={`w-7 h-7 rounded-full border-2 transition-transform ${active ? "scale-110 ring-2 ring-offset-2 ring-offset-background" : "hover:scale-105 border-white/15"}`} style={{
                        background: `hsl(${c})`,
                        borderColor: active ? `hsl(${c})` : undefined,
                        boxShadow: active ? `0 0 12px hsl(${c} / 0.7)` : undefined,
                    }} aria-label={`Pick color ${c}`}/>);
            })}
                </div>
              </div>

              <div className="space-y-2">
                {t.players.map((p, pi) => (<div key={pi} className="flex gap-2">
                    <Input value={p} onChange={(e) => updatePlayer(ti, pi, e.target.value)} placeholder={`Player ${pi + 1}`}/>
                    {t.players.length > 2 && (<Button type="button" size="icon" variant="outline" onClick={() => removePlayer(ti, pi)}>
                        <Trash2 className="w-4 h-4"/>
                      </Button>)}
                  </div>))}
              </div>
              <Button type="button" size="sm" variant="outline" className="w-full mt-2" onClick={() => addPlayer(ti)}>
                <Plus className="w-4 h-4"/> Add player
              </Button>
            </Card>))}
        </div>

        <Button onClick={create} size="lg" className="w-full bg-gradient-primary text-primary-foreground shadow-neon hover:opacity-90">
          Create tournament <ArrowRight className="w-4 h-4"/>
        </Button>
      </Card>
    </div>);
};
export default Tournaments;
