import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { uid, createPlayer, createMatch } from "@/lib/cricket/engine";
import { setActiveMatchId, upsertMatch } from "@/lib/cricket/storage";
import { Plus, Trash2, ArrowRight, Users } from "lucide-react";
const NewMatch = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const teamAId = useState(() => uid())[0];
    const teamBId = useState(() => uid())[0];
    const [teamAName, setTeamAName] = useState("Team A");
    const [teamBName, setTeamBName] = useState("Team B");
    const [overs, setOvers] = useState(5);
    const [venue, setVenue] = useState("");
    const [teamAPlayers, setTeamAPlayers] = useState(["", "", ""]);
    const [teamBPlayers, setTeamBPlayers] = useState(["", "", ""]);
    const [tossWinner, setTossWinner] = useState("A");
    const [tossDecision, setTossDecision] = useState("bat");
    const updatePlayer = (team, idx, value) => {
        const list = team === "A" ? [...teamAPlayers] : [...teamBPlayers];
        list[idx] = value;
        team === "A" ? setTeamAPlayers(list) : setTeamBPlayers(list);
    };
    const addPlayer = (team) => {
        if (team === "A")
            setTeamAPlayers([...teamAPlayers, ""]);
        else
            setTeamBPlayers([...teamBPlayers, ""]);
    };
    const removePlayer = (team, idx) => {
        if (team === "A")
            setTeamAPlayers(teamAPlayers.filter((_, i) => i !== idx));
        else
            setTeamBPlayers(teamBPlayers.filter((_, i) => i !== idx));
    };
    const start = () => {
        const aFiltered = teamAPlayers.map((n) => n.trim()).filter(Boolean);
        const bFiltered = teamBPlayers.map((n) => n.trim()).filter(Boolean);
        if (aFiltered.length < 2 || bFiltered.length < 2) {
            toast({ title: "Add at least 2 players per team", variant: "destructive" });
            return;
        }
        if (aFiltered.length !== bFiltered.length) {
            toast({ title: "Both teams must have the same number of players", variant: "destructive" });
            return;
        }
        if (overs < 1) {
            toast({ title: "Overs must be at least 1", variant: "destructive" });
            return;
        }
        const teamA = {
            id: teamAId,
            name: teamAName.trim() || "Team A",
            players: aFiltered.map((n) => createPlayer(n, teamAId)),
        };
        const teamB = {
            id: teamBId,
            name: teamBName.trim() || "Team B",
            players: bFiltered.map((n) => createPlayer(n, teamBId)),
        };
        const match = createMatch({
            totalOvers: overs,
            teamA,
            teamB,
            tossWinnerId: tossWinner === "A" ? teamAId : teamBId,
            tossDecision,
            venue: venue.trim() || undefined,
        }, user?.email ?? null);
        upsertMatch(match);
        setActiveMatchId(match.id);
        navigate(`/match/${match.id}`);
    };
    return (<div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-extrabold">New Match</h1>

      <Card className="p-4 md:p-5 bg-gradient-card border-border/60 shadow-card-soft space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ta">Team A name</Label>
            <Input id="ta" value={teamAName} onChange={(e) => setTeamAName(e.target.value)}/>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tb">Team B name</Label>
            <Input id="tb" value={teamBName} onChange={(e) => setTeamBName(e.target.value)}/>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="overs">Overs per innings</Label>
            <Input id="overs" type="number" min={1} max={50} value={overs} onChange={(e) => setOvers(parseInt(e.target.value) || 0)}/>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venue">Venue (optional)</Label>
            <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Backyard, MCG..."/>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <PlayerListCard title={teamAName || "Team A"} players={teamAPlayers} onChange={(i, v) => updatePlayer("A", i, v)} onAdd={() => addPlayer("A")} onRemove={(i) => removePlayer("A", i)}/>
        <PlayerListCard title={teamBName || "Team B"} players={teamBPlayers} onChange={(i, v) => updatePlayer("B", i, v)} onAdd={() => addPlayer("B")} onRemove={(i) => removePlayer("B", i)}/>
      </div>

      <Card className="p-4 md:p-5 bg-gradient-card border-border/60 shadow-card-soft space-y-4">
        <div className="space-y-2">
          <Label>Toss winner</Label>
          <RadioGroup value={tossWinner} onValueChange={(v) => setTossWinner(v)} className="grid grid-cols-2 gap-2">
            <RadioOption id="tw-a" value="A" checked={tossWinner === "A"} label={teamAName || "Team A"}/>
            <RadioOption id="tw-b" value="B" checked={tossWinner === "B"} label={teamBName || "Team B"}/>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label>Elected to</Label>
          <RadioGroup value={tossDecision} onValueChange={(v) => setTossDecision(v)} className="grid grid-cols-2 gap-2">
            <RadioOption id="td-bat" value="bat" checked={tossDecision === "bat"} label="Bat first"/>
            <RadioOption id="td-bowl" value="bowl" checked={tossDecision === "bowl"} label="Bowl first"/>
          </RadioGroup>
        </div>
      </Card>

      <Button onClick={start} size="lg" className="w-full bg-gradient-primary text-primary-foreground shadow-neon hover:opacity-90">
        Start Match <ArrowRight className="w-4 h-4"/>
      </Button>
    </div>);
};
const RadioOption = ({ id, value, checked, label }) => (<Label htmlFor={id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/40"}`}>
    <RadioGroupItem value={value} id={id}/>
    <span className="font-medium">{label}</span>
  </Label>);
const PlayerListCard = ({ title, players, onChange, onAdd, onRemove, }) => (<Card className="p-4 bg-gradient-card border-border/60 shadow-card-soft">
    <div className="flex items-center gap-2 mb-3">
      <Users className="w-4 h-4 text-primary"/>
      <h3 className="font-bold truncate">{title}</h3>
      <span className="ml-auto text-xs text-muted-foreground">{players.filter(Boolean).length} players</span>
    </div>
    <div className="space-y-2">
      {players.map((p, i) => (<div key={i} className="flex gap-2">
          <Input value={p} onChange={(e) => onChange(i, e.target.value)} placeholder={`Player ${i + 1}`}/>
          {players.length > 2 && (<Button type="button" variant="outline" size="icon" onClick={() => onRemove(i)}>
              <Trash2 className="w-4 h-4"/>
            </Button>)}
        </div>))}
    </div>
    <Button type="button" variant="outline" size="sm" className="w-full mt-3" onClick={onAdd}>
      <Plus className="w-4 h-4"/> Add player
    </Button>
  </Card>);
export default NewMatch;
