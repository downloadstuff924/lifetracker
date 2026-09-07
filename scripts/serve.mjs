// Local preview for the production static export. Deploy out/ to a static host.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("out");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (pathname.endsWith("/")) file = resolve(file, "index.html");
    else if (!extname(file)) file += ".html";
    let status = 200;
    try {
      await stat(file);
    } catch {
      file = resolve(root, "404.html");
      status = 404;
    }
    const body = await readFile(file);
    res.writeHead(status, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Preview unavailable. Run npm run build first.");
  }
});
server.listen(Number(process.env.PORT ?? 3000), "127.0.0.1", () =>
  console.log(
    `My Day production preview: http://127.0.0.1:${server.address().port}`,
  ),
);
