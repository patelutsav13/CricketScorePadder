import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";
const Auth = () => {
    const { signIn, signUp } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [mode, setMode] = useState("signin");
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === "signin")
                await signIn(email, password);
            else
                await signUp(name, email, password);
            toast({ title: mode === "signin" ? "Welcome back!" : "Account created" });
            navigate("/");
        }
        catch (err) {
            toast({
                title: "Something went wrong",
                description: err.message,
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="max-w-md mx-auto py-4 md:py-12">
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-neon mb-3">
          <Trophy className="w-7 h-7 text-primary-foreground"/>
        </div>
        <h1 className="text-2xl font-extrabold">Welcome to <span className="text-gradient-primary">CricPadder</span></h1>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          Save your matches across sessions. Or <Link to="/" className="text-primary underline-offset-4 hover:underline">continue as guest</Link>.
        </p>
      </div>

      <Card className="bg-gradient-card border-border/60 p-5 shadow-card-soft">
        <Tabs value={mode} onValueChange={(v) => setMode(v)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <form onSubmit={submit} className="space-y-3 mt-4">
            <TabsContent value="signup" className="m-0 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="MS Dhoni" required={mode === "signup"}/>
              </div>
            </TabsContent>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required/>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground shadow-neon hover:opacity-90">
              {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create account"}
            </Button>
          </form>
        </Tabs>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Demo auth: data is stored in your browser only. No emails sent.
        </p>
      </Card>
    </div>);
};
export default Auth;
