import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · VNC Hub" },
      { name: "description", content: "Sign in to your VNC Hub workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, hydrated, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && user) navigate({ to: "/", replace: true });
  }, [hydrated, navigate, user]);

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signIn(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate({ to: "/", replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden lg:flex relative overflow-hidden bg-[image:var(--gradient-primary)] p-12 text-white">
        <div className="absolute inset-0 bg-mesh opacity-20" />
        <div className="relative flex flex-col justify-between max-w-xl">
          <div className="flex items-center gap-3">
            <img
              src="/vnc-logo.png"
              alt="VNC logo"
              className="h-10 w-10 rounded-full bg-white/10"
            />
            <div>
              <div className="text-[15px] font-semibold">VNC Hub</div>
              <div className="text-xs text-white/65">Enterprise workspace</div>
            </div>
          </div>
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/80">
              <ShieldCheck className="h-3.5 w-3.5" /> Role-aware workspace
            </div>
            <h1 className="max-w-lg text-5xl font-semibold leading-[1.04] tracking-tight">
              Everyone sees the work that moves them forward.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-6 text-white/70">
              One connected view for executives, managers, team leaders, and every team member.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/55">
            <span className="h-2 w-2 rounded-full bg-emerald-300" /> Secure workspace access
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <img src="/vnc-logo.png" alt="VNC logo" className="h-10 w-10 rounded-full" />
            <div>
              <div className="text-[15px] font-semibold">VNC Hub</div>
              <div className="text-xs text-muted-foreground">Enterprise workspace</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Welcome back
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to VNC Hub</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use your workspace account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[12px] font-medium">Work email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@vnc.com"
                  autoComplete="email"
                  required
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-medium">Password</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-11 text-sm outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {error && (
              <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[image:var(--gradient-primary)] text-sm font-semibold text-white shadow-glow transition hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
