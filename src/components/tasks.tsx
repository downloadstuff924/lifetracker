"use client";
/* eslint-disable @next/next/no-img-element -- User-uploaded Firebase images use their original private download URLs in a static export. */
import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import {
  Check,
  ChevronDown,
  Clock3,
  CalendarDays,
  ImagePlus,
  Plus,
  Trash2,
  X,
  ListTodo,
} from "lucide-react";
import type { Task, TaskImage } from "@/types/models";
import { deleteTask, newId, saveTask, toggleTask } from "@/lib/firestore";
import { uploadImage, validateImage, removeImage } from "@/lib/storage";
import { errorMessage } from "@/lib/errors";
import { formatDuration, localDate } from "@/utils/time";
import { Sheet, ErrorNotice } from "./ui/sheet";
export function Tasks({
  uid,
  tasks,
  notify,
}: {
  uid: string;
  tasks: Task[];
  notify: (s: string) => void;
}) {
  const [editing, setEditing] = useState<Task | null | undefined>();
  const [pending, setPending] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()),
  );
  const active = filtered
    .filter((t) => !t.completed)
    .sort(
      (a, b) =>
        (a.dueDate?.toMillis() ?? Infinity) -
        (b.dueDate?.toMillis() ?? Infinity),
    );
  const completed = filtered.filter((t) => t.completed);
  async function toggle(task: Task) {
    setPending((p) => [...p, task.id]);
    try {
      await toggleTask(uid, task);
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setPending((p) => p.filter((id) => id !== task.id));
    }
  }
  function card(task: Task) {
    return (
      <article
        className={`task-card ${task.completed ? "is-completed" : ""}`}
        key={task.id}
      >
        <button
          className={`checkbox ${task.completed ? "checked" : ""}`}
          role="checkbox"
          aria-checked={task.completed}
          aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
          disabled={pending.includes(task.id)}
          onClick={() => toggle(task)}
        >
          {task.completed && <Check size={15} />}
        </button>
        <button className="task-content" onClick={() => setEditing(task)}>
          <strong>{task.title}</strong>
          {task.description && (
            <p className="task-description">{task.description}</p>
          )}
          <div className="task-meta">
            {task.estimatedMinutes && (
              <span>
                <Clock3 size={13} />
                {formatDuration(task.estimatedMinutes)}
              </span>
            )}
            {task.dueDate && (
              <span
                className={
                  !task.completed &&
                  localDate(task.dueDate.toDate()) < localDate()
                    ? "overdue"
                    : ""
                }
              >
                <CalendarDays size={13} />
                {task.dueDate
                  .toDate()
                  .toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
              </span>
            )}
          </div>
          {task.images.length > 0 && (
            <div className="thumbnails">
              {task.images.slice(0, 4).map((img) => (
                <img key={img.storagePath} src={img.url} alt={img.fileName} />
              ))}
              {task.images.length > 4 && <span>+{task.images.length - 4}</span>}
            </div>
          )}
        </button>
      </article>
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ONE THING AT A TIME</p>
          <h1>
            Tasks<span className="heading-dot">.</span>
          </h1>
          <p>A little less on your mind.</p>
        </div>
        <button className="primary" onClick={() => setEditing(null)}>
          <Plus size={18} />
          <span>Add task</span>
        </button>
      </div>
      {tasks.length > 0 && (
        <input
          className="search-input"
          aria-label="Search tasks"
          placeholder="Find a task…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <div className="section-label">
        <span>TO DO</span>
        <span>
          {active.length} {active.length === 1 ? "task" : "tasks"}
        </span>
      </div>
      {active.length ? (
        <div className="task-list">{active.map(card)}</div>
      ) : (
        <div className="empty-state">
          <ListTodo size={32} strokeWidth={1.3} />
          <h3>
            {search
              ? "No matching tasks."
              : tasks.length
                ? "A little breathing room."
                : "No tasks yet."}
          </h3>
          <p>
            {tasks.length
              ? "Your next little step can start here."
              : "Get it out of your head and onto your list."}
          </p>
          <button className="secondary" onClick={() => setEditing(null)}>
            <Plus size={16} />
            {tasks.length ? "Add a task" : "Create your first task"}
          </button>
        </div>
      )}
      {completed.length > 0 && (
        <details className="completed-section" open>
          <summary>
            <ChevronDown size={16} />
            Completed <span>{completed.length}</span>
          </summary>
          <div className="task-list">{completed.map(card)}</div>
        </details>
      )}
      <div className="page-foot">Small steps still move you forward.</div>
      {editing !== undefined && (
        <TaskEditor
          uid={uid}
          task={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
function TaskEditor({
  uid,
  task,
  onClose,
}: {
  uid: string;
  task: Task | null;
  onClose: () => void;
}) {
  const [id] = useState(() => task?.id ?? newId(uid));
  const [images, setImages] = useState<TaskImage[]>(task?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const uploaded: TaskImage[] = [];
    try {
      for (let i = 0; i < files.length; i++)
        uploaded.push(
          await uploadImage(uid, id, files[i], (p) =>
            setProgress(`Uploading image ${i + 1} of ${files.length} · ${p}%`),
          ),
        );
      const title = String(form.get("title")).trim();
      if (!title) throw new Error("Give your task a title.");
      const due = String(form.get("dueDate"));
      await saveTask(
        uid,
        id,
        {
          title,
          description: String(form.get("description")).trim(),
          completed: task?.completed ?? false,
          estimatedMinutes: form.get("estimatedMinutes")
            ? Number(form.get("estimatedMinutes"))
            : null,
          dueDate: due ? Timestamp.fromDate(new Date(`${due}T12:00:00`)) : null,
          images: [...images, ...uploaded],
        },
        !task,
      );
      const removed = (task?.images ?? []).filter(
        (img) => !images.some((i) => i.storagePath === img.storagePath),
      );
      const cleanup = await Promise.allSettled(removed.map(removeImage));
      if (cleanup.some((r) => r.status === "rejected")) {
        setError(
          "Task saved, but an old image could not be deleted from Storage.",
        );
        setFiles([]);
        setImages([...images, ...uploaded]);
        return;
      }
      onClose();
    } catch (e) {
      await Promise.allSettled(uploaded.map(removeImage));
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  async function remove() {
    if (!task) return;
    setBusy(true);
    try {
      await deleteTask(uid, task);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={task ? "Task details" : "A new little step"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Task title
            <input
              name="title"
              defaultValue={task?.title}
              placeholder="What would you like to do?"
              required
              maxLength={200}
              autoFocus
            />
          </label>
          <label>
            Notes <span className="optional">optional</span>
            <textarea
              name="description"
              defaultValue={task?.description}
              placeholder="A few details, a thought, a reminder…"
              rows={3}
            />
          </label>
          <div className="form-row">
            <label>
              Estimated time
              <select
                name="estimatedMinutes"
                defaultValue={task?.estimatedMinutes ?? ""}
              >
                <option value="">No estimate</option>
                {[
                  ...new Set([
                    15,
                    30,
                    45,
                    60,
                    90,
                    120,
                    180,
                    240,
                    ...(task?.estimatedMinutes ? [task.estimatedMinutes] : []),
                  ]),
                ]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n} value={n}>
                      {formatDuration(n)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Due date
              <input
                name="dueDate"
                type="date"
                defaultValue={
                  task?.dueDate ? localDate(task.dueDate.toDate()) : ""
                }
              />
            </label>
          </div>
          <label>
            Photos <span className="optional">optional</span>
          </label>
          <div className="editor-images">
            {images.map((img) => (
              <div key={img.storagePath}>
                <a href={img.url} target="_blank" rel="noreferrer">
                  <img src={img.url} alt={img.fileName} />
                </a>
                <button
                  type="button"
                  aria-label={`Remove ${img.fileName}`}
                  onClick={() =>
                    setImages((p) =>
                      p.filter((i) => i.storagePath !== img.storagePath),
                    )
                  }
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          {files.map((f, i) => (
            <div className="file-row" key={`${f.name}-${i}`}>
              <span>{f.name}</span>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <label className="upload-zone">
            <ImagePlus size={22} />
            <strong>Add a little context</strong>
            <span>JPG, PNG, WebP or GIF · up to 10 MB each</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => {
                try {
                  const selected = Array.from(e.target.files ?? []);
                  selected.forEach(validateImage);
                  setFiles((p) => [...p, ...selected]);
                  setError("");
                } catch (e) {
                  setError(errorMessage(e));
                }
                e.target.value = "";
              }}
            />
          </label>
        </fieldset>
        {progress && (
          <p className="upload-progress" role="status">
            {progress}
          </p>
        )}
        <ErrorNotice message={error} />
        <div className="sheet-actions">
          {task && (
            <button
              className="danger icon-button"
              type="button"
              aria-label="Delete task"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : task ? "Save changes" : "Create task"}
          </button>
        </div>
        {confirmDelete && (
          <div className="delete-confirm">
            <p>
              Delete this task and its photos? Scheduled blocks will remain
              without a linked task.
            </p>
            <button
              type="button"
              className="danger secondary"
              onClick={remove}
              disabled={busy}
            >
              Delete task
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setConfirmDelete(false)}
            >
              Keep task
            </button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
