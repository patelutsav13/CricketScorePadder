import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
const dismissals = [
    { value: "bowled", label: "Bowled" },
    { value: "caught", label: "Caught" },
    { value: "lbw", label: "LBW" },
    { value: "runout", label: "Run out" },
    { value: "stumped", label: "Stumped" },
    { value: "hitwicket", label: "Hit wicket" },
];
const needsFielder = {
    caught: true,
    runout: true,
    stumped: true,
};
const WicketDialog = ({ open, onClose, striker, nonStriker, fielders, bowlerId, runs, onConfirm }) => {
    const [dismissal, setDismissal] = useState("bowled");
    const [outId, setOutId] = useState(striker?.id);
    const [fielderId, setFielderId] = useState(undefined);
    useEffect(() => {
        if (open) {
            setDismissal("bowled");
            setOutId(striker?.id);
            setFielderId(undefined);
        }
    }, [open, striker?.id]);
    const canChooseEither = dismissal === "runout";
    const candidates = [striker, nonStriker].filter(Boolean);
    // For caught/stumped, fielder cannot be the bowler (use "c & b" if it is — handled by passing bowlerId)
    const fielderOptions = fielders.filter((p) => (dismissal === "stumped" ? true : true));
    const requiresFielder = needsFielder[dismissal];
    return (<Dialog open={open} onOpenChange={(v) => { if (!v)
        onClose(); }}>
      <DialogContent className="bg-gradient-card border-border/60 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wicket!</DialogTitle>
          <p className="text-xs text-muted-foreground">Runs on this ball: {runs}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">How was the batsman out?</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {dismissals.map((d) => (<button key={d.value} onClick={() => {
                setDismissal(d.value);
                if (d.value !== "runout")
                    setOutId(striker?.id);
                setFielderId(undefined);
            }} className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${dismissal === d.value ? "border-primary bg-primary/15 text-foreground" : "border-border bg-secondary/40 text-muted-foreground"}`}>
                  {d.label}
                </button>))}
            </div>
          </div>

          {canChooseEither && (<div>
              <Label className="text-xs text-muted-foreground">Who got out?</Label>
              <RadioGroup value={outId} onValueChange={setOutId} className="grid grid-cols-2 gap-2 mt-2">
                {candidates.map((p) => (<Label key={p.id} htmlFor={`out-${p.id}`} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${outId === p.id ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}>
                    <RadioGroupItem value={p.id} id={`out-${p.id}`}/>
                    <span className="font-medium">{p.name}</span>
                  </Label>))}
              </RadioGroup>
            </div>)}

          {requiresFielder && (<div>
              <Label className="text-xs text-muted-foreground">
                {dismissal === "caught" ? "Caught by" : dismissal === "stumped" ? "Stumped by (keeper)" : "Run out by (fielder)"}
              </Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                {fielderOptions.map((p) => {
                const isBowler = p.id === bowlerId;
                const label = dismissal === "caught" && isBowler ? `${p.name} (c & b)` : p.name;
                return (<button key={p.id} onClick={() => setFielderId(p.id)} className={`px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors ${fielderId === p.id ? "border-primary bg-primary/15 text-foreground" : "border-border bg-secondary/40 text-muted-foreground"}`}>
                      {label}
                    </button>);
            })}
              </div>
            </div>)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={requiresFielder && !fielderId} onClick={() => onConfirm({
            dismissal,
            outBatsmanId: outId || striker?.id || "",
            fielderId: requiresFielder ? fielderId : undefined,
        })}>
            Confirm wicket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
};
export default WicketDialog;
