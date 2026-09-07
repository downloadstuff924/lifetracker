import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { removeImage } from "./storage";
import type { DayBlock, DaySettings, RoutineBlock, Task } from "@/types/models";
import { validateBlock } from "@/utils/time";
export const newId = (uid: string) =>
  doc(collection(db, "users", uid, "tasks")).id;
export async function saveTask(
  uid: string,
  id: string,
  data: Omit<Task, "id" | "createdAt" | "updatedAt">,
  isNew: boolean,
) {
  await setDoc(
    doc(db, "users", uid, "tasks", id),
    {
      ...data,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true },
  );
}
export const toggleTask = (uid: string, task: Task) =>
  updateDoc(doc(db, "users", uid, "tasks", task.id), {
    completed: !task.completed,
    updatedAt: serverTimestamp(),
  });
export async function deleteTask(uid: string, task: Task) {
  await Promise.all(task.images.map(removeImage));
  await deleteDoc(doc(db, "users", uid, "tasks", task.id));
}
export async function saveBlock(
  uid: string,
  date: string,
  block: Omit<DayBlock, "createdAt" | "updatedAt">,
  isNew: boolean,
) {
  await setDoc(
    doc(db, "users", uid, "days", date, "blocks", block.id),
    {
      ...block,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true },
  );
}
export const deleteBlock = (uid: string, date: string, id: string) =>
  deleteDoc(doc(db, "users", uid, "days", date, "blocks", id));
export const saveSettings = (uid: string, settings: DaySettings) =>
  setDoc(doc(db, "users", uid, "settings", "day"), settings);
export async function saveRoutine(
  uid: string,
  routine: Omit<RoutineBlock, "createdAt" | "updatedAt">,
  isNew: boolean,
) {
  await setDoc(
    doc(db, "users", uid, "routineBlocks", routine.id),
    {
      ...routine,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true },
  );
}
export const deleteRoutine = (uid: string, id: string) =>
  deleteDoc(doc(db, "users", uid, "routineBlocks", id));
export async function reorderRoutines(uid: string, routines: RoutineBlock[]) {
  const batch = writeBatch(db);
  routines.forEach((r, i) =>
    batch.update(doc(db, "users", uid, "routineBlocks", r.id), {
      order: i,
      updatedAt: serverTimestamp(),
    }),
  );
  await batch.commit();
}
export async function applyRoutines(
  uid: string,
  date: string,
  routines: RoutineBlock[],
  blocks: DayBlock[],
  settings: DaySettings,
) {
  if (!routines.length)
    throw new Error("Add your routine blocks in Configure My Day first.");
  const copies = routines.map((r) => ({
    ...r,
    id: crypto.randomUUID(),
    type: "routine" as const,
    taskId: null,
  }));
  const all = [...blocks];
  for (const r of copies) {
    const error = validateBlock(r, all, settings);
    if (error) throw new Error(error);
    all.push(r);
  }
  const batch = writeBatch(db);
  copies.forEach((r) =>
    batch.set(doc(db, "users", uid, "days", date, "blocks", r.id), {
      ...r,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await batch.commit();
}
