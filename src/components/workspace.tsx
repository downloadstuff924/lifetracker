"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut, type User } from "firebase/auth";
import { CheckCheck, Clock3, LogOut, Sun, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import { errorMessage } from "@/lib/errors";
import { useData } from "@/hooks/use-data";
import { Tasks } from "./tasks";
import { MyDay } from "./my-day";
import { Loading, ErrorNotice } from "./ui/sheet";
export function Workspace({ user }: { user: User }) {
  const [tab, setTab] = useState<"tasks" | "day">("day");
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const { tasks, routines, settings, loading, error } = useData(user.uid);
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="My Day home">
          <Sun size={24} />
          my day<span>•</span>
        </Link>
        <span className="header-motto">A LITTLE MORE INTENTION.</span>
        <div className="account">
          <span className="avatar" title={user.email ?? "Your account"}>
            {user.email?.[0]?.toUpperCase()}
          </span>
          <button
            className="icon-button"
            title="Sign out"
            aria-label="Sign out"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              try {
                await signOut(auth);
              } catch (e) {
                setNotice(errorMessage(e));
                setSigningOut(false);
              }
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <nav className="main-nav" aria-label="Main navigation">
        <button
          className={tab === "tasks" ? "active" : ""}
          aria-current={tab === "tasks" ? "page" : undefined}
          onClick={() => setTab("tasks")}
        >
          <CheckCheck size={19} />
          Tasks
          <span className="nav-count">
            {tasks.filter((t) => !t.completed).length}
          </span>
        </button>
        <button
          className={tab === "day" ? "active" : ""}
          aria-current={tab === "day" ? "page" : undefined}
          onClick={() => setTab("day")}
        >
          <Clock3 size={19} />
          My Day
        </button>
      </nav>
      <main className="main-content">
        <ErrorNotice message={error} />
        {loading && !error ? (
          <Loading />
        ) : error ? (
          <div className="empty-state">
            <h3>We couldn’t load your space.</h3>
            <p>
              Check your connection and Firebase setup, then refresh to try
              again.
            </p>
            <button
              className="secondary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : tab === "tasks" ? (
          <Tasks uid={user.uid} tasks={tasks} notify={setNotice} />
        ) : (
          <MyDay
            uid={user.uid}
            tasks={tasks}
            routines={routines}
            settings={settings}
            notify={setNotice}
          />
        )}
      </main>
      {notice && (
        <div className="toast" role="alert">
          <span>{notice}</span>
          <button
            aria-label="Dismiss message"
            className="icon-button"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
