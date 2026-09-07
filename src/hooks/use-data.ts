"use client";
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_SETTINGS,
  type DayBlock,
  type DaySettings,
  type RoutineBlock,
  type Task,
} from "@/types/models";
import { errorMessage } from "@/lib/errors";
export function useData(uid: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<RoutineBlock[]>([]);
  const [settings, setSettings] = useState<DaySettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState({
    tasks: false,
    routines: false,
    settings: false,
  });
  const [error, setError] = useState("");
  useEffect(() => {
    const fail = (e: unknown) => setError(errorMessage(e));
    const stops = [
      onSnapshot(
        collection(db, "users", uid, "tasks"),
        (snap) => {
          setTasks(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Task));
          setReady((r) => ({ ...r, tasks: true }));
        },
        fail,
      ),
      onSnapshot(
        collection(db, "users", uid, "routineBlocks"),
        (snap) => {
          setRoutines(
            snap.docs
              .map((d) => ({ ...d.data(), id: d.id }) as RoutineBlock)
              .sort((a, b) => a.order - b.order),
          );
          setReady((r) => ({ ...r, routines: true }));
        },
        fail,
      ),
      onSnapshot(
        doc(db, "users", uid, "settings", "day"),
        (snap) => {
          setSettings(
            snap.exists() ? (snap.data() as DaySettings) : DEFAULT_SETTINGS,
          );
          setReady((r) => ({ ...r, settings: true }));
        },
        fail,
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [uid]);
  return {
    tasks,
    routines,
    settings,
    loading: !Object.values(ready).every(Boolean),
    error,
  };
}
export function useBlocks(uid: string, date: string) {
  const [result, setResult] = useState<{
    date: string;
    blocks: DayBlock[];
    error: string;
  }>({ date: "", blocks: [], error: "" });
  useEffect(
    () =>
      onSnapshot(
        collection(db, "users", uid, "days", date, "blocks"),
        (snap) =>
          setResult({
            date,
            blocks: snap.docs
              .map((d) => ({ ...d.data(), id: d.id }) as DayBlock)
              .sort((a, b) => a.startTime.localeCompare(b.startTime)),
            error: "",
          }),
        (e) => setResult({ date, blocks: [], error: errorMessage(e) }),
      ),
    [uid, date],
  );
  return {
    blocks: result.date === date ? result.blocks : [],
    loading: result.date !== date,
    error: result.date === date ? result.error : "",
  };
}
