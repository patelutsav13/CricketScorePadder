import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMatch } from "@/lib/cricket/storage";
import { economy, formatDismissal, formatOvers, strikeRate } from "@/lib/cricket/engine";
import { ArrowLeft, Trophy } from "lucide-react";
import MatchCharts from "@/components/cricket/MatchCharts";
import { buildTeamColorLookup } from "@/lib/cricket/teamColors";
const ScorecardPage = () => {
    const { id } = useParams();
    const [match, setMatch] = useState(null);
    useEffect(() => { if (id)
        setMatch(getMatch(id) ?? null); }, [id]);
    if (!match) {
        return (<div className="text-center py-12">
        <p className="text-muted-foreground">Match not found.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/">Go home</Link></Button>
      </div>);
    }
    const playerById = (pid) => [...match.settings.teamA.players, ...match.settings.teamB.players].find((p) => p.id === pid)?.name ?? "—";
    const teamName = (id) => id === match.settings.teamA.id ? match.settings.teamA.name : match.settings.teamB.name;
    return (<div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/"><ArrowLeft className="w-5 h-5"/></Link></Button>
        <h1 className="text-xl font-extrabold">Scorecard</h1>
        {match.status === "in_progress" && (<Button asChild size="sm" className="ml-auto bg-gradient-primary text-primary-foreground">
            <Link to={`/match/${match.id}`}>Resume scoring</Link>
          </Button>)}
      </div>

      {match.result && (<Card className="p-4 bg-gradient-card border-primary/40 shadow-card-soft flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary"/>
          <div>
            <div className="text-xs text-muted-foreground">Result</div>
            <div className="font-bold text-primary">{match.result}</div>
          </div>
        </Card>)}

      <Tabs defaultValue="i1">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="i1">Innings 1 — {teamName(match.innings1.battingTeamId)}</TabsTrigger>
          <TabsTrigger value="i2" disabled={!match.innings2}>
            Innings 2 — {match.innings2 ? teamName(match.innings2.battingTeamId) : "—"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="i1" className="space-y-3">
          <InningsView innings={match.innings1} totalOvers={match.settings.totalOvers} playerById={playerById}/>
        </TabsContent>
        {match.innings2 && (<TabsContent value="i2" className="space-y-3">
            <InningsView innings={match.innings2} totalOvers={match.settings.totalOvers} playerById={playerById} target={match.innings1.runs + 1}/>
          </TabsContent>)}
      </Tabs>

      <MatchCharts match={match} teamColorOf={buildTeamColorLookup(match)} playerNameOf={playerById}/>
    </div>);
};
const InningsView = ({ innings, totalOvers, playerById, target, }) => {
    const battingList = innings.battingOrder.map((pid) => innings.batsmen[pid]);
    const bowlingList = innings.bowlingOrder.map((pid) => innings.bowlers[pid]);
    const totalExtras = innings.extras.wides + innings.extras.noballs + innings.extras.byes + innings.extras.legbyes;
    return (<>
      <Card className="p-4 bg-gradient-scoreboard border-border/60 shadow-card-soft">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-widest">Total</div>
            <div className="font-mono-score text-4xl font-extrabold text-gradient-primary">
              {innings.runs}/{innings.wickets}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatOvers(innings.legalBalls)} / {totalOvers} overs
            </div>
          </div>
          {target !== undefined && (<div className="text-right text-xs text-muted-foreground">
              <div>Target <span className="font-mono-score text-primary">{target}</span></div>
            </div>)}
        </div>
      </Card>

      <Card className="bg-gradient-card border-border/60 shadow-card-soft overflow-hidden">
        <div className="p-3 font-bold border-b border-border/60">Batting</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batsman</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right">B</TableHead>
              <TableHead className="text-right hidden sm:table-cell">4s</TableHead>
              <TableHead className="text-right hidden sm:table-cell">6s</TableHead>
              <TableHead className="text-right">SR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {battingList.map((b) => (<TableRow key={b.playerId}>
                <TableCell>
                  <div className="font-medium">{playerById(b.playerId)}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.out ? formatDismissal(innings, b.playerId, playerById) : "not out"}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono-score font-bold">{b.runs}</TableCell>
                <TableCell className="text-right font-mono-score">{b.balls}</TableCell>
                <TableCell className="text-right font-mono-score hidden sm:table-cell">{b.fours}</TableCell>
                <TableCell className="text-right font-mono-score hidden sm:table-cell">{b.sixes}</TableCell>
                <TableCell className="text-right font-mono-score">{strikeRate(b.runs, b.balls)}</TableCell>
              </TableRow>))}
            {battingList.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No balls bowled yet</TableCell></TableRow>}
          </TableBody>
        </Table>
        <div className="p-3 text-sm text-muted-foreground border-t border-border/60">
          Extras: <span className="text-foreground font-mono-score">{totalExtras}</span>{" "}
          (W {innings.extras.wides}, NB {innings.extras.noballs}, B {innings.extras.byes}, LB {innings.extras.legbyes})
        </div>
      </Card>

      <Card className="bg-gradient-card border-border/60 shadow-card-soft overflow-hidden">
        <div className="p-3 font-bold border-b border-border/60">Bowling</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bowler</TableHead>
              <TableHead className="text-right">O</TableHead>
              <TableHead className="text-right hidden sm:table-cell">M</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right">W</TableHead>
              <TableHead className="text-right">Econ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bowlingList.map((b) => (<TableRow key={b.playerId}>
                <TableCell className="font-medium">{playerById(b.playerId)}</TableCell>
                <TableCell className="text-right font-mono-score">{formatOvers(b.ballsBowled)}</TableCell>
                <TableCell className="text-right font-mono-score hidden sm:table-cell">{b.maidens}</TableCell>
                <TableCell className="text-right font-mono-score">{b.runsConceded}</TableCell>
                <TableCell className="text-right font-mono-score font-bold">{b.wickets}</TableCell>
                <TableCell className="text-right font-mono-score">{economy(b)}</TableCell>
              </TableRow>))}
            {bowlingList.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No balls bowled yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </>);
};
export default ScorecardPage;
