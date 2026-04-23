import { Trophy } from "lucide-react";
import { TeamBadge, teamAccent } from "./TeamBadge";
/** IPL-broadcast style points table: colored row tints, badges, big numbers. */
export const PointsTable = ({ standings, shortNameOf, colorOf, qualifyTop = 4 }) => {
    return (<div className="rounded-xl overflow-hidden border border-border/60 bg-gradient-scoreboard shadow-elevated">
      {/* Header strip */}
      <div className="bg-gradient-primary text-primary-foreground px-4 py-3 flex items-center gap-2">
        <Trophy className="w-5 h-5"/>
        <div className="font-black tracking-wide uppercase text-sm md:text-base">Points Table</div>
        <div className="ml-auto text-[10px] md:text-xs font-bold opacity-80 uppercase tracking-widest">Live</div>
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[28px_1fr_36px_36px_36px_36px_44px_64px] md:grid-cols-[36px_1fr_44px_44px_44px_44px_56px_80px] gap-2 px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/60">
        <div>#</div>
        <div>Team</div>
        <div className="text-right">P</div>
        <div className="text-right">W</div>
        <div className="text-right">L</div>
        <div className="text-right">T</div>
        <div className="text-right">Pts</div>
        <div className="text-right">NRR</div>
      </div>

      <div>
        {standings.map((s, i) => {
            const sn = shortNameOf(s.teamId);
            const userColor = colorOf?.(s.teamId);
            const accent = userColor
                ? {
                    rowBg: `hsl(${userColor} / 0.55)`,
                    rowBgSoft: `hsl(${userColor} / 0.18)`,
                    border: `hsl(${userColor})`,
                }
                : teamAccent(sn.toUpperCase());
            const qualified = i < qualifyTop;
            return (<div key={s.teamId} className="grid grid-cols-[28px_1fr_36px_36px_36px_36px_44px_64px] md:grid-cols-[36px_1fr_44px_44px_44px_44px_56px_80px] gap-2 items-center px-3 md:px-4 py-2.5 border-b border-border/40 last:border-b-0 transition-colors hover:brightness-110 relative" style={{
                    background: qualified
                        ? `linear-gradient(90deg, ${accent.rowBg} 0%, ${accent.rowBgSoft} 70%, transparent 100%)`
                        : `linear-gradient(90deg, ${accent.rowBgSoft} 0%, transparent 60%)`,
                }}>
              {/* Left color bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent.border }} aria-hidden/>
              <div className="font-mono-score font-black text-sm md:text-base text-foreground">{i + 1}</div>
              <div className="flex items-center gap-2 min-w-0">
                <TeamBadge shortName={sn} size="sm"/>
                <div className="min-w-0">
                  <div className="font-extrabold truncate text-sm md:text-base leading-tight">{s.teamName}</div>
                  {qualified && (<div className="text-[9px] md:text-[10px] font-bold tracking-widest text-primary uppercase">
                      Qualified
                    </div>)}
                </div>
              </div>
              <div className="text-right font-mono-score text-sm">{s.played}</div>
              <div className="text-right font-mono-score text-sm text-success">{s.won}</div>
              <div className="text-right font-mono-score text-sm text-destructive/90">{s.lost}</div>
              <div className="text-right font-mono-score text-sm">{s.tied}</div>
              <div className="text-right font-mono-score font-black text-base md:text-lg text-primary">{s.points}</div>
              <div className={`text-right font-mono-score font-bold text-sm ${s.nrr >= 0 ? "text-success" : "text-destructive"}`}>
                {s.nrr > 0 ? "+" : ""}
                {s.nrr.toFixed(3)}
              </div>
            </div>);
        })}
      </div>
    </div>);
};
