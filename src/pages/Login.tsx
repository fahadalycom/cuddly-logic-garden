import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, Mail, Lock, User, ArrowRight, Shield } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast.success("Account created! You can now sign in.");
        setIsSignUp(false);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Left — decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-12">
        {/* Gradient background */}
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-float" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/90 font-bold text-lg tracking-tight">AI Sub Manager</span>
          </div>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-semibold">Management Suite</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
            Manage your<br />
            subscriptions<br />
            <span className="text-white/60">with precision.</span>
          </h2>
          <p className="text-white/40 text-sm max-w-sm leading-relaxed">
            Complete subscription sharing management — from sales to delivery, renewals to analytics.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {['A', 'S', 'C', 'M'].map((letter, i) => (
              <div key={i} className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-xl border-2 border-white/10 flex items-center justify-center text-[10px] font-bold text-white/80">
                {letter}
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">6 roles · Full RBAC · Audit logging</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Subtle bg effects for mobile */}
        <div className="absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-60 h-60 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="w-full max-w-sm relative z-10 animate-fade-in">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl gradient-primary glow-primary mb-4">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Sub Manager</h1>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {isSignUp ? "Create Account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {isSignUp ? "Set up your staff account" : "Sign in to continue to your dashboard"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 bg-card/40 border-border/20 h-12 rounded-xl text-sm focus:border-primary/40 focus:bg-card/60" placeholder="Your name" required />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-card/40 border-border/20 h-12 rounded-xl text-sm focus:border-primary/40 focus:bg-card/60" placeholder="admin@demo.com" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-card/40 border-border/20 h-12 rounded-xl text-sm focus:border-primary/40 focus:bg-card/60" placeholder="••••••••" required minLength={6} />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-white font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/35 transition-all text-sm">
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{isSignUp ? "Create Account" : "Sign In"}<ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button type="button" className="text-sm text-muted-foreground/50 hover:text-primary transition-colors" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <span className="font-medium text-primary">{isSignUp ? "Sign in" : "Sign up"}</span>
            </button>
          </div>

          {/* Demo credentials */}
          <div className="mt-8 p-4 rounded-xl bg-card/30 border border-border/10">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-3.5 w-3.5 text-primary/60" />
              <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.2em]">Demo Credentials</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground/50"><span className="text-muted-foreground/70 mono">admin@demo.com</span></p>
              <p className="text-xs text-muted-foreground/50">Password: <span className="text-muted-foreground/70 mono">Demo@1234</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
