// Explicit opt-in: creates one temporary Firebase Auth user and removes its test data.
// Run: node --env-file=.env.local tests/firebase-live.mjs
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  terminate,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getBytes,
  deleteObject,
} from "firebase/storage";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});
const auth = getAuth(app),
  db = getFirestore(app),
  storage = getStorage(app);
let user;
const refs = [];
let imageRef;
try {
  const email = `myday-check-${Date.now()}@example.com`;
  const password = `Md!${randomUUID()}`;
  user = (await createUserWithEmailAndPassword(auth, email, password)).user;
  console.log("PASS signup");
  await signOut(auth);
  assert.equal(auth.currentUser, null);
  console.log("PASS logout");
  user = (await signInWithEmailAndPassword(auth, email, password)).user;
  console.log("PASS login");
  const uid = user.uid;
  const task = doc(db, "users", uid, "tasks", "test-task");
  const settings = doc(db, "users", uid, "settings", "day");
  const routine = doc(db, "users", uid, "routineBlocks", "test-routine");
  const block = doc(
    db,
    "users",
    uid,
    "days",
    "2026-09-07",
    "blocks",
    "test-block",
  );
  refs.push(task, settings, routine, block);
  await setDoc(task, {
    title: "Test proposal",
    description: "Temporary validation task",
    completed: false,
    estimatedMinutes: 45,
    dueDate: null,
    images: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  assert.equal((await getDoc(task)).data().completed, false);
  console.log("PASS task create");
  await updateDoc(task, {
    title: "Edited proposal",
    completed: true,
    updatedAt: serverTimestamp(),
  });
  assert.equal((await getDoc(task)).data().title, "Edited proposal");
  assert.equal((await getDoc(task)).data().completed, true);
  await updateDoc(task, { completed: false });
  console.log("PASS task edit / complete / uncomplete");
  await setDoc(settings, { startTime: "07:00", endTime: "22:00" });
  await setDoc(routine, {
    title: "Breakfast",
    description: "",
    startTime: "08:00",
    endTime: "08:30",
    order: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(block, {
    title: "Edited proposal",
    description: "",
    startTime: "09:00",
    endTime: "09:45",
    type: "task",
    taskId: task.id,
    order: 540,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const linkedId = (await getDoc(block)).data().taskId;
  await updateDoc(doc(db, "users", uid, "tasks", linkedId), {
    completed: true,
  });
  assert.equal((await getDoc(task)).data().completed, true);
  await deleteDoc(block);
  assert.equal((await getDoc(task)).exists(), true);
  console.log(
    "PASS settings / routine / task linking / independent block deletion",
  );
  await assert.rejects(
    () => getDoc(doc(db, "users", "another-user", "tasks", "private")),
    (e) => e.code === "permission-denied",
  );
  await assert.rejects(
    () =>
      setDoc(doc(db, "users", "another-user", "tasks", "private"), {
        title: "forbidden",
      }),
    (e) => e.code === "permission-denied",
  );
  console.log("PASS cross-user Firestore access denied");
  imageRef = ref(storage, `users/${uid}/tasks/test-task/check.png`);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6tCEAAAAASUVORK5CYII=",
    "base64",
  );
  await uploadBytes(imageRef, png, { contentType: "image/png" });
  assert.ok((await getBytes(imageRef)).byteLength > 0);
  await deleteObject(imageRef);
  imageRef = undefined;
  console.log("PASS image upload / read / remove");
  await deleteDoc(task);
  assert.equal((await getDoc(task)).exists(), false);
  console.log("PASS task delete");
} catch (e) {
  console.error(
    "Live Firebase verification could not finish:",
    e.code ?? "",
    e.message,
  );
  process.exitCode = 1;
} finally {
  if (user) {
    if (imageRef) await deleteObject(imageRef).catch(() => {});
    const cleanup = await Promise.allSettled(refs.map((r) => deleteDoc(r)));
    if (cleanup.some((r) => r.status === "rejected"))
      console.error(
        "Some test documents could not be removed. Temporary UID:",
        user.uid,
      );
    await deleteUser(user).catch((e) =>
      console.error(
        "Temporary account cleanup failed:",
        e.code,
        "UID:",
        user.uid,
      ),
    );
  }
  await terminate(db);
  await deleteApp(app);
}
