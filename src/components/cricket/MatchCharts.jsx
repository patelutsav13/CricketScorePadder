import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, } from "recharts";
import { Card } from "@/components/ui/card";
import { Activity, Users } from "lucide-react";
const fallbackColors = ["210 95% 55%", "0 84% 60%"];
/** Convert innings ball-by-ball into cumulative runs per over (worm graph). */
const buildWorm = (innings) => {
    if (!innings)
        return [];
    const points = [
        { over: 0, runs: 0, wickets: 0 },
    ];
    let runs = 0;
    let wkts = 0;
    let legal = 0;
    for (const b of innings.balls) {
        runs += b.runs;
        if (b.isWicket)
            wkts += 1;
        if (b.isLegal) {
            legal += 1;
            if (legal % 6 === 0) {
                points.push({ over: legal / 6, runs, wickets: wkts });
            }
        }
    }
    // Add trailing partial over if any
    const lastOver = legal / 6;
    if (lastOver !== Math.floor(lastOver)) {
        points.push({ over: Number(lastOver.toFixed(2)), runs, wickets: wkts });
    }
    return points;
};
/** Build per-over runs (bar chart, useful for "over by over" view). */
const buildOverByOver = (innings) => {
    if (!innings)
        return [];
    const map = new Map();
    let legal = 0;
    for (const b of innings.balls) {
        const overIdx = Math.floor((legal) / 6); // current over being bowled (0-indexed)
        const cur = map.get(overIdx) ?? { runs: 0, wickets: 0 };
        cur.runs += b.runs;
        if (b.isWicket)
            cur.wickets += 1;
        map.set(overIdx, cur);
        if (b.isLegal)
            legal += 1;
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a - b)
        .map(([over, v]) => ({ over: over + 1, runs: v.runs, wickets: v.wickets }));
};
/** Build batting partnerships from innings.balls. A partnership runs from the entry of a new batsman pair until a wicket. */
const buildPartnerships = (innings) => {
    if (!innings)
        return [];
    const partnerships = [];
    // Track who is at the crease right now: derive from order of appearance & wickets.
    let atCrease = [];
    const seen = new Set();
    const startPartnership = () => {
        if (atCrease.length === 2) {
            const [a, b] = [...atCrease].sort();
            partnerships.push({
                key: `${a}|${b}|${partnerships.length}`,
                p1Id: atCrease[0],
                p2Id: atCrease[1],
                runs: 0,
                balls: 0,
                p1Runs: 0,
                p1Balls: 0,
                p2Runs: 0,
                p2Balls: 0,
            });
        }
    };
    // Initialize: first two distinct batsmen from order
    for (const b of innings.balls) {
        if (!seen.has(b.batsmanId) && atCrease.length < 2) {
            atCrease.push(b.batsmanId);
            seen.add(b.batsmanId);
            if (atCrease.length === 2)
                startPartnership();
        }
        const cur = partnerships[partnerships.length - 1];
        if (cur) {
            const offBat = b.extra === "wide" || b.extra === "bye" || b.extra === "legbye"
                ? 0
                : b.extra === "noball"
                    ? Math.max(0, b.runs - 1)
                    : b.runs;
            cur.runs += b.runs; // total partnership runs include all extras while pair is together
            if (b.isLegal)
                cur.balls += 1;
            if (b.batsmanId === cur.p1Id) {
                cur.p1Runs += offBat;
                if (b.extra !== "wide")
                    cur.p1Balls += 1;
            }
            else if (b.batsmanId === cur.p2Id) {
                cur.p2Runs += offBat;
                if (b.extra !== "wide")
                    cur.p2Balls += 1;
            }
        }
        if (b.isWicket) {
            const outId = b.outBatsmanId || b.batsmanId;
            atCrease = atCrease.filter((id) => id !== outId);
            // wait for next batsman — they'll appear as a new batsmanId in subsequent balls
        }
    }
    return partnerships;
};
export const MatchCharts = ({ match, teamColorOf, focusInnings, playerNameOf }) => {
    const i1 = match.innings1;
    const i2 = match.innings2;
    const i1Color = teamColorOf?.(i1.battingTeamId) ?? fallbackColors[0];
    const i2Color = i2 ? (teamColorOf?.(i2.battingTeamId) ?? fallbackColors[1]) : fallbackColors[1];
    const i1Name = i1.battingTeamId === match.settings.teamA.id ? match.settings.teamA.name : match.settings.teamB.name;
    const i2Name = i2
        ? (i2.battingTeamId === match.settings.teamA.id ? match.settings.teamA.name : match.settings.teamB.name)
        : "";
    const wormData = useMemo(() => {
        const d1 = buildWorm(i1);
        const d2 = buildWorm(i2);
        const maxLen = Math.max(d1.length, d2.length);
        const merged = [];
        for (let i = 0; i < maxLen; i++) {
            const over = (d1[i]?.over ?? d2[i]?.over);
            merged.push({ over, i1: d1[i]?.runs, i2: d2[i]?.runs });
        }
        return merged;
    }, [i1, i2]);
    const focus = focusInnings ?? (i2 && i2.balls.length > 0 ? 2 : 1);
    const focusInn = focus === 2 && i2 ? i2 : i1;
    const focusName = focus === 2 ? i2Name : i1Name;
    const focusColor = focus === 2 ? i2Color : i1Color;
    const overByOver = useMemo(() => buildOverByOver(focusInn), [focusInn]);
    const partnerships = useMemo(() => buildPartnerships(focusInn), [focusInn]);
    const maxPs = Math.max(1, ...partnerships.map((p) => p.runs));
    const targetLine = focus === 2 ? i1.runs : null;
    return (<div className="space-y-3">
      {/* Worm graph */}
      <Card className="p-4 bg-gradient-card border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary"/>
          <div className="font-bold">Worm graph</div>
          <div className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">Scoring comparison</div>
        </div>
        <div className="flex items-center gap-4 text-xs mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: `hsl(${i1Color})` }}/>
            {i1Name}
          </span>
          {i2 && (<span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: `hsl(${i2Color})` }}/>
              {i2Name}
            </span>)}
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <LineChart data={wormData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false}/>
              <XAxis dataKey="over" type="number" domain={[0, match.settings.totalOvers]} tickCount={Math.min(match.settings.totalOvers + 1, 11)} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} label={{ value: "overs", position: "insideBottom", offset: -2, fill: "hsl(var(--muted-foreground))", fontSize: 10 }}/>
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} width={36}/>
              <Tooltip contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
        }} labelFormatter={(v) => `Over ${v}`} formatter={(value, name) => {
            const label = name === "i1" ? i1Name : i2Name;
            return [value, label];
        }}/>
              {targetLine !== null && (<ReferenceLine y={targetLine} stroke={`hsl(${i1Color})`} strokeDasharray="3 3" strokeOpacity={0.5}/>)}
              <Line type="monotone" dataKey="i1" stroke={`hsl(${i1Color})`} strokeWidth={2.5} dot={{ r: 3, fill: `hsl(${i1Color})` }} activeDot={{ r: 5 }} connectNulls isAnimationActive/>
              {i2 && (<Line type="monotone" dataKey="i2" stroke={`hsl(${i2Color})`} strokeWidth={2.5} dot={{ r: 3, fill: `hsl(${i2Color})` }} activeDot={{ r: 5 }} connectNulls isAnimationActive/>)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Over-by-over bar chart for focused innings */}
      <Card className="p-4 bg-gradient-card border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-accent"/>
          <div className="font-bold">Over by over · {focusName}</div>
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer>
            <BarChart data={overByOver} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false}/>
              <XAxis dataKey="over" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }}/>
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} width={32}/>
              <Tooltip contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
        }} labelFormatter={(v) => `Over ${v}`} formatter={(value, _name, ctx) => {
            const w = ctx?.payload?.wickets ?? 0;
            return [`${value} run${value === 1 ? "" : "s"}${w ? ` · ${w} wkt` : ""}`, "Runs"];
        }}/>
              <Bar dataKey="runs" fill={`hsl(${focusColor})`} radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Partnerships */}
      <Card className="p-4 bg-gradient-card border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary"/>
          <div className="font-bold">Partnerships · {focusName}</div>
        </div>
        {partnerships.length === 0 && (<div className="text-sm text-muted-foreground">No partnerships yet.</div>)}
        <div className="space-y-3">
          {partnerships.map((p) => {
            const total = Math.max(1, p.p1Runs + p.p2Runs);
            const p1Pct = (p.p1Runs / total) * 100;
            const p2Pct = (p.p2Runs / total) * 100;
            const widthPct = (p.runs / maxPs) * 100;
            return (<div key={p.key}>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-xs items-center">
                  <div className="truncate">
                    <div className="font-bold truncate">{playerNameOf(p.p1Id)}</div>
                    <div className="font-mono-score text-muted-foreground">{p.p1Runs} ({p.p1Balls})</div>
                  </div>
                  <div className="font-mono-score font-bold text-sm">
                    {p.runs} <span className="text-muted-foreground font-normal">({p.balls})</span>
                  </div>
                  <div className="truncate text-right">
                    <div className="font-bold truncate">{playerNameOf(p.p2Id)}</div>
                    <div className="font-mono-score text-muted-foreground">{p.p2Runs} ({p.p2Balls})</div>
                  </div>
                </div>
                <div className="mt-1.5 h-2 rounded-full overflow-hidden bg-muted/40 mx-auto" style={{ width: `${Math.max(20, widthPct)}%` }}>
                  <div className="h-full flex">
                    <div style={{ width: `${p1Pct}%`, background: `hsl(${focusColor})` }} className="transition-all"/>
                    <div style={{ width: `${p2Pct}%`, background: `hsl(${focusColor} / 0.45)` }} className="transition-all"/>
                  </div>
                </div>
              </div>);
        })}
        </div>
      </Card>
    </div>);
};
export default MatchCharts;
