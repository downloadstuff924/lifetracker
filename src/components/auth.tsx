"use client";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { ArrowRight, Sun, Check, Clock3 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { errorMessage } from "@/lib/errors";
import { ErrorNotice, Loading } from "./ui/sheet";
import { Workspace } from "./workspace";
export function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      }),
    [],
  );
  if (loading)
    return (
      <main className="auth-loading">
        <div className="brand">
          <Sun /> my day<span>•</span>
        </div>
        <Loading />
      </main>
    );
  return user ? <Workspace key={user.uid} user={user} /> : <AuthForm />;
}
function AuthForm() {
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await (
        signup ? createUserWithEmailAndPassword : signInWithEmailAndPassword
      )(auth, String(data.get("email")).trim(), String(data.get("password")));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <header className="auth-top">
        <div className="brand">
          <Sun size={25} /> my day<span>•</span>
        </div>
        <span className="eyebrow">A LITTLE SPACE FOR WHAT MATTERS</span>
      </header>
      <main className="auth-layout">
        <section className="auth-intro">
          <div className="intro-mark">
            <Sun size={40} strokeWidth={1.2} />
          </div>
          <p className="eyebrow">LESS RUSH. MORE INTENTION.</p>
          <h1>
            A clearer mind.
            <br />A day that’s yours.
          </h1>
          <p className="intro-copy">
            Get things out of your head and give them a place in your day. One
            task, one little moment at a time.
          </p>
          <div className="mini-plan">
            <div>
              <span className="mini-time">09:00</span>
              <span className="mini-line" />
              <span>
                <strong>A little time to focus</strong>
                <small>Make room for your most important work</small>
              </span>
              <Check size={18} />
            </div>
            <div>
              <span className="mini-time">10:30</span>
              <span className="mini-line pale" />
              <span>
                <strong>Room to breathe</strong>
                <small>A pause is part of the plan, too</small>
              </span>
              <Clock3 size={18} />
            </div>
          </div>
          <p className="intro-foot">A simple plan. A softer pace.</p>
        </section>
        <section className="auth-card">
          <span className="small-sun">
            <Sun size={22} />
          </span>
          <h2>{signup ? "Make yourself at home." : "Welcome back."}</h2>
          <p>
            {signup
              ? "Your calmer day starts right here."
              : "A fresh start, right where you left off."}
          </p>
          <div className="segmented">
            <button
              onClick={() => {
                setSignup(false);
                setError("");
              }}
              className={!signup ? "selected" : ""}
            >
              Sign in
            </button>
            <button
              onClick={() => {
                setSignup(true);
                setError("");
              }}
              className={signup ? "selected" : ""}
            >
              Create account
            </button>
          </div>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={signup ? 6 : undefined}
                placeholder={
                  signup ? "At least 6 characters" : "Enter your password"
                }
                required
              />
            </label>
            <ErrorNotice message={error} />
            <button className="primary auth-submit" disabled={busy}>
              {busy
                ? "One moment…"
                : signup
                  ? "Create your account"
                  : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-note">
            Your tasks. Your time. Your own little space.
          </p>
        </section>
      </main>
      <footer className="auth-footer">MAKE SPACE FOR A GOOD DAY.</footer>
    </div>
  );
}
