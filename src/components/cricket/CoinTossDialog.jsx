import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Trophy } from "lucide-react";
export const CoinTossDialog = ({ open, onOpenChange, teamA, teamB, onConfirm }) => {
    const [phase, setPhase] = useState("idle");
    const [winnerId, setWinnerId] = useState(null);
    useEffect(() => {
        if (!open) {
            setPhase("idle");
            setWinnerId(null);
        }
    }, [open]);
    const flip = () => {
        const winner = Math.random() < 0.5 ? teamA.id : teamB.id;
        setWinnerId(winner);
        setPhase("flipping");
        setTimeout(() => {
            setPhase("revealed");
            setTimeout(() => setPhase("decide"), 700);
        }, 1900);
    };
    const winner = winnerId === teamA.id ? teamA : winnerId === teamB.id ? teamB : null;
    const sideUp = winnerId === teamA.id ? "A" : winnerId === teamB.id ? "B" : null;
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary"/> Toss Time
          </DialogTitle>
        </DialogHeader>

        <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          {teamA.shortName} <span className="mx-1 text-foreground font-bold">vs</span> {teamB.shortName}
        </div>

        {/* Coin */}
        <div className="my-4 grid place-items-center" style={{ perspective: "1000px" }}>
          <div className={`coin-3d ${phase === "flipping" ? "is-flipping" : ""} ${phase === "revealed" || phase === "decide"
            ? sideUp === "B"
                ? "show-b"
                : "show-a"
            : ""}`} onClick={() => phase === "idle" && flip()} role="button" aria-label="Flip the coin">
            <div className="coin-face coin-face-a" style={teamA.color ? {
            background: `radial-gradient(circle at 30% 30%, hsl(${teamA.color} / 0.95), hsl(${teamA.color}) 60%, hsl(${teamA.color} / 0.6))`,
            color: "hsl(0 0% 100%)",
            borderColor: `hsl(${teamA.color} / 0.8)`,
        } : undefined}>
              <span>{teamA.shortName}</span>
            </div>
            <div className="coin-face coin-face-b" style={teamB.color ? {
            background: `radial-gradient(circle at 30% 30%, hsl(${teamB.color} / 0.95), hsl(${teamB.color}) 60%, hsl(${teamB.color} / 0.6))`,
            color: "hsl(0 0% 100%)",
            borderColor: `hsl(${teamB.color} / 0.8)`,
            transform: "rotateY(180deg)",
        } : undefined}>
              <span>{teamB.shortName}</span>
            </div>
          </div>
        </div>

        {phase === "idle" && (<Button onClick={flip} size="lg" className="w-full bg-gradient-primary text-primary-foreground shadow-neon hover:opacity-90">
            <Coins className="w-4 h-4"/> Flip the coin
          </Button>)}

        {(phase === "revealed" || phase === "decide") && winner && (<div className="space-y-3">
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Toss won by</div>
              <div className="text-2xl font-black text-gradient-primary flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-primary"/> {winner.name}
              </div>
            </div>

            {phase === "decide" && (<>
                <div className="text-center text-sm text-muted-foreground">Choose to…</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="lg" onClick={() => onConfirm({ winnerId: winner.id, decision: "bat" })} className="bg-gradient-primary text-primary-foreground">
                    🏏 Bat first
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => onConfirm({ winnerId: winner.id, decision: "bowl" })}>
                    🎯 Bowl first
                  </Button>
                </div>
              </>)}
          </div>)}
      </DialogContent>
    </Dialog>);
};
