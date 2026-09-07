"use client";
import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2,
  Sun,
  Clock3,
  Link2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Coffee,
} from "lucide-react";
import type { DayBlock, DaySettings, RoutineBlock, Task } from "@/types/models";
import {
  applyRoutines,
  deleteBlock,
  deleteRoutine,
  reorderRoutines,
  saveBlock,
  saveRoutine,
  saveSettings,
  toggleTask,
} from "@/lib/firestore";
import {
  duration,
  formatDuration,
  freeGaps,
  localDate,
  shiftDate,
  toMinutes,
  toTime,
  validateBlock,
} from "@/utils/time";
import { errorMessage } from "@/lib/errors";
import { useBlocks } from "@/hooks/use-data";
import { ErrorNotice, Loading, Sheet } from "./ui/sheet";
export function MyDay({
  uid,
  tasks,
  routines,
  settings,
  notify,
}: {
  uid: string;
  tasks: Task[];
  routines: RoutineBlock[];
  settings: DaySettings;
  notify: (message: string) => void;
}) {
  const [date, setDate] = useState(localDate());
  const [editing, setEditing] = useState<DayBlock | null | undefined>();
  const [configure, setConfigure] = useState(false);
  const [busy, setBusy] = useState(false);
  const { blocks, loading, error } = useBlocks(uid, date);
  const gaps = freeGaps(blocks, settings);
  const free = gaps.reduce(
    (sum, g) => sum + duration(g.startTime, g.endTime),
    0,
  );
  const total = duration(settings.startTime, settings.endTime);
  async function act(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const timeline = [
    ...blocks.map((b) => ({
      kind: "block" as const,
      startTime: b.startTime,
      block: b,
      endTime: b.endTime,
    })),
    ...gaps.map((g) => ({ kind: "gap" as const, ...g })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p>
          <h1>
            My Day<span className="heading-dot">.</span>
          </h1>
          <p>A little structure. A little breathing room.</p>
        </div>
        <button
          className="icon-button settings-button"
          aria-label="Configure My Day"
          onClick={() => setConfigure(true)}
        >
          <Settings2 size={21} />
        </button>
      </div>
      <div className="date-bar">
        <div>
          <CalendarLabel date={date} />
        </div>
        <div className="date-controls">
          <button
            className="icon-button"
            disabled={busy}
            aria-label="Previous day"
            onClick={() => setDate((d) => shiftDate(d, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => setDate(localDate())}
          >
            Today
          </button>
          <button
            className="icon-button"
            disabled={busy}
            aria-label="Next day"
            onClick={() => setDate((d) => shiftDate(d, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <ErrorNotice message={error} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="day-overview">
            <div className="overview-icon">
              <Sun size={24} strokeWidth={1.5} />
            </div>
            <div>
              <strong>Your day, at a glance</strong>
              <p>
                {formatDuration(total - free)} planned <span>·</span>{" "}
                {formatDuration(free)} to make your own
              </p>
            </div>
            <span className="day-hours">
              {settings.startTime} — {settings.endTime}
            </span>
            <div className="day-meter">
              <span
                style={{
                  width: `${Math.min(100, ((total - free) / total) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="section-label">
            <span>THE SHAPE OF YOUR DAY</span>
            <button
              className="text-button accent"
              disabled={busy || !!error}
              onClick={() => setEditing(null)}
            >
              <Plus size={16} />
              Add block
            </button>
          </div>
          {blocks.length === 0 && (
            <div className="empty-state compact">
              <Sun size={30} strokeWidth={1.3} />
              <h3>Nothing planned yet.</h3>
              <p>A fresh page. Make a little space for your day.</p>
              <div className="empty-actions">
                <button
                  className="primary"
                  disabled={busy || !!error}
                  onClick={() => setEditing(null)}
                >
                  <Plus size={16} />
                  Add a block
                </button>
                <button
                  className="secondary"
                  disabled={busy || !!error}
                  onClick={() =>
                    act(() =>
                      applyRoutines(uid, date, routines, blocks, settings),
                    )
                  }
                >
                  Use my default schedule
                </button>
              </div>
            </div>
          )}
          <div className="timeline">
            {timeline.map((item) => (
              <div
                className={`timeline-row ${item.kind === "gap" ? "gap-row" : ""}`}
                key={
                  item.kind === "block"
                    ? item.block.id
                    : `gap-${item.startTime}`
                }
              >
                <span className="time-label">{item.startTime}</span>
                <div className="timeline-dot" />
                {item.kind === "gap" ? (
                  <button
                    className="free-block"
                    disabled={!!error}
                    onClick={() =>
                      setEditing({
                        id: "",
                        title: "",
                        description: "",
                        startTime: item.startTime,
                        endTime: item.endTime,
                        type: "custom",
                        taskId: null,
                        order: 0,
                        createdAt: null,
                        updatedAt: null,
                      })
                    }
                  >
                    <Coffee size={16} />
                    <span>
                      Free time
                      <small>
                        {formatDuration(duration(item.startTime, item.endTime))}{" "}
                        of breathing room
                      </small>
                    </span>
                    <Plus size={16} />
                  </button>
                ) : (
                  <div className={`day-block ${item.block.type}`}>
                    <button
                      className="block-main"
                      onClick={() => setEditing(item.block)}
                    >
                      <span className="block-type">
                        {item.block.type === "task" ? (
                          <Link2 size={12} />
                        ) : item.block.type === "routine" ? (
                          <Sun size={12} />
                        ) : (
                          <Clock3 size={12} />
                        )}{" "}
                        {item.block.type}
                      </span>
                      <strong>
                        {item.block.taskId
                          ? (tasks.find((t) => t.id === item.block.taskId)
                              ?.title ?? item.block.title)
                          : item.block.title}
                      </strong>
                      <span className="block-meta">
                        {item.startTime} – {item.endTime}
                        <span>·</span>
                        {formatDuration(duration(item.startTime, item.endTime))}
                      </span>
                      {item.block.taskId &&
                        !tasks.some((t) => t.id === item.block.taskId) && (
                          <small className="muted">
                            Linked task was deleted
                          </small>
                        )}
                    </button>
                    {item.block.taskId &&
                      tasks.find((t) => t.id === item.block.taskId) && (
                        <button
                          className={`checkbox ${tasks.find((t) => t.id === item.block.taskId)?.completed ? "checked" : ""}`}
                          role="checkbox"
                          aria-checked={
                            !!tasks.find((t) => t.id === item.block.taskId)
                              ?.completed
                          }
                          aria-label={`Toggle completion for ${item.block.title}`}
                          disabled={busy}
                          onClick={() =>
                            act(() =>
                              toggleTask(
                                uid,
                                tasks.find((t) => t.id === item.block.taskId)!,
                              ),
                            )
                          }
                        >
                          {tasks.find((t) => t.id === item.block.taskId)
                            ?.completed && <Check size={15} />}
                        </button>
                      )}
                  </div>
                )}
              </div>
            ))}
            <div className="timeline-end">
              <span className="time-label">{settings.endTime}</span>
              <span>And then, time to switch off.</span>
            </div>
          </div>
          {blocks.length > 0 && (
            <button
              className="default-schedule text-button"
              disabled={busy || !!error}
              onClick={() =>
                act(() => applyRoutines(uid, date, routines, blocks, settings))
              }
            >
              <Sun size={16} />
              Use my default schedule
            </button>
          )}
          <div className="page-foot">You don’t have to fill every moment.</div>
        </>
      )}
      {editing !== undefined && (
        <BlockEditor
          uid={uid}
          date={date}
          block={editing}
          tasks={tasks}
          blocks={blocks}
          settings={settings}
          onClose={() => setEditing(undefined)}
        />
      )}{" "}
      {configure && (
        <SettingsEditor
          uid={uid}
          settings={settings}
          routines={routines}
          blocks={blocks}
          onClose={() => setConfigure(false)}
        />
      )}
    </>
  );
}
function CalendarLabel({ date }: { date: string }) {
  const d = new Date(`${date}T12:00:00`);
  return (
    <>
      <strong>
        {d.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </strong>
      <span className="date-year">{d.getFullYear()}</span>
    </>
  );
}
function BlockEditor({
  uid,
  date,
  block,
  tasks,
  blocks,
  settings,
  onClose,
}: {
  uid: string;
  date: string;
  block: DayBlock | null;
  tasks: Task[];
  blocks: DayBlock[];
  settings: DaySettings;
  onClose: () => void;
}) {
  const gap = freeGaps(blocks, settings)[0];
  const [type, setType] = useState<DayBlock["type"]>(block?.type ?? "custom");
  const [taskId, setTaskId] = useState(block?.taskId ?? "");
  const [title, setTitle] = useState(block?.title ?? "");
  const [start, setStart] = useState(
    block?.startTime ?? gap?.startTime ?? settings.startTime,
  );
  const [end, setEnd] = useState(
    block?.endTime ??
      toTime(
        Math.min(
          toMinutes(gap?.startTime ?? settings.startTime) + 60,
          toMinutes(gap?.endTime ?? settings.endTime),
        ),
      ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      id: block?.id || crypto.randomUUID(),
      title: title.trim(),
      description: String(form.get("description")),
      startTime: start,
      endTime: end,
      type,
      taskId: type === "task" ? taskId : null,
      order: toMinutes(start),
    };
    const problem = validateBlock(data, blocks, settings);
    if (problem) {
      setError(problem);
      return;
    }
    if (type === "task" && !tasks.some((t) => t.id === taskId)) {
      setError("Choose an available task.");
      return;
    }
    setBusy(true);
    try {
      await saveBlock(uid, date, data, !block?.id);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await deleteBlock(uid, date, block!.id);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={block?.id ? "Edit your block" : "Make a little space"}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Block type
            <div className="segmented">
              {(["task", "routine", "custom"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={type === t ? "selected" : ""}
                  onClick={() => setType(t)}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </label>
          {type === "task" && (
            <label>
              Choose a task
              <select
                required
                value={taskId}
                onChange={(e) => {
                  setTaskId(e.target.value);
                  const task = tasks.find((t) => t.id === e.target.value);
                  if (task) {
                    setTitle(task.title);
                    if (task.estimatedMinutes)
                      setEnd(
                        toTime(
                          Math.min(
                            toMinutes(start) + task.estimatedMinutes,
                            1439,
                          ),
                        ),
                      );
                  }
                }}
              >
                <option value="">Select from your tasks</option>
                {tasks
                  .filter((t) => !t.completed || t.id === taskId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                      {t.estimatedMinutes
                        ? ` · ${formatDuration(t.estimatedMinutes)}`
                        : ""}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Title
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this time for?"
            />
          </label>
          <div className="form-row">
            <label>
              Start time
              <input
                type="time"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              End time
              <input
                type="time"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          {duration(start, end) > 0 && (
            <p className="duration-hint">
              <Clock3 size={14} />
              {formatDuration(duration(start, end))} set aside
            </p>
          )}
          <label>
            Notes <span className="optional">optional</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={block?.description}
              placeholder="Anything you want to remember…"
            />
          </label>
        </fieldset>
        <ErrorNotice message={error} />
        <div className="sheet-actions">
          {block?.id && (
            <button
              type="button"
              className="icon-button danger"
              aria-label="Delete block"
              disabled={busy}
              onClick={() => setConfirm(true)}
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
            {busy ? "Saving…" : "Save block"}
          </button>
        </div>
        {confirm && (
          <div className="delete-confirm">
            <p>Remove this block? Your linked task will stay in Tasks.</p>
            <button
              type="button"
              className="secondary danger"
              disabled={busy}
              onClick={remove}
            >
              Remove block
            </button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
function SettingsEditor({
  uid,
  settings,
  routines,
  blocks,
  onClose,
}: {
  uid: string;
  settings: DaySettings;
  routines: RoutineBlock[];
  blocks: DayBlock[];
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<RoutineBlock | null | undefined>();
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = {
      startTime: String(form.get("start")),
      endTime: String(form.get("end")),
    };
    await act(async () => {
      if (duration(next.startTime, next.endTime) <= 0)
        throw new Error("End of day must be later than start of day.");
      if (
        [...routines, ...blocks].some(
          (b) => b.startTime < next.startTime || b.endTime > next.endTime,
        )
      )
        throw new Error(
          "These hours would exclude a routine or a block on the selected day. Adjust those blocks first.",
        );
      await saveSettings(uid, next);
      setMessage("Day hours saved.");
    });
  }
  return (
    <Sheet title="Configure My Day" onClose={onClose} busy={busy}>
      <p className="sheet-subtitle">
        A gentle rhythm to build your day around.
      </p>
      <form onSubmit={submit}>
        <div className="form-row">
          <label>
            Start of day
            <input
              type="time"
              name="start"
              defaultValue={settings.startTime}
              required
              disabled={busy}
            />
          </label>
          <label>
            End of day
            <input
              type="time"
              name="end"
              defaultValue={settings.endTime}
              required
              disabled={busy}
            />
          </label>
        </div>
        <button className="secondary" disabled={busy}>
          Save day hours
        </button>
      </form>
      <div className="settings-divider" />
      <div className="routine-heading">
        <div>
          <h3>Your routines</h3>
          <p>Templates for the everyday things.</p>
        </div>
        <button
          className="icon-button accent"
          aria-label="Add routine"
          disabled={busy}
          onClick={() => setEditing(null)}
        >
          <Plus size={20} />
        </button>
      </div>
      {routines.length === 0 && (
        <p className="muted routine-empty">
          No routines yet. Start with breakfast, a walk, or time to wind down.
        </p>
      )}
      {routines.map((r, i) => (
        <div className="routine-row" key={r.id}>
          <button
            className="routine-info"
            disabled={busy}
            onClick={() => setEditing(r)}
          >
            <strong>{r.title}</strong>
            <small>
              {r.startTime} – {r.endTime}
            </small>
          </button>
          <button
            className="icon-button"
            aria-label={`Move ${r.title} up`}
            disabled={busy || i === 0}
            onClick={() =>
              act(() => {
                const next = [...routines];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                return reorderRoutines(uid, next);
              })
            }
          >
            <ArrowUp size={16} />
          </button>
          <button
            className="icon-button"
            aria-label={`Move ${r.title} down`}
            disabled={busy || i === routines.length - 1}
            onClick={() =>
              act(() => {
                const next = [...routines];
                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                return reorderRoutines(uid, next);
              })
            }
          >
            <ArrowDown size={16} />
          </button>
        </div>
      ))}
      <p className="settings-note">
        Use “Use my default schedule” to copy these routines into a day. Changes
        to a day won’t change your templates.
      </p>
      <ErrorNotice message={error} />
      {message && (
        <p className="success-notice" role="status">
          {message}
        </p>
      )}
      <div className="sheet-actions">
        <button className="primary" onClick={onClose} disabled={busy}>
          Done
        </button>
      </div>
      {editing !== undefined && (
        <RoutineEditor
          uid={uid}
          routine={editing}
          routines={routines}
          settings={settings}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Sheet>
  );
}
function RoutineEditor({
  uid,
  routine,
  routines,
  settings,
  onClose,
}: {
  uid: string;
  routine: RoutineBlock | null;
  routines: RoutineBlock[];
  settings: DaySettings;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      id: routine?.id ?? crypto.randomUUID(),
      title: String(form.get("title")).trim(),
      description: String(form.get("description")),
      startTime: String(form.get("start")),
      endTime: String(form.get("end")),
      order: routine?.order ?? routines.length,
    };
    const problem = validateBlock(data, routines, settings);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      await saveRoutine(uid, data, !routine);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={routine ? "Edit routine" : "A new routine"}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Routine title
            <input
              name="title"
              placeholder="Morning routine"
              required
              defaultValue={routine?.title}
              maxLength={200}
            />
          </label>
          <div className="form-row">
            <label>
              Start time
              <input
                name="start"
                type="time"
                required
                defaultValue={routine?.startTime ?? settings.startTime}
              />
            </label>
            <label>
              End time
              <input
                name="end"
                type="time"
                required
                defaultValue={
                  routine?.endTime ??
                  toTime(
                    Math.min(
                      toMinutes(settings.startTime) + 60,
                      toMinutes(settings.endTime),
                    ),
                  )
                }
              />
            </label>
          </div>
          <label>
            Notes
            <textarea
              name="description"
              rows={2}
              defaultValue={routine?.description}
            />
          </label>
        </fieldset>
        <ErrorNotice message={error} />
        <div className="sheet-actions">
          {routine && (
            <button
              type="button"
              className="icon-button danger"
              aria-label="Delete routine"
              disabled={busy}
              onClick={() => setConfirm(true)}
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
            {busy ? "Saving…" : "Save routine"}
          </button>
        </div>
        {confirm && (
          <div className="delete-confirm">
            <p>
              Delete this routine template? Existing daily blocks will stay.
            </p>
            <button
              type="button"
              className="secondary danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await deleteRoutine(uid, routine!.id);
                  onClose();
                } catch (e) {
                  setError(errorMessage(e));
                  setBusy(false);
                }
              }}
            >
              Delete routine
            </button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
