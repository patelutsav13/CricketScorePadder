import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
const PlayerPickerDialog = ({ open, title, description, players, excludeIds = [], onSelect, onClose, allowClose }) => {
    const available = players.filter((p) => !excludeIds.includes(p.id));
    return (<Dialog open={open} onOpenChange={(v) => { if (!v && allowClose && onClose)
        onClose(); }}>
      <DialogContent className="bg-gradient-card border-border/60">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>
        <div className="grid gap-2 max-h-[55vh] overflow-y-auto pr-1">
          {available.length === 0 && (<p className="text-sm text-muted-foreground text-center py-4">No players available.</p>)}
          {available.map((p) => (<button key={p.id} onClick={() => onSelect(p.id)} className="w-full text-left px-4 py-3 rounded-lg bg-secondary/60 hover:bg-primary/15 hover:text-foreground border border-border/60 hover:border-primary/50 transition-colors font-medium">
              {p.name}
            </button>))}
        </div>
        {allowClose && (<DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogFooter>)}
      </DialogContent>
    </Dialog>);
};
export default PlayerPickerDialog;
