#!/usr/bin/env python3
"""VexOS DevStudio server.

Serves the web IDE and a small JSON API on 127.0.0.1 only. It manages the
workspace (~/VexProjects), runs code (C, C++, Python, JavaScript, Rust, shell,
and project scripts), creates starter projects, and forwards AI requests to
the Groq API with the key stored in the user's settings.

Security model:
  * Listens on 127.0.0.1 only.
  * Rejects requests whose Host header is not localhost or 127.0.0.1 (stops DNS rebinding).
  * Every /api/ call needs the X-VexDev-Token header. The token is random per
    start and is only given to pages served by this server, so other websites
    cannot call the API.
  * File access is limited to the workspace folder.
  * The Groq API key is stored in ~/.config/vexos-devstudio/settings.json (mode 0600)
    and is never sent back to the browser (only a masked hint is).
"""

import json
import os
import re
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

VERSION = "1.0"
WEB_DIR = Path(os.environ.get("VEXDEV_WEB", "/usr/share/vexos-devstudio/web"))
HOST = "127.0.0.1"
PORT = int(os.environ.get("VEXDEV_PORT", "8765"))
HOME = Path.home()
WORKSPACE = Path(os.environ.get("VEXDEV_WORKSPACE", HOME / "VexProjects"))
CONFIG_DIR = HOME / ".config" / "vexos-devstudio"
SETTINGS_FILE = CONFIG_DIR / "settings.json"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "llama-3.3-70b-versatile"
TOKEN = secrets.token_urlsafe(24)

MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_JOB_OUTPUT = 4 * 1024 * 1024
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
URL_RE = re.compile(r"https?://(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)")
RUNTIMES = ["gcc", "g++", "python3", "node", "npm", "npx", "cargo", "rustc", "make", "gdb", "git"]


# ---------------------------------------------------------------- helpers

def ensure_dirs():
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    os.chmod(CONFIG_DIR, 0o700)


def safe_path(rel):
    """Resolve a workspace-relative path. Refuses anything outside WORKSPACE."""
    rel = (rel or "").strip().lstrip("/")
    target = (WORKSPACE / rel).resolve()
    root = WORKSPACE.resolve()
    if target != root and root not in target.parents:
        raise ApiError(400, "path is outside the workspace")
    return target


def rel_of(p):
    return str(p.resolve().relative_to(WORKSPACE.resolve())) if p.resolve() != WORKSPACE.resolve() else ""


def tool_version(name):
    exe = shutil.which(name)
    if not exe:
        return None
    try:
        out = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=5)
        line = (out.stdout or out.stderr).strip().splitlines()
        return line[0][:80] if line else "installed"
    except Exception:
        return "installed"


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


# ---------------------------------------------------------------- settings

def load_settings():
    try:
        return json.loads(SETTINGS_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_settings(data):
    ensure_dirs()
    tmp = SETTINGS_FILE.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, SETTINGS_FILE)
    os.chmod(SETTINGS_FILE, 0o600)


def mask_key(key):
    if not key:
        return ""
    return key[:4] + "..." + key[-4:] if len(key) > 8 else "set"


# ---------------------------------------------------------------- jobs

class Job:
    _lock = threading.Lock()
    _jobs = {}
    _seq = 0

    def __init__(self, title, steps, cwd):
        with Job._lock:
            Job._seq += 1
            self.id = str(Job._seq)
            Job._jobs[self.id] = self
        self.title = title
        self.steps = steps          # list of argv lists, run in order
        self.cwd = str(cwd)
        self.output = ""
        self.status = "queued"      # queued | running | exited | stopped
        self.exit_code = None
        self.url = None
        self.proc = None
        self.lock = threading.Lock()
        self.started = time.time()
        threading.Thread(target=self._run, daemon=True).start()

    @classmethod
    def get(cls, job_id):
        with cls._lock:
            return cls._jobs.get(job_id)

    @classmethod
    def stop_all(cls):
        with cls._lock:
            jobs = list(cls._jobs.values())
        for j in jobs:
            j.stop()

    def _append(self, text):
        with self.lock:
            self.output += text
            if len(self.output) > MAX_JOB_OUTPUT:
                self.output = self.output[-MAX_JOB_OUTPUT:]
            m = URL_RE.search(text)
            if m and not self.url:
                # "localhost" works for IPv4 and IPv6 dev servers (Vite listens on ::1 only).
                self.url = f"http://localhost:{m.group(1)}/"

    def _run(self):
        self.status = "running"
        last_code = 0
        for argv in self.steps:
            if self.status == "stopped":
                break
            self._append(f"$ {' '.join(argv)}\n")
            try:
                self.proc = subprocess.Popen(
                    argv, cwd=self.cwd, stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    start_new_session=True,
                    env={**os.environ, "PYTHONUNBUFFERED": "1", "FORCE_COLOR": "0", "NO_COLOR": "1"},
                )
            except FileNotFoundError:
                self._append(f"error: '{argv[0]}' is not installed. Install it with apt, or see the Docs.\n")
                last_code = 127
                break
            while True:
                chunk = self.proc.stdout.read1(4096) if hasattr(self.proc.stdout, "read1") else self.proc.stdout.read(4096)
                if not chunk:
                    break
                self._append(chunk.decode("utf-8", "replace"))
            last_code = self.proc.wait()
            self.proc = None
            if last_code != 0:
                self._append(f"[exit {last_code}]\n")
                break
        if self.status != "stopped":
            self.status = "exited"
        self.exit_code = last_code

    def write(self, text):
        p = self.proc
        if not p or not p.stdin or p.poll() is not None:
            raise ApiError(409, "the program is not waiting for input")
        try:
            p.stdin.write(text.encode())
            p.stdin.flush()
        except BrokenPipeError:
            raise ApiError(409, "the program has finished")

    def stop(self):
        self.status = "stopped"
        p = self.proc
        if p and p.poll() is None:
            try:
                os.killpg(p.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass

    def view(self, offset):
        with self.lock:
            total = len(self.output)
            start = max(0, min(offset, total))
            return {
                "id": self.id,
                "title": self.title,
                "status": self.status,
                "exit_code": self.exit_code,
                "url": self.url,
                "output": self.output[start:],
                "next_offset": total,
                "running": self.status in ("queued", "running"),
            }


# ---------------------------------------------------------------- run planning

def c_steps(src, cwd):
    out = src.parent / ".vexbuild" / src.stem
    out.parent.mkdir(parents=True, exist_ok=True)
    return [
        ["gcc", "-std=c17", "-Wall", "-Wextra", "-O2", "-g", str(src), "-o", str(out), "-lm"],
        [str(out)],
    ]


def plan_file(path):
    ext = path.suffix.lower()
    if ext == ".c":
        return c_steps(path, path.parent)
    if ext in (".cpp", ".cc", ".cxx"):
        out = path.parent / ".vexbuild" / path.stem
        out.parent.mkdir(parents=True, exist_ok=True)
        return [["g++", "-std=c++17", "-Wall", "-Wextra", "-O2", str(path), "-o", str(out)], [str(out)]]
    if ext == ".py":
        return [["python3", "-u", str(path)]]
    if ext in (".js", ".mjs", ".cjs"):
        return [["node", str(path)]]
    if ext == ".sh":
        return [["bash", str(path)]]
    if ext == ".rs":
        for parent in [path.parent, *path.parents]:
            if (parent / "Cargo.toml").exists():
                return [["cargo", "run", "--manifest-path", str(parent / "Cargo.toml")]]
            if parent == WORKSPACE.resolve():
                break
        out = path.parent / ".vexbuild" / path.stem
        out.parent.mkdir(parents=True, exist_ok=True)
        return [["rustc", "-O", "-o", str(out), str(path)], [str(out)]]
    if ext in (".ts",):
        return [["npx", "--yes", "tsx", str(path)]]
    raise ApiError(400, f"no runner for '{path.name}'. Supported: .c .cpp .py .js .rs .sh .ts")


def plan_folder(path):
    if (path / "Cargo.toml").exists():
        return [["cargo", "run"]]
    if (path / "package.json").exists():
        steps = []
        if not (path / "node_modules").exists():
            steps.append(["npm", "install"])
        try:
            scripts = json.loads((path / "package.json").read_text()).get("scripts", {})
        except json.JSONDecodeError:
            scripts = {}
        for name in ("dev", "start"):
            if name in scripts:
                return steps + [["npm", "run", name]]
        if steps:
            return steps
        raise ApiError(400, "package.json has no 'dev' or 'start' script")
    mains = sorted(path.glob("*.c"))
    if mains:
        # Compile and run directly, so the program's output shows up in the panel.
        return c_steps(mains[0], path)
    if (path / "Makefile").exists() or (path / "makefile").exists():
        return [["make"]]
    pys = sorted(path.glob("*.py"))
    if pys:
        return [["python3", "-u", str(pys[0])]]
    raise ApiError(400, "nothing to run in this folder")


# ---------------------------------------------------------------- templates

TEMPLATES_FILES = {
    "c": {
        "main.c": '#include <stdio.h>\n\nint main(void) {\n    printf("Hello from C on VexOS!\\n");\n    return 0;\n}\n',
        "Makefile": "CC = gcc\nCFLAGS = -std=c17 -Wall -Wextra -O2\n\nall: main\n\nmain: main.c\n\t$(CC) $(CFLAGS) -o main main.c\n\nclean:\n\trm -f main\n",
    },
    "python": {
        "main.py": 'def main():\n    print("Hello from Python on VexOS!")\n\n\nif __name__ == "__main__":\n    main()\n',
        "requirements.txt": "",
    },
    "node": {
        "index.js": 'console.log("Hello from Node " + process.version + " on VexOS!");\n',
        "package.json": json.dumps({"name": "app", "version": "1.0.0", "main": "index.js",
                                    "scripts": {"start": "node index.js"}}, indent=2) + "\n",
    },
    "static": {
        "index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Hello</title>\n</head>\n<body>\n  <h1>Hello from VexOS</h1>\n  <script src=\"app.js\"></script>\n</body>\n</html>\n",
        "app.js": 'console.log("Hello from the browser on VexOS");\n',
    },
}


def scaffold_steps(kind, name):
    """Return argv steps for project types that need a generator, or None for file-based ones."""
    if kind == "react":
        return [["bash", "-lc",
                 f"npx --yes create-vite@latest {name} --template react --no-interactive --no-immediate && cd {name} && npm install"]]
    if kind == "next":
        return [["bash", "-lc",
                 f"npx --yes create-next-app@latest {name} --ts --app --src-dir --eslint --tailwind "
                 f"--import-alias '@/*' --use-npm --yes"]]
    if kind == "rust":
        return [["cargo", "new", name]]
    return None


# ---------------------------------------------------------------- AI

AI_SYSTEM = (
    "You are VexOS AI, the coding assistant inside VexOS DevStudio, a Linux development environment. "
    "Answer briefly and precisely. When you give code, put the complete code in one fenced block with a "
    "language tag. Explain errors in plain words, then give the fix."
)


def groq_chat(messages, context):
    settings = load_settings()
    key = settings.get("groq_api_key", "")
    if not key:
        raise ApiError(400, "Add your Groq API key in Settings (the gear button) to use the AI assistant.")
    model = settings.get("model") or DEFAULT_MODEL
    system = AI_SYSTEM
    ctx = []
    if context.get("file"):
        ctx.append(f"Current file: {context['file']}")
    if context.get("language"):
        ctx.append(f"Language: {context['language']}")
    if context.get("code"):
        ctx.append("Code:\n```\n" + context["code"][:20000] + "\n```")
    if context.get("error"):
        ctx.append("Last output or error:\n```\n" + context["error"][-6000:] + "\n```")
    if ctx:
        system += "\n\n" + "\n\n".join(ctx)
    clean = [{"role": "system", "content": system}]
    for m in messages[-20:]:
        role = m.get("role")
        if role in ("user", "assistant"):
            clean.append({"role": role, "content": str(m.get("content", ""))[:8000]})
    body = json.dumps({"model": model, "messages": clean, "temperature": 0.3, "max_tokens": 2048}).encode()
    req = urllib.request.Request(GROQ_URL, data=body, method="POST", headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
        "User-Agent": "VexOS-DevStudio/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        if e.code in (401, 403):
            raise ApiError(401, "Groq rejected the API key. Check it in Settings.")
        raise ApiError(502, f"Groq returned HTTP {e.code}: {detail}")
    except urllib.error.URLError as e:
        raise ApiError(502, f"Could not reach api.groq.com ({e.reason}). Check the internet connection.")
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise ApiError(502, "Groq sent an unexpected reply.")


# ---------------------------------------------------------------- HTTP

class Handler(BaseHTTPRequestHandler):
    server_version = "VexDevStudio/" + VERSION

    def log_message(self, fmt, *args):  # keep the journal quiet
        pass

    # -- plumbing
    def _host_ok(self):
        host = (self.headers.get("Host") or "").split(":")[0]
        return host in ("127.0.0.1", "localhost")

    def _send(self, status, body, ctype="application/json", extra=None):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def _json(self, status, obj):
        self._send(status, json.dumps(obj))

    def _error(self, status, message):
        self._json(status, {"error": message})

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 8 * 1024 * 1024:
            raise ApiError(413, "request too large")
        raw = self.rfile.read(n) if n else b"{}"
        try:
            return json.loads(raw.decode() or "{}")
        except json.JSONDecodeError:
            raise ApiError(400, "invalid JSON")

    def _check_api(self):
        if not self._host_ok():
            raise ApiError(403, "bad host")
        if self.headers.get("X-VexDev-Token") != TOKEN:
            raise ApiError(403, "missing or wrong token")

    # -- routing
    def do_GET(self):
        try:
            self._route("GET")
        except ApiError as e:
            self._error(e.status, e.message)
        except Exception as e:  # never leak a stack trace to the page
            self._error(500, f"internal error: {type(e).__name__}: {e}")

    def do_POST(self):
        self._dispatch_write("POST")

    def do_PUT(self):
        self._dispatch_write("PUT")

    def _dispatch_write(self, method):
        try:
            self._route(method)
        except ApiError as e:
            self._error(e.status, e.message)
        except Exception as e:
            self._error(500, f"internal error: {type(e).__name__}: {e}")

    def _route(self, method):
        if not self._host_ok():
            raise ApiError(403, "bad host")
        url = urlparse(self.path)
        path = unquote(url.path)
        query = parse_qs(url.query)

        if method == "GET" and path in ("/", "/index.html"):
            return self._index()
        if method == "GET" and path in ("/app.js", "/app.css"):
            return self._static(path.lstrip("/"))
        if method == "GET" and path.startswith("/preview/"):
            return self._preview(path[len("/preview/"):])

        if not path.startswith("/api/"):
            raise ApiError(404, "not found")
        self._check_api()

        if method == "GET" and path == "/api/info":
            return self._json(200, {
                "version": VERSION,
                "workspace": str(WORKSPACE),
                "home": str(HOME),
                "model": load_settings().get("model") or DEFAULT_MODEL,
                "runtimes": {name: tool_version(name) for name in RUNTIMES},
            })
        if method == "GET" and path == "/api/tree":
            return self._tree(query.get("path", [""])[0])
        if method == "GET" and path == "/api/file":
            return self._read_file(query.get("path", [""])[0])
        if method == "PUT" and path == "/api/file":
            return self._write_file()
        if method == "POST" and path == "/api/mkdir":
            body = self._body()
            target = safe_path(body.get("path", ""))
            target.mkdir(parents=True, exist_ok=True)
            return self._json(200, {"path": rel_of(target)})
        if method == "POST" and path == "/api/delete":
            body = self._body()
            target = safe_path(body.get("path", ""))
            if target == WORKSPACE.resolve():
                raise ApiError(400, "cannot delete the workspace itself")
            if target.is_dir():
                shutil.rmtree(target)
            elif target.exists():
                target.unlink()
            else:
                raise ApiError(404, "not found")
            return self._json(200, {"ok": True})
        if method == "POST" and path == "/api/rename":
            body = self._body()
            src, dst = safe_path(body.get("from", "")), safe_path(body.get("to", ""))
            if not src.exists():
                raise ApiError(404, "not found")
            if dst.exists():
                raise ApiError(409, "a file with that name already exists")
            dst.parent.mkdir(parents=True, exist_ok=True)
            src.rename(dst)
            return self._json(200, {"path": rel_of(dst)})
        if method == "POST" and path == "/api/create":
            return self._create()
        if method == "POST" and path == "/api/run":
            body = self._body()
            target = safe_path(body.get("path", ""))
            if not target.exists():
                raise ApiError(404, "not found")
            steps = plan_folder(target) if target.is_dir() else plan_file(target)
            cwd = target if target.is_dir() else target.parent
            job = Job(f"run {rel_of(target) or '.'}", steps, cwd)
            return self._json(200, {"job": job.id})
        if method == "POST" and path == "/api/exec":
            body = self._body()
            command = str(body.get("command", "")).strip()
            if not command:
                raise ApiError(400, "empty command")
            cwd = safe_path(body.get("cwd", ""))
            job = Job(f"$ {command[:60]}", [["bash", "-lc", command]], cwd)
            return self._json(200, {"job": job.id})
        if method == "GET" and path.startswith("/api/jobs/"):
            job = self._job(path)
            offset = int((query.get("offset", ["0"])[0]) or 0)
            return self._json(200, job.view(offset))
        if method == "POST" and path.endswith("/input"):
            job = self._job(path[:-len("/input")])
            job.write(str(self._body().get("text", "")) + "\n")
            return self._json(200, {"ok": True})
        if method == "POST" and path.endswith("/stop"):
            self._job(path[:-len("/stop")]).stop()
            return self._json(200, {"ok": True})
        if method == "GET" and path == "/api/settings":
            s = load_settings()
            return self._json(200, {
                "groq_key_set": bool(s.get("groq_api_key")),
                "groq_key_hint": mask_key(s.get("groq_api_key", "")),
                "model": s.get("model") or DEFAULT_MODEL,
                "default_model": DEFAULT_MODEL,
            })
        if method == "POST" and path == "/api/settings":
            body = self._body()
            s = load_settings()
            if "groq_api_key" in body:
                key = str(body["groq_api_key"]).strip()
                if key and not re.match(r"^[A-Za-z0-9_\-]{20,200}$", key):
                    raise ApiError(400, "that does not look like a Groq API key")
                s["groq_api_key"] = key
            if "model" in body:
                model = str(body["model"]).strip() or DEFAULT_MODEL
                if not re.match(r"^[A-Za-z0-9._/\-]{1,100}$", model):
                    raise ApiError(400, "invalid model name")
                s["model"] = model
            save_settings(s)
            return self._json(200, {"ok": True})
        if method == "POST" and path == "/api/ai/chat":
            body = self._body()
            reply = groq_chat(body.get("messages", []), body.get("context", {}) or {})
            return self._json(200, {"reply": reply})
        raise ApiError(404, "unknown API route")

    def _job(self, path):
        job_id = path.rsplit("/", 1)[-1]
        job = Job.get(job_id)
        if not job:
            raise ApiError(404, "no such job")
        return job

    # -- pages
    def _index(self):
        html = (WEB_DIR / "index.html").read_text()
        html = html.replace("</head>", f'<meta name="vexdev-token" content="{TOKEN}"></head>', 1)
        self._send(200, html, "text/html; charset=utf-8",
                   {"Content-Security-Policy": "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; "
                                               "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                                               "font-src 'self' data: https://cdn.jsdelivr.net; "
                                               "img-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net; "
                                               "frame-src 'self' http://localhost:* http://127.0.0.1:*; worker-src 'self' blob:"})

    def _static(self, name):
        data = (WEB_DIR / name).read_bytes()
        ctype = "text/css" if name.endswith(".css") else "application/javascript"
        self._send(200, data, ctype + "; charset=utf-8")

    def _preview(self, rel):
        target = safe_path(rel)
        if not target.is_file():
            raise ApiError(404, "not found")
        ctype = {".html": "text/html", ".css": "text/css", ".js": "application/javascript",
                 ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
                 ".svg": "image/svg+xml", ".txt": "text/plain"}.get(target.suffix.lower(), "application/octet-stream")
        # Previewed files run in an opaque origin, without access to the IDE or its token.
        self._send(200, target.read_bytes(), ctype + "; charset=utf-8" if ctype.startswith("text") else ctype,
                   {"Content-Security-Policy": "sandbox allow-scripts allow-forms allow-popups"})

    # -- file API
    def _tree(self, rel):
        base = safe_path(rel)
        if not base.is_dir():
            raise ApiError(404, "not a folder")
        entries = []
        for p in sorted(base.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))[:800]:
            if p.name in (".vexbuild",):
                continue
            entries.append({"name": p.name, "path": rel_of(p), "dir": p.is_dir(),
                            "size": 0 if p.is_dir() else p.stat().st_size})
        return self._json(200, {"path": rel_of(base), "entries": entries})

    def _read_file(self, rel):
        target = safe_path(rel)
        if not target.is_file():
            raise ApiError(404, "not found")
        if target.stat().st_size > MAX_FILE_BYTES:
            raise ApiError(413, "file is larger than 2 MB")
        raw = target.read_bytes()
        if b"\x00" in raw[:8192]:
            raise ApiError(415, "binary file: open it with another program")
        return self._json(200, {"path": rel_of(target), "content": raw.decode("utf-8", "replace")})

    def _write_file(self):
        body = self._body()
        target = safe_path(body.get("path", ""))
        if target == WORKSPACE.resolve() or target.is_dir():
            raise ApiError(400, "not a file")
        content = str(body.get("content", ""))
        if len(content.encode()) > MAX_FILE_BYTES:
            raise ApiError(413, "file is larger than 2 MB")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        return self._json(200, {"path": rel_of(target), "bytes": len(content.encode())})

    def _create(self):
        body = self._body()
        kind = str(body.get("kind", ""))
        name = str(body.get("name", "")).strip()
        if not NAME_RE.match(name):
            raise ApiError(400, "use letters, numbers, dots, dashes, underscores (max 64)")
        target = safe_path(name)
        if target.exists():
            raise ApiError(409, f"'{name}' already exists in the workspace")
        steps = scaffold_steps(kind, name)
        if steps:
            job = Job(f"create {kind} {name}", steps, WORKSPACE)
            return self._json(200, {"job": job.id, "path": name})
        files = TEMPLATES_FILES.get(kind)
        if not files:
            raise ApiError(400, "unknown project type")
        target.mkdir(parents=True)
        for fname, content in files.items():
            (target / fname).write_text(content)
        return self._json(200, {"path": name, "files": list(files)})


def main():
    ensure_dirs()
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    ThreadingHTTPServer.allow_reuse_address = True
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"VexOS DevStudio on http://{HOST}:{PORT}/ (workspace {WORKSPACE})", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        Job.stop_all()
        httpd.server_close()


if __name__ == "__main__":
    sys.exit(main())
