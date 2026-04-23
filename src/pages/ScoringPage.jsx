import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { applyBall, computeResult, ensureBatsman, ensureBowler, formatOvers, startSecondInnings, strikeRate } from "@/lib/cricket/engine";
import { getMatch, upsertMatch } from "@/lib/cricket/storage";
import { recordFixtureResult } from "@/lib/cricket/tournament";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, ListChecks } from "lucide-react";
import PlayerPickerDialog from "@/components/cricket/PlayerPickerDialog";
import WicketDialog from "@/components/cricket/WicketDialog";
import EventBanner from "@/components/cricket/EventBanner";
import MatchCharts from "@/components/cricket/MatchCharts";
import { buildTeamColorLookup } from "@/lib/cricket/teamColors";
const ScoringPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [match, setMatch] = useState(null);
    const [pendingExtra, setPendingExtra] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(null);
    const [wicketOpen, setWicketOpen] = useState(false);
    const [pendingRunsForWicket, setPendingRunsForWicket] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [banner, setBanner] = useState(null);
    const audioCtxRef = useRef(null);
    useEffect(() => {
        if (!id)
            return;
        const m = getMatch(id);
        if (!m) {
            navigate("/");
            return;
        }
        setMatch(structuredClone(m));
    }, [id, navigate]);
    const persist = (m) => {
        upsertMatch(m);
        setMatch(structuredClone(m));
    };
    if (!match)
        return null;
    const inningsKey = match.currentInnings === 1 ? "innings1" : "innings2";
    const innings = match[inningsKey];
    const battingTeam = innings.battingTeamId === match.settings.teamA.id ? match.settings.teamA : match.settings.teamB;
    const bowlingTeam = innings.bowlingTeamId === match.settings.teamA.id ? match.settings.teamA : match.settings.teamB;
    const playerById = (pid) => {
        if (!pid)
            return undefined;
        return [...match.settings.teamA.players, ...match.settings.teamB.players].find((p) => p.id === pid);
    };
    const striker = playerById(innings.strikerId);
    const nonStriker = playerById(innings.nonStrikerId);
    const bowler = playerById(innings.currentBowlerId);
    const needSetup = !striker || !nonStriker || !bowler;
    const target = inningsKey === "innings2" ? (match.innings1.runs ?? 0) + 1 : null;
    const ballsLeft = match.settings.totalOvers * 6 - innings.legalBalls;
    const runsNeeded = target !== null ? target - innings.runs : null;
    const playClick = () => {
        try {
            if (!audioCtxRef.current)
                audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.value = 880;
            o.type = "triangle";
            g.gain.value = 0.04;
            o.connect(g).connect(ctx.destination);
            o.start();
            o.stop(ctx.currentTime + 0.05);
        }
        catch { /* ignore */ }
    };
    const score = (runs, opts = {}) => {
        if (needSetup) {
            toast({ title: "Set striker, non-striker and bowler first", variant: "destructive" });
            return;
        }
        try {
            const m = structuredClone(match);
            const inn = m[inningsKey];
            // Capture names for banner subtitle BEFORE applying (striker may change after the ball)
            const strikerName = striker?.name ?? "";
            const bowlerName = bowler?.name ?? "";
            const effectiveExtra = (opts.extra ?? pendingExtra);
            const res = applyBall(m, inningsKey, {
                runs,
                extra: effectiveExtra,
                isWicket: !!opts.isWicket,
                dismissal: opts.dismissal,
                outBatsmanId: opts.outBatsmanId,
                fielderId: opts.fielderId,
            });
            setPendingExtra(null);
            playClick();
            // Trigger banner + haptic vibration
            const tryVibrate = (pattern) => {
                try {
                    if ("vibrate" in navigator)
                        navigator.vibrate(pattern);
                }
                catch { /* ignore */ }
            };
            if (opts.isWicket) {
                setBanner({ kind: "wicket", subtitle: `${strikerName} — ${bowlerName}` });
                tryVibrate([60, 40, 120]);
            }
            else if (!effectiveExtra && runs === 6) {
                setBanner({ kind: "six", subtitle: `${strikerName} off ${bowlerName}` });
                tryVibrate([40, 30, 40, 30, 80]);
            }
            else if (!effectiveExtra && runs === 4) {
                setBanner({ kind: "four", subtitle: `${strikerName} off ${bowlerName}` });
                tryVibrate([30, 25, 60]);
            }
            if (res.inningsComplete) {
                if (m.currentInnings === 1) {
                    startSecondInnings(m);
                    persist(m);
                    toast({ title: "Innings break", description: `Target: ${m.innings1.runs + 1}` });
                }
                else {
                    m.status = "completed";
                    m.result = computeResult(m);
                    persist(m);
                    // Tournament linkage: record the fixture result
                    if (m.settings.tournamentId && m.settings.fixtureId) {
                        const winnerName = m.result.split(" won by ")[0];
                        const winnerSettingsTeam = winnerName === m.settings.teamA.name
                            ? m.settings.teamA
                            : winnerName === m.settings.teamB.name ? m.settings.teamB : null;
                        // We need the tournament team id (different from match's team id) — look it up by name in the tournament
                        try {
                            const t = JSON.parse(localStorage.getItem("cricpadder.tournaments.v1") || "[]")
                                .find((tt) => tt.id === m.settings.tournamentId);
                            const tWinner = t?.teams.find((tt) => winnerSettingsTeam && tt.name === winnerSettingsTeam.name);
                            recordFixtureResult(m.settings.tournamentId, m.settings.fixtureId, m.id, tWinner?.id ?? null);
                        }
                        catch { /* ignore */ }
                    }
                    setShowResult(true);
                }
                return;
            }
            persist(m);
            if (opts.isWicket) {
                setTimeout(() => setPickerOpen("newbatsman"), 50);
            }
            else if (res.overComplete) {
                setTimeout(() => setPickerOpen("bowler"), 50);
            }
        }
        catch (e) {
            toast({ title: e.message, variant: "destructive" });
        }
    };
    const undo = () => {
        if (innings.balls.length === 0) {
            toast({ title: "Nothing to undo" });
            return;
        }
        const m = structuredClone(match);
        const inn = m[inningsKey];
        const removed = inn.balls.pop();
        const keptBalls = inn.balls.slice();
        inn.runs = 0;
        inn.wickets = 0;
        inn.legalBalls = 0;
        inn.extras = { wides: 0, noballs: 0, byes: 0, legbyes: 0 };
        inn.batsmen = {};
        inn.bowlers = {};
        inn.battingOrder = [];
        inn.bowlingOrder = [];
        inn.balls = [];
        inn.finished = false;
        if (keptBalls.length > 0) {
            const first = keptBalls[0];
            inn.strikerId = first.batsmanId;
            const otherEarly = keptBalls.find((b) => b.batsmanId !== first.batsmanId);
            inn.nonStrikerId = otherEarly?.batsmanId ?? null;
            inn.currentBowlerId = first.bowlerId;
            ensureBatsman(inn, first.batsmanId);
            if (inn.nonStrikerId)
                ensureBatsman(inn, inn.nonStrikerId);
            ensureBowler(inn, first.bowlerId);
        }
        for (const b of keptBalls) {
            if (inn.strikerId !== b.batsmanId) {
                ensureBatsman(inn, b.batsmanId);
                inn.strikerId = b.batsmanId;
            }
            if (inn.currentBowlerId !== b.bowlerId) {
                ensureBowler(inn, b.bowlerId);
                inn.currentBowlerId = b.bowlerId;
            }
            try {
                applyBall(m, inningsKey, {
                    runs: b.extra === "wide" ? b.runs - 1 : b.extra === "noball" ? b.runs - 1 : b.runs,
                    extra: b.extra,
                    isWicket: b.isWicket,
                    dismissal: b.dismissal,
                    outBatsmanId: b.outBatsmanId,
                });
            }
            catch { /* ignore replay quirks */ }
        }
        persist(m);
        toast({ title: "Undid last ball" });
    };
    const setStriker = (pid) => {
        const m = structuredClone(match);
        const inn = m[inningsKey];
        ensureBatsman(inn, pid);
        inn.strikerId = pid;
        persist(m);
    };
    const setNonStriker = (pid) => {
        const m = structuredClone(match);
        const inn = m[inningsKey];
        ensureBatsman(inn, pid);
        inn.nonStrikerId = pid;
        persist(m);
    };
    const setNewBatsman = (pid) => {
        const m = structuredClone(match);
        const inn = m[inningsKey];
        ensureBatsman(inn, pid);
        if (!inn.strikerId)
            inn.strikerId = pid;
        else if (!inn.nonStrikerId)
            inn.nonStrikerId = pid;
        persist(m);
    };
    const setBowler = (pid) => {
        const m = structuredClone(match);
        const inn = m[inningsKey];
        ensureBowler(inn, pid);
        inn.currentBowlerId = pid;
        persist(m);
    };
    const overs = innings.legalBalls / 6;
    const crr = overs > 0 ? (innings.runs / overs).toFixed(2) : "0.00";
    const rrr = runsNeeded !== null && ballsLeft > 0 ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : "—";
    const currentOverBalls = innings.balls.filter((b) => {
        const lastLegalIdx = innings.legalBalls;
        const startBall = Math.floor((lastLegalIdx === 0 ? 0 : lastLegalIdx - 1) / 6) * 6;
        return b.isLegal ? (innings.legalBalls - 1) >= startBall : true;
    }).slice(-8);
    const usedBatsmen = Object.keys(innings.batsmen).filter((pid) => innings.batsmen[pid].out);
    const liveBatsmen = [innings.strikerId, innings.nonStrikerId].filter(Boolean);
    const newBatsmanExclude = [...usedBatsmen, ...liveBatsmen];
    return (<div className="min-h-screen flex flex-col -mx-4 -my-4 md:-mx-0 md:-my-0">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border/60 px-4 py-3 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/"><ArrowLeft className="w-5 h-5"/></Link></Button>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground truncate">{bowlingTeam.name} bowling</div>
          <div className="font-bold truncate">{battingTeam.name} batting · Innings {match.currentInnings}</div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/scorecard/${match.id}`}><ListChecks className="w-4 h-4"/> Card</Link>
        </Button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 max-w-3xl mx-auto w-full">
        <div className="relative">
        <Card className="p-5 bg-gradient-scoreboard border-primary/30 shadow-elevated relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl"/>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{battingTeam.name}</div>
              <div className="font-mono-score text-5xl md:text-6xl font-extrabold text-gradient-primary leading-none">
                {innings.runs}<span className="text-foreground/70">/{innings.wickets}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Overs <span className="font-mono-score text-foreground">{formatOvers(innings.legalBalls)}</span> / {match.settings.totalOvers}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground space-y-1">
              <div>CRR <span className="font-mono-score text-foreground text-sm">{crr}</span></div>
              {target !== null && <div>Target <span className="font-mono-score text-primary text-sm">{target}</span></div>}
              {target !== null && <div>RRR <span className="font-mono-score text-accent text-sm">{rrr}</span></div>}
            </div>
          </div>
          {target !== null && innings.runs < target && !innings.finished && (<div className="mt-3 text-sm text-foreground/90">
              Need <b className="text-primary">{runsNeeded}</b> from <b>{ballsLeft}</b> ball{ballsLeft !== 1 ? "s" : ""}
            </div>)}
        </Card>
          <EventBanner kind={banner?.kind ?? null} subtitle={banner?.subtitle} onDone={() => setBanner(null)}/>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <BatsmanCard label="Striker" player={striker} stats={striker ? innings.batsmen[striker.id] : undefined} onClick={() => setPickerOpen("striker")} highlight/>
          <BatsmanCard label="Non-striker" player={nonStriker} stats={nonStriker ? innings.batsmen[nonStriker.id] : undefined} onClick={() => setPickerOpen("nonstriker")}/>
        </div>

        <BowlerCard label="Bowler" player={bowler} stats={bowler ? innings.bowlers[bowler.id] : undefined} onClick={() => setPickerOpen("bowler")}/>

        <Card className="p-3 bg-gradient-card border-border/60">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>This over</span>
            <span className="ml-auto">Legal balls: {innings.legalBalls % 6}/6</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {currentOverBalls.length === 0 && <span className="text-muted-foreground text-sm">—</span>}
            {currentOverBalls.map((b) => <BallChip key={b.id} ball={b}/>)}
          </div>
        </Card>

        <Card className="p-3 bg-gradient-card border-border/60">
          <div className="text-xs text-muted-foreground mb-2">Mark next ball as</div>
          <div className="grid grid-cols-4 gap-2">
            {["wide", "noball", "bye", "legbye"].map((e) => (<button key={e} onClick={() => setPendingExtra(pendingExtra === e ? null : e)} className={`px-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${pendingExtra === e ? "border-accent bg-accent/15 text-accent shadow-neon-accent" : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"}`}>
                {e === "noball" ? "No ball" : e === "legbye" ? "Leg bye" : e}
              </button>))}
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((n) => (<RunButton key={n} runs={n} onClick={() => score(n)}/>))}
          <RunButton runs={4} variant="boundary" onClick={() => score(4)}/>
          <RunButton runs={6} variant="six" onClick={() => score(6)}/>
          <button onClick={undo} className="rounded-xl border border-border bg-secondary/60 hover:bg-secondary text-sm font-semibold py-3">
            Undo
          </button>
          <button onClick={() => {
            if (needSetup) {
                toast({ title: "Set players first", variant: "destructive" });
                return;
            }
            setPendingRunsForWicket(0);
            setWicketOpen(true);
        }} className="rounded-xl bg-destructive text-destructive-foreground font-bold py-3 shadow-neon" style={{ boxShadow: "0 0 20px hsl(var(--destructive) / 0.4)" }}>
            OUT
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Tap an extra (Wide / No ball / Bye / Leg bye) then a number to record runs on that ball.
        </p>

        <MatchCharts match={match} teamColorOf={buildTeamColorLookup(match)} focusInnings={match.currentInnings} playerNameOf={(pid) => playerById(pid)?.name ?? "—"}/>
      </div>

      <PlayerPickerDialog open={pickerOpen === "striker"} title="Select striker" players={battingTeam.players} excludeIds={[innings.nonStrikerId, ...Object.keys(innings.batsmen).filter(pid => innings.batsmen[pid].out)].filter(Boolean)} onSelect={(pid) => { setStriker(pid); setPickerOpen(null); }} allowClose={!!striker} onClose={() => setPickerOpen(null)}/>
      <PlayerPickerDialog open={pickerOpen === "nonstriker"} title="Select non-striker" players={battingTeam.players} excludeIds={[innings.strikerId, ...Object.keys(innings.batsmen).filter(pid => innings.batsmen[pid].out)].filter(Boolean)} onSelect={(pid) => { setNonStriker(pid); setPickerOpen(null); }} allowClose={!!nonStriker} onClose={() => setPickerOpen(null)}/>
      <PlayerPickerDialog open={pickerOpen === "newbatsman"} title="New batsman" description="Previous batsman is out — pick the next one in." players={battingTeam.players} excludeIds={newBatsmanExclude} onSelect={(pid) => { setNewBatsman(pid); setPickerOpen(null); }}/>
      <PlayerPickerDialog open={pickerOpen === "bowler"} title="Select bowler" description="Pick the bowler for the next over." players={bowlingTeam.players} onSelect={(pid) => { setBowler(pid); setPickerOpen(null); }} allowClose={!!bowler} onClose={() => setPickerOpen(null)}/>

      <WicketDialog open={wicketOpen} onClose={() => setWicketOpen(false)} striker={striker} nonStriker={nonStriker} fielders={bowlingTeam.players} bowlerId={bowler?.id} runs={pendingRunsForWicket} onConfirm={({ dismissal, outBatsmanId, fielderId }) => {
            setWicketOpen(false);
            score(pendingRunsForWicket, { isWicket: true, dismissal, outBatsmanId, fielderId });
        }}/>



      {showResult && match.status === "completed" && (<div className="fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="max-w-sm w-full p-6 bg-gradient-card border-primary/40 shadow-elevated text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-primary grid place-items-center shadow-neon mb-3">
              <Trophy className="w-7 h-7 text-primary-foreground"/>
            </div>
            <h3 className="text-lg font-extrabold">Match Over</h3>
            <p className="text-primary font-bold mt-2">{match.result}</p>
            <div className="flex gap-2 mt-5">
              <Button asChild variant="outline" className="flex-1"><Link to="/">Home</Link></Button>
              <Button asChild className="flex-1 bg-gradient-primary text-primary-foreground"><Link to={`/scorecard/${match.id}`}>Full scorecard</Link></Button>
            </div>
          </Card>
        </div>)}
    </div>);
};
const BatsmanCard = ({ label, player, stats, onClick, highlight }) => (<button onClick={onClick} className={`text-left rounded-xl p-3 border transition-colors ${highlight ? "border-primary/50 bg-primary/5" : "border-border bg-gradient-card"}`}>
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="font-bold truncate flex items-center gap-1">
      {player?.name || "Tap to select"}
      {highlight && player && <span className="text-primary">*</span>}
    </div>
    {stats && (<div className="text-xs text-muted-foreground font-mono-score mt-0.5">
        {stats.runs} ({stats.balls}) · 4s {stats.fours} · 6s {stats.sixes} · SR {strikeRate(stats.runs, stats.balls)}
      </div>)}
  </button>);
const BowlerCard = ({ label, player, stats, onClick }) => (<button onClick={onClick} className="w-full text-left rounded-xl p-3 border border-border bg-gradient-card">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="font-bold truncate">{player?.name || "Tap to select"}</div>
    {stats && (<div className="text-xs text-muted-foreground font-mono-score mt-0.5">
        {formatOvers(stats.ballsBowled)} ov · {stats.runsConceded} runs · {stats.wickets} wkt · {stats.maidens} M
      </div>)}
  </button>);
const RunButton = ({ runs, variant, onClick }) => {
    const base = "rounded-xl py-4 text-2xl font-extrabold font-mono-score shadow-card-soft transition-transform active:scale-95";
    const cls = variant === "boundary"
        ? "bg-success text-success-foreground"
        : variant === "six"
            ? "bg-cricket-six text-primary-foreground"
            : runs === 0
                ? "bg-secondary text-foreground"
                : "bg-card hover:bg-secondary border border-border text-foreground";
    return <button onClick={onClick} className={`${base} ${cls}`}>{runs}</button>;
};
const BallChip = ({ ball }) => {
    let label = String(ball.runs);
    let cls = "bg-secondary text-foreground";
    if (ball.extra === "wide") {
        label = `Wd${ball.runs > 1 ? "+" + (ball.runs - 1) : ""}`;
        cls = "bg-accent/20 text-accent";
    }
    else if (ball.extra === "noball") {
        label = `Nb${ball.runs > 1 ? "+" + (ball.runs - 1) : ""}`;
        cls = "bg-accent/20 text-accent";
    }
    else if (ball.extra === "bye") {
        label = `B${ball.runs}`;
        cls = "bg-secondary text-muted-foreground";
    }
    else if (ball.extra === "legbye") {
        label = `Lb${ball.runs}`;
        cls = "bg-secondary text-muted-foreground";
    }
    else if (ball.runs === 4)
        cls = "bg-success text-success-foreground";
    else if (ball.runs === 6)
        cls = "bg-cricket-six text-primary-foreground";
    else if (ball.runs === 0)
        cls = "bg-secondary text-muted-foreground";
    if (ball.isWicket) {
        cls = "bg-destructive text-destructive-foreground";
        label = "W";
    }
    return (<span className={`min-w-9 h-9 px-2 rounded-full grid place-items-center text-xs font-bold animate-ball-pop ${cls}`}>
      {label}
    </span>);
};
export default ScoringPage;
