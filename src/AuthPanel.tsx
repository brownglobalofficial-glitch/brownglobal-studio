import { useState } from "react";
import { supabase } from "./supabase";

type AuthPanelProps = {
  open: boolean;
  onClose: () => void;
  product: string;
};

export default function AuthPanel({ open, onClose, product }: AuthPanelProps) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Account service is not configured yet.");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = mode === "signup"
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm your BrownGlobal account, then return here to sign in.");
    } else {
      setMessage("You are signed in.");
      window.setTimeout(onClose, 500);
    }
  }

  return <div className="auth-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-close" type="button" onClick={onClose} aria-label="Close account panel">x</button>
      <span className="auth-kicker">ONE BROWNGLOBAL ACCOUNT</span>
      <h2 id="auth-title">{mode === "signup" ? "Start using " + product : "Welcome back"}</h2>
      <p>Your free account works across eligible BrownGlobal products.</p>
      <div className="auth-tabs">
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
        <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
      </div>
      <form onSubmit={submit}>
        {mode === "signup" && <label>Full name<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" required /></label>}
        <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></label>
        <button className="auth-submit" disabled={busy}>{busy ? "Please wait..." : mode === "signup" ? "Create free account" : "Sign in"}</button>
      </form>
      {message && <p className="auth-message" role="status">{message}</p>}
      <div className="auth-business"><b>BrownGlobal Business</b><span>Upgrade later for teams, shared brand tools, expanded workspaces and priority support.</span></div>
    </section>
  </div>;
}
