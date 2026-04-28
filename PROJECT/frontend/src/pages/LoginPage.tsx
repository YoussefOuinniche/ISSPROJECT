import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { Input } from "@/component/ui/input";
import { Button } from "@/component/ui/button";
import { Label } from "@/component/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  ADMIN_EMAIL, ADMIN_PASSWORD,
  MAX_LOGIN_ATTEMPTS as MAX_ATTEMPTS,
  LOCKOUT_KEY, ATTEMPTS_KEY,
  LOCKOUT_DURATION_MS,
} from "@/constants";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(() =>
    parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || "0", 10)
  );
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => {
    const v = sessionStorage.getItem(LOCKOUT_KEY);
    return v ? parseInt(v, 10) : null;
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= lockedUntil) {
        sessionStorage.removeItem(LOCKOUT_KEY);
        sessionStorage.removeItem(ATTEMPTS_KEY);
        setLockedUntil(null);
        setAttempts(0);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && now < lockedUntil;
  const remainingSeconds = isLocked ? Math.ceil((lockedUntil! - now) / 1000) : 0;
  const attemptsLeft = MAX_ATTEMPTS - attempts;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLocked) return;
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (
        email.trim().toLowerCase() === ADMIN_EMAIL &&
        password === ADMIN_PASSWORD
      ) {
        sessionStorage.removeItem(ATTEMPTS_KEY);
        sessionStorage.removeItem(LOCKOUT_KEY);
        login();
        navigate("/", { replace: true });
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        sessionStorage.setItem(ATTEMPTS_KEY, String(newAttempts));
        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_DURATION_MS;
          sessionStorage.setItem(LOCKOUT_KEY, String(until));
          setLockedUntil(until);
          setError("Too many failed attempts. Account locked for 5 minutes.");
        } else {
          const left = MAX_ATTEMPTS - newAttempts;
          setError(`Invalid email or password. ${left} attempt${left === 1 ? "" : "s"} remaining.`);
        }
      }
    }, 400);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-mesh-dark dark">
      {/* Animated orbs */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-30 animate-gradient"
        style={{
          background:
            "radial-gradient(circle, hsl(152 70% 40%) 0%, hsl(152 50% 25%) 40%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 animate-gradient"
        style={{
          background:
            "radial-gradient(circle, hsl(220 80% 60%) 0%, hsl(260 60% 40%) 40%, transparent 70%)",
          animationDelay: "3s",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full opacity-5"
        style={{
          background:
            "radial-gradient(circle, hsl(152 100% 60%) 0%, transparent 60%)",
        }}
      />

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm px-4 animate-fade-in-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-4">
          <div className="relative animate-float">
            <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl scale-110" />
            <img
              src="/logo.png"
              alt="NexaPath"
              className="relative w-16 h-16 rounded-2xl object-cover shadow-2xl ring-2 ring-white/10"
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white gradient-text">
              NexaPath
            </h1>
            <p className="text-sm text-white/50 mt-1 tracking-wide uppercase">Admin Dashboard</p>
          </div>
        </div>

        {/* Glassmorphism card */}
        <div className="glass-strong rounded-2xl p-7 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Welcome back</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sign in to your admin account
            </p>
          </div>

          {/* Error banner */}
          {(error || isLocked) && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/25 px-3.5 py-3 text-destructive text-sm mb-5 animate-scale-in">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {isLocked
                  ? `Too many failed attempts. Try again in ${remainingSeconds}s.`
                  : error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@nexapath.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="pl-9 bg-background/50 border-border/60 focus:border-primary/60 transition-colors text-foreground placeholder:text-muted-foreground"
                  disabled={isLocked || loading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="pl-9 pr-10 bg-background/50 border-border/60 focus:border-primary/60 transition-colors text-foreground placeholder:text-muted-foreground"
                  disabled={isLocked || loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {attempts > 0 && !isLocked && (
              <p className="text-xs text-muted-foreground">
                {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining before lockout
              </p>
            )}

            <Button
              type="submit"
              className="w-full mt-2 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              disabled={isLocked || loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          NexaPath Admin · Secure Access
        </p>
      </div>
    </div>
  );
}
