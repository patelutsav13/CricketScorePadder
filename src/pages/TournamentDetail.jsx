import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Crown, ListChecks, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTournament, computeStandings, recordFixtureResult, resetTournament, upsertTournament, } from "@/lib/cricket/tournament";
import { createMatch, createPlayer, uid } from "@/lib/cricket/engine";
import { setActiveMatchId, upsertMatch, getMatch } from "@/lib/cricket/storage";
import { PointsTable } from "@/components/cricket/PointsTable";
import { TeamBadge } from "@/components/cricket/TeamBadge";
import { CoinTossDialog } from "@/components/cricket/CoinTossDialog";
const TournamentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [t, setT] = useState(null);
    const [tossFor, setTossFor] = useState(null);
    const refresh = () => {
        if (!id)
            return;
        const x = getTournament(id);
        if (!x) {
            navigate("/tournaments");
            return;
        }
        // Auto-sync any fixture matches whose result has been computed since last visit
        let mutated = false;
        for (const f of x.fixtures) {
            if (f.matchId) {
                const m = getMatch(f.matchId);
                if (m && m.status === "completed" && (!f.played || !f.winnerTeamId)) {
                    // determine winner by team name
                    const winnerTeamName = m.result?.split(" won by ")[0];
                    const winTeam = x.teams.find((tt) => tt.name === winnerTeamName);
                    f.played = true;
                    f.winnerTeamId = winTeam?.id ?? null;
                    mutated = true;
                }
            }
        }
        if (mutated) {
            upsertTournament(x);
            // also seed knockouts via recordFixtureResult side effect
            for (const f of x.fixtures.filter((ff) => ff.played)) {
                recordFixtureResult(x.id, f.id, f.matchId, f.winnerTeamId ?? null);
            }
        }
        setT(getTournament(id) ?? null);
    };
    useEffect(() => { refresh(); }, [id]);
    if (!t)
        return null;
    const standings = computeStandings(t);
    const teamName = (tid) => t.teams.find((x) => x.id === tid)?.name ?? "TBD";
    const teamShort = (tid) => t.teams.find((x) => x.id === tid)?.shortName ?? "TBD";
    const teamColor = (tid) => t.teams.find((x) => x.id === tid)?.color;
    const shortNameOfStanding = (tid) => t.teams.find((x) => x.id === tid)?.shortName ?? tid.slice(0, 3).toUpperCase();
    const colorOfStanding = (tid) => t.teams.find((x) => x.id === tid)?.color;
    const requestPlay = (fix) => {
        if (!fix.teamAId || !fix.teamBId) {
            toast({ title: "Teams not seeded yet", description: "Finish the league stage first.", variant: "destructive" });
            return;
        }
        setTossFor(fix);
    };
    const startMatchAfterToss = (fix, tossWinnerSide, decision) => {
        const teamAData = t.teams.find((x) => x.id === fix.teamAId);
        const teamBData = t.teams.find((x) => x.id === fix.teamBId);
        const teamAId = uid();
        const teamBId = uid();
        const teamA = {
            id: teamAId,
            name: teamAData.name,
            players: teamAData.players.map((n) => createPlayer(n, teamAId)),
        };
        const teamB = {
            id: teamBId,
            name: teamBData.name,
            players: teamBData.players.map((n) => createPlayer(n, teamBId)),
        };
        const tossWinnerMatchId = tossWinnerSide === "A" ? teamAId : teamBId;
        const m = createMatch({
            totalOvers: t.oversPerInnings,
            teamA, teamB,
            tossWinnerId: tossWinnerMatchId,
            tossDecision: decision,
            venue: `${t.name} · ${fix.label}`,
            tournamentId: t.id,
            fixtureId: fix.id,
        }, null);
        upsertMatch(m);
        setActiveMatchId(m.id);
        fix.matchId = m.id;
        upsertTournament(t);
        setTossFor(null);
        navigate(`/match/${m.id}`);
    };
    const reset = () => {
        if (!confirm("Reset this tournament? All fixtures will be regenerated and standings cleared."))
            return;
        resetTournament(t.id);
        refresh();
        toast({ title: "Tournament reset" });
    };
    const champion = t.championTeamId ? t.teams.find((x) => x.id === t.championTeamId) : null;
    const leagueFixtures = t.fixtures.filter((f) => f.stage === "league");
    const knockouts = t.fixtures.filter((f) => f.stage !== "league");
    return (<div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/tournaments"><ArrowLeft className="w-5 h-5"/></Link></Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-extrabold truncate">{t.name}</h1>
          <p className="text-xs text-muted-foreground">{t.format} · {t.oversPerInnings} overs · {t.teams.length} teams · {leagueFixtures.length} league matches</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}><RefreshCw className="w-4 h-4"/> Reset</Button>
      </div>

      {champion && (<Card className="p-5 bg-gradient-scoreboard border-primary/40 shadow-elevated text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/15 blur-3xl"/>
          <Crown className="w-10 h-10 mx-auto text-primary"/>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">Champions</div>
          <div className="text-2xl md:text-3xl font-black text-gradient-primary">{champion.name}</div>
          <p className="text-sm text-muted-foreground mt-1">Tournament complete. Click <b>Reset</b> to play again.</p>
        </Card>)}

      <Tabs defaultValue="table">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="table">Points Table</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="knockouts">Playoffs</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <PointsTable standings={standings} shortNameOf={shortNameOfStanding} colorOf={colorOfStanding} qualifyTop={4}/>
          <p className="text-[11px] text-muted-foreground mt-2">Top 4 (highlighted) advance to Semi-Finals. Sorted by Points → NRR.</p>
        </TabsContent>

        <TabsContent value="fixtures">
          <div className="space-y-2">
            {leagueFixtures.map((f) => (<FixtureRow key={f.id} fix={f} teamName={teamName} teamShort={teamShort} onPlay={() => requestPlay(f)}/>))}
          </div>
        </TabsContent>

        <TabsContent value="knockouts">
          <div className="space-y-2">
            {knockouts.map((f) => (<FixtureRow key={f.id} fix={f} teamName={teamName} teamShort={teamShort} onPlay={() => requestPlay(f)} highlight/>))}
          </div>
        </TabsContent>
      </Tabs>

      {tossFor && tossFor.teamAId && tossFor.teamBId && (<CoinTossDialog open={!!tossFor} onOpenChange={(v) => !v && setTossFor(null)} teamA={{ id: "A", name: teamName(tossFor.teamAId), shortName: teamShort(tossFor.teamAId), color: teamColor(tossFor.teamAId) }} teamB={{ id: "B", name: teamName(tossFor.teamBId), shortName: teamShort(tossFor.teamBId), color: teamColor(tossFor.teamBId) }} onConfirm={({ winnerId, decision }) => startMatchAfterToss(tossFor, winnerId === "A" ? "A" : "B", decision)}/>)}
    </div>);
};
const FixtureRow = ({ fix, teamName, teamShort, onPlay, highlight }) => (<Card className={`p-3 flex items-center gap-3 bg-gradient-card border-border/60 ${highlight ? "border-primary/40 shadow-neon" : ""}`}>
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground w-16 md:w-20 shrink-0 font-bold">{fix.label}</div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 font-semibold truncate">
        {fix.teamAId && <TeamBadge shortName={teamShort(fix.teamAId)} size="sm"/>}
        <span className="truncate">{teamName(fix.teamAId)}</span>
        <span className="text-muted-foreground text-xs">vs</span>
        {fix.teamBId && <TeamBadge shortName={teamShort(fix.teamBId)} size="sm"/>}
        <span className="truncate">{teamName(fix.teamBId)}</span>
      </div>
      {fix.played && fix.winnerTeamId && (<div className="text-xs text-success font-semibold mt-0.5">🏆 Winner: {teamName(fix.winnerTeamId)}</div>)}
      {fix.played && !fix.winnerTeamId && (<div className="text-xs text-muted-foreground mt-0.5">Tied / No Result</div>)}
    </div>
    {fix.played ? (fix.matchId ? (<Button asChild size="sm" variant="outline"><Link to={`/scorecard/${fix.matchId}`}><ListChecks className="w-4 h-4"/> Card</Link></Button>) : null) : (<Button size="sm" onClick={onPlay} disabled={!fix.teamAId || !fix.teamBId} className="bg-gradient-primary text-primary-foreground">
        <Coins className="w-4 h-4"/> Toss & Play
      </Button>)}
  </Card>);
export default TournamentDetail;
