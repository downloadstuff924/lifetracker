import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const port = 9234;
const chrome = spawn(
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.resolve(".browser-profile")}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
let socket;
try {
  let target;
  for (let i = 0; i < 40; i++) {
    try {
      target = await (
        await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:3000`, {
          method: "PUT",
        })
      ).json();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (!target) throw new Error("Chrome did not start");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => socket.addEventListener("open", r, { once: true }));
  let seq = 0;
  const pending = new Map();
  socket.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id);
      if (p) {
        pending.delete(m.id);
        if (m.error) p.reject(new Error(m.error.message));
        else p.resolve(m.result);
      }
    }
  });
  const call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) =>
    (
      await call("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
    ).result?.value;
  await call("Page.enable");
  await call("Runtime.enable");
  for (let i = 0; i < 80; i++) {
    if (await evaluate("!!document.querySelector('input[name=email]')")) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!(await evaluate("!!document.querySelector('input[name=email]')")))
    throw new Error("Sign-in form did not appear");
  await mkdir("artifacts", { recursive: true });
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: name === "mobile",
    });
    await new Promise((r) => setTimeout(r, 300));
    const overflow = await evaluate(
      "document.documentElement.scrollWidth > innerWidth",
    );
    if (overflow) throw new Error(`${name} has horizontal overflow`);
    const shot = await call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(
      `artifacts/auth-${name}.png`,
      Buffer.from(shot.data, "base64"),
    );
    console.log(`PASS ${name}: sign-in form, no horizontal overflow`);
  }
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Create account').click()",
  );
  if (
    !(await evaluate(
      "document.querySelector('input[name=password]').autocomplete==='new-password'",
    ))
  ) {
    await new Promise((r) => setTimeout(r, 250));
  }
  if (
    !(await evaluate(
      "document.querySelector('input[name=password]').autocomplete==='new-password'",
    ))
  )
    throw new Error("Signup tab failed");
  console.log("PASS signup tab");
  await call("Browser.close");
} finally {
  socket?.close();
  chrome.kill();
}
