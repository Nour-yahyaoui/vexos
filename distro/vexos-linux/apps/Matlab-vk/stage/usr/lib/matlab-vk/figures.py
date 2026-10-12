"""Matlab-vk figures: plot state, data files, and the browser view.

Every figure is a page in the output folder (default ~/Matlab-vk/figures):
  figure-N.html       the page (dark theme, hover readout, grid of axes)
  figure-N.data.js    the data; the page reloads it about once a second,
                      so plots update live while you keep typing commands.
Standard library only.
"""
import json
import os
import shutil
import subprocess

from lang import MatlabError, format_num

MAX_POINTS = 3000
PALETTE = ["#ff3b3b", "#4dbeee", "#77ac30", "#edb120", "#b57edc", "#ff8c42", "#ffffff"]
COLORS = {"r": "#ff3b3b", "g": "#77ac30", "b": "#4dbeee", "k": "#e6e6e6", "m": "#d46ae0",
          "c": "#4dd0e1", "y": "#f5d04a", "w": "#ffffff"}
MARKERS = set("ox+*sd.")
LINE_STYLES = [("--", "--"), ("-.", "-."), (":", ":")]


class Series:
    def __init__(self, x, y, color, line, marker, label=None):
        self.x, self.y = x, y
        self.color, self.line, self.marker, self.label = color, line, marker, label


class Axes:
    def __init__(self):
        self.series = []
        self.hold = False
        self.grid = False
        self.title = ""
        self.xlabel = ""
        self.ylabel = ""


class Figure:
    def __init__(self, number):
        self.number = number
        self.rows = 1
        self.cols = 1
        self.current = 1
        self.axes = {}
        self.version = 0
        self.announced = False


def parse_style(text):
    """Turn a MATLAB style string like 'r--' or 'go' into (color, line, marker)."""
    color, line, marker = None, "-", None
    rest = text
    for pattern, value in LINE_STYLES:
        if pattern in rest:
            line = value
            rest = rest.replace(pattern, "", 1)
            break
    for ch in rest:
        if ch == "-":
            continue
        if ch in COLORS:
            color = COLORS[ch]
        elif ch in MARKERS:
            marker = ch
        else:
            raise MatlabError(f"unknown plot style '{text}'")
    return color, line, marker


def decimate(x, y, limit=MAX_POINTS):
    n = len(y)
    if n <= limit:
        return x, y
    step = -(-n // limit)
    xs, ys = x[::step], y[::step]
    if xs[-1] != x[-1]:
        xs.append(x[-1])
        ys.append(y[-1])
    return xs, ys


def payload(fig):
    axes = []
    for idx in range(1, fig.rows * fig.cols + 1):
        ax = fig.axes.get(idx)
        if ax is None:
            axes.append({"index": idx, "empty": True})
            continue
        series = []
        for s in ax.series:
            xs, ys = decimate(s.x, s.y)
            series.append({"x": xs, "y": ys, "color": s.color, "line": s.line,
                           "marker": s.marker, "label": s.label})
        axes.append({"index": idx, "empty": False, "title": ax.title, "xlabel": ax.xlabel,
                     "ylabel": ax.ylabel, "grid": ax.grid, "series": series})
    return {"version": fig.version, "number": fig.number, "rows": fig.rows,
            "cols": fig.cols, "axes": axes}


def page_html(title, head_script, live, src=""):
    """head_script: the <script> tag(s) that load the data.
    live: poll src (a data file next to the page) once a second."""
    return (PAGE_TEMPLATE
            .replace("__TITLE__", title)
            .replace("__DATA__", head_script)
            .replace("__LIVE__", "true" if live else "false")
            .replace("__SRC__", src))


class Graphics:
    def __init__(self, out_dir, out, display):
        self.out_dir = out_dir
        self.out = out
        self.display = display
        self.figures = {}
        self.current = None

    # -- state helpers
    def gcf(self):
        if self.current is None or self.current not in self.figures:
            self.new_figure()
        return self.figures[self.current]

    def axes_now(self):
        fig = self.gcf()
        if fig.current not in fig.axes:
            fig.axes[fig.current] = Axes()
        return fig.axes[fig.current]

    def new_figure(self, number=None):
        if number is None:
            number = max(self.figures, default=0) + 1
        if number not in self.figures:
            self.figures[number] = Figure(number)
        self.current = number
        return self.figures[number]

    def touch(self, fig):
        fig.version += 1
        self.publish(fig)

    # -- dispatch
    def call(self, name, args):
        handler = getattr(self, "f_" + name, None)
        if handler is None:
            raise MatlabError(f"'{name}' is not a graphics function")
        return handler(args)

    @staticmethod
    def text(v):
        if isinstance(v, list):
            raise MatlabError("expected text here")
        return v if isinstance(v, str) else format_num(v)

    def f_plot(self, args):
        if not args:
            raise MatlabError("plot needs data, for example plot(x, y)")
        new = []
        i = 0
        while i < len(args):
            v = args[i]
            if isinstance(v, str):
                if not new:
                    raise MatlabError("a style like 'r--' must follow the data")
                color, line, marker = parse_style(v)
                last = new[-1]
                last["color"] = color or last["color"]
                last["line"], last["marker"] = line, marker
                i += 1
                continue
            nxt = args[i + 1] if i + 1 < len(args) else None
            if nxt is not None and not isinstance(nxt, str):
                x, y = to_floats(v), to_floats(nxt)
                i += 2
            else:
                y = to_floats(v)
                x = [float(k + 1) for k in range(len(y))]
                i += 1
            if len(x) != len(y):
                raise MatlabError(f"x and y must be the same length ({len(x)} and {len(y)})")
            new.append({"x": x, "y": y, "color": None, "line": "-", "marker": None})

        ax = self.axes_now()
        fig = self.gcf()
        if not ax.hold:
            ax.series = []
        for item in new:
            color = item["color"] or PALETTE[len(ax.series) % len(PALETTE)]
            ax.series.append(Series(item["x"], item["y"], color, item["line"], item["marker"]))
        self.touch(fig)
        if not self.display:
            self.print_text_plot(ax)

    def print_text_plot(self, ax):
        """Text mode (no display): one summary line for the newest series."""
        if not ax.series:
            return
        s = ax.series[-1]
        if not s.y:
            return
        self.out(f"  plot: {len(s.y)} points, x from {min(s.x):g} to {max(s.x):g}, "
                 f"y from {min(s.y):g} to {max(s.y):g}")

    def f_hold(self, args):
        ax = self.axes_now()
        ax.hold = toggle(ax.hold, args)

    def f_grid(self, args):
        ax = self.axes_now()
        ax.grid = toggle(ax.grid, args)
        self.touch(self.gcf())

    def f_title(self, args):
        self.axes_now().title = self.text(args[0]) if args else ""
        self.touch(self.gcf())

    def f_xlabel(self, args):
        self.axes_now().xlabel = self.text(args[0]) if args else ""
        self.touch(self.gcf())

    def f_ylabel(self, args):
        self.axes_now().ylabel = self.text(args[0]) if args else ""
        self.touch(self.gcf())

    def f_legend(self, args):
        ax = self.axes_now()
        labels = [self.text(a) for a in args]
        if labels in (["off"], ["hide"]):
            for s in ax.series:
                s.label = None
        else:
            for k, lab in enumerate(labels):
                if k < len(ax.series):
                    ax.series[k].label = lab
        self.touch(self.gcf())

    def f_subplot(self, args):
        if len(args) != 3:
            raise MatlabError("subplot(rows, cols, index)")
        rows, cols, idx = (int(to_scalar(a)) for a in args)
        if rows < 1 or cols < 1 or not 1 <= idx <= rows * cols:
            raise MatlabError("subplot index is out of range")
        fig = self.gcf()
        fig.rows, fig.cols, fig.current = rows, cols, idx
        self.axes_now()
        self.touch(fig)

    def f_figure(self, args):
        number = int(to_scalar(args[0])) if args else None
        fig = self.new_figure(number)
        self.touch(fig)

    def f_clf(self, args):
        fig = self.gcf()
        fig.axes = {}
        self.touch(fig)

    def f_close(self, args):
        if args and args[0] == "all":
            self.figures.clear()
            self.current = None
        elif args:
            self.figures.pop(int(to_scalar(args[0])), None)
            if self.current not in self.figures:
                self.current = None
        else:
            if self.current is not None:
                self.figures.pop(self.current, None)
            self.current = None

    def f_gcf(self, args):
        return float(self.gcf().number)

    def f_saveas(self, args):
        if len(args) != 2:
            raise MatlabError("saveas(gcf, 'name.html')")
        fig = self.figures.get(int(to_scalar(args[0]))) or self.gcf()
        path = self.text(args[1])
        if not path.lower().endswith((".html", ".htm")):
            raise MatlabError("saveas writes .html pages")
        data = "window.MVK = " + json.dumps(payload(fig)) + ";"
        with open(path, "w", encoding="utf-8") as f:
            f.write(page_html(f"Figure {fig.number}", "<script>" + data + "</script>", False))
        self.out(f"saved {os.path.abspath(path)}")

    # -- output
    def publish(self, fig):
        os.makedirs(self.out_dir, exist_ok=True)
        base = os.path.join(self.out_dir, f"figure-{fig.number}")
        with open(base + ".data.js", "w", encoding="utf-8") as f:
            f.write("window.MVK = " + json.dumps(payload(fig)) + ";\n")
        if not os.path.exists(base + ".html"):
            with open(base + ".html", "w", encoding="utf-8") as f:
                f.write(page_html(f"Figure {fig.number}",
                                  f'<script src="figure-{fig.number}.data.js"></script>', True,
                                  f"figure-{fig.number}.data.js"))
        if not fig.announced:
            fig.announced = True
            if self.display and open_in_browser(base + ".html"):
                self.out(f"figure {fig.number} opened in your browser ({base}.html)")
            else:
                self.out(f"figure {fig.number}: {base}.html")


def to_floats(v):
    if isinstance(v, str):
        raise MatlabError("text cannot be plotted")
    return [float(a) for a in (v if isinstance(v, list) else [v])]


def to_scalar(v):
    if isinstance(v, list):
        if len(v) != 1:
            raise MatlabError("expected a single number")
        return v[0]
    if isinstance(v, str):
        try:
            return float(v)
        except ValueError:
            raise MatlabError(f"expected a number, got '{v}'")
    return v


def toggle(current, args):
    if args:
        word = args[0] if isinstance(args[0], str) else format_num(args[0])
        word = word.lower()
        if word in ("on", "1"):
            return True
        if word in ("off", "0"):
            return False
        raise MatlabError(f"expected 'on' or 'off', got '{word}'")
    return not current


def open_in_browser(path):
    """Open the page in the desktop browser. Returns False if no opener is found."""
    for opener in ("xdg-open", "firefox-esr", "firefox"):
        exe = shutil.which(opener)
        if exe:
            try:
                subprocess.Popen([exe, path], stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL, start_new_session=True)
                return True
            except OSError:
                return False
    return False


PAGE_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__ · Matlab-vk</title>
__DATA__
<style>
  :root { --red:#ff3b3b; --red-deep:#a40f2c; --red-soft:#ff7a7a; --bg:#07060a; --card:rgba(23,19,26,.72); --line:rgba(255,59,59,.18); --text:#f4eef0; --muted:#9b9196; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; font-family: Inter, "Segoe UI", system-ui, sans-serif; color:var(--text);
         background: radial-gradient(900px 500px at 85% -10%, rgba(255,59,59,.16), transparent 60%),
                     radial-gradient(700px 500px at -10% 110%, rgba(120,70,255,.12), transparent 60%), var(--bg); }
  header { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:14px; padding:14px 22px;
           background: rgba(7,6,10,.8); backdrop-filter: blur(12px); border-bottom:1px solid var(--line); }
  header img { width:30px; height:30px; object-fit:contain; }
  header h1 { font-size:15px; margin:0; letter-spacing:.08em; text-transform:uppercase; }
  header .status { margin-left:auto; color:var(--muted); font-size:13px; }
  header .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#77ac30; margin-right:6px; box-shadow:0 0 10px #77ac30; }
  main { padding:22px; }
  #figure { display:grid; gap:18px; grid-template-columns: minmax(0,1fr); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px 16px 10px;
          backdrop-filter: blur(10px); min-width:0; animation: rise .35s ease-out both; }
  .card-head { display:flex; align-items:center; gap:12px; margin-bottom:6px; min-height:24px; }
  .card-head h2 { font-size:15px; margin:0; font-weight:600; }
  .readout { margin-left:auto; font: 13px ui-monospace, "JetBrains Mono", monospace; color:var(--red-soft); white-space:nowrap; }
  .empty { color:var(--muted); font-size:14px; margin:18px 0 10px; text-align:center; }
  svg.plot { width:100%; height:auto; display:block; }
  .bg { fill:#0b0a0f; }
  .gridline { stroke: rgba(255,255,255,.08); stroke-width:1; }
  .frame { fill:none; stroke: rgba(255,255,255,.22); }
  .tick { fill: var(--muted); font-size: 12px; font-family: ui-monospace, "JetBrains Mono", monospace; }
  .axis-label { fill: var(--text); font-size: 13px; }
  .series { fill:none; stroke-width:2.2; stroke-linejoin:round; stroke-linecap:round; }
  .legend-box { fill: rgba(11,10,15,.85); stroke: rgba(255,255,255,.14); }
  .legend-text { fill: var(--text); font-size: 12px; }
  .cross { stroke: rgba(255,255,255,.35); stroke-dasharray: 3 4; }
  @keyframes rise { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
  @media (min-width: 900px) { #figure { grid-template-columns: repeat(var(--cols,1), minmax(0,1fr)); } }
  @media (prefers-reduced-motion: reduce) { .card { animation:none; } }
</style>
</head>
<body>
<header>
  <img src="file:///usr/share/pixmaps/vexos-logo.png" alt="" onerror="this.remove()">
  <h1 id="title">Matlab-vk</h1>
  <div class="status"><span class="dot"></span><span id="status">connecting…</span></div>
</header>
<main><div id="figure"></div></main>
<script>
(function () {
  "use strict";
  var LIVE = __LIVE__;
  var DATA_SRC = "__SRC__";
  var NS = "http://www.w3.org/2000/svg";
  var W = 760, H = 360, L = 68, R = 22, T = 22, B = 50;
  var shown = -1;

  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) { e.textContent = text; }
    return e;
  }
  function fmt(v) {
    if (!isFinite(v)) { return String(v); }
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) { return v.toExponential(2); }
    return String(parseFloat(v.toPrecision(5)));
  }
  function nice(lo, hi, n) {
    if (lo === hi) { lo -= 1; hi += 1; }
    var raw = (hi - lo) / n;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var steps = [1, 2, 2.5, 5, 10], step = mag;
    for (var i = 0; i < steps.length; i++) {
      if (raw <= steps[i] * mag) { step = steps[i] * mag; break; }
    }
    var k0 = Math.floor(lo / step + 1e-9), k1 = Math.ceil(hi / step - 1e-9);
    var ticks = [];
    for (var k = k0; k <= k1; k++) { ticks.push(parseFloat((k * step).toPrecision(12))); }
    return { lo: ticks[0], hi: ticks[ticks.length - 1], ticks: ticks };
  }
  function dash(line) {
    if (line === "--") { return "9 6"; }
    if (line === ":") { return "2 5"; }
    if (line === "-.") { return "10 4 2 4"; }
    return null;
  }

  function drawAxes(ax, host) {
    var card = document.createElement("section");
    card.className = "card";
    var head = document.createElement("div");
    head.className = "card-head";
    var h = document.createElement("h2");
    h.textContent = ax.title || ("Axes " + ax.index);
    var readout = document.createElement("span");
    readout.className = "readout";
    head.appendChild(h);
    head.appendChild(readout);
    card.appendChild(head);
    host.appendChild(card);

    if (ax.empty || !ax.series || ax.series.length === 0) {
      var p = document.createElement("p");
      p.className = "empty";
      p.textContent = ax.empty ? "empty axes" : "no data";
      card.appendChild(p);
      return;
    }

    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    ax.series.forEach(function (s) {
      for (var i = 0; i < s.x.length; i++) {
        var x = s.x[i], y = s.y[i];
        if (isFinite(x) && isFinite(y)) {
          if (x < x0) { x0 = x; } if (x > x1) { x1 = x; }
          if (y < y0) { y0 = y; } if (y > y1) { y1 = y; }
        }
      }
    });
    if (!isFinite(x0)) { x0 = 0; x1 = 1; y0 = 0; y1 = 1; }
    var X = nice(x0, x1, 7), Y = nice(y0, y1, 5);
    var pw = W - L - R, ph = H - T - B;
    function px(x) { return L + (x - X.lo) / (X.hi - X.lo) * pw; }
    function py(y) { return T + (Y.hi - y) / (Y.hi - Y.lo) * ph; }

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "plot", role: "img",
                          "aria-label": ax.title || "plot" });
    svg.appendChild(el("rect", { x: 0, y: 0, width: W, height: H, rx: 14, class: "bg" }));

    X.ticks.forEach(function (t) {
      var x = px(t);
      if (ax.grid) { svg.appendChild(el("line", { x1: x, x2: x, y1: T, y2: T + ph, class: "gridline" })); }
      svg.appendChild(el("text", { x: x, y: T + ph + 18, "text-anchor": "middle", class: "tick" }, fmt(t)));
    });
    Y.ticks.forEach(function (t) {
      var y = py(t);
      if (ax.grid) { svg.appendChild(el("line", { x1: L, x2: L + pw, y1: y, y2: y, class: "gridline" })); }
      svg.appendChild(el("text", { x: L - 10, y: y + 4, "text-anchor": "end", class: "tick" }, fmt(t)));
    });
    svg.appendChild(el("rect", { x: L, y: T, width: pw, height: ph, class: "frame" }));

    if (ax.xlabel) { svg.appendChild(el("text", { x: L + pw / 2, y: H - 10, "text-anchor": "middle", class: "axis-label" }, ax.xlabel)); }
    if (ax.ylabel) {
      var yl = el("text", { x: 16, y: T + ph / 2, "text-anchor": "middle", class: "axis-label",
                            transform: "rotate(-90 16 " + (T + ph / 2) + ")" }, ax.ylabel);
      svg.appendChild(yl);
    }

    ax.series.forEach(function (s) {
      var d = "", pen = true, pts = [];
      for (var i = 0; i < s.x.length; i++) {
        var x = s.x[i], y = s.y[i];
        if (!isFinite(x) || !isFinite(y)) { pen = true; continue; }
        var sx = px(x), sy = py(y);
        d += (pen ? "M" : "L") + sx.toFixed(2) + " " + sy.toFixed(2) + " ";
        pen = false;
        pts.push([sx, sy]);
      }
      var attrs = { d: d, class: "series", stroke: s.color };
      var da = dash(s.line);
      if (da) { attrs["stroke-dasharray"] = da; }
      svg.appendChild(el("path", attrs));
      if (s.marker && pts.length <= 800) {
        pts.forEach(function (p) {
          svg.appendChild(el("circle", { cx: p[0], cy: p[1], r: 3, fill: s.color }));
        });
      }
    });

    var labelled = ax.series.filter(function (s) { return s.label; });
    if (labelled.length) {
      var lw = 150, lh = 22 * labelled.length + 12, lx = L + pw - lw - 10, ly = T + 10;
      svg.appendChild(el("rect", { x: lx, y: ly, width: lw, height: lh, rx: 8, class: "legend-box" }));
      labelled.forEach(function (s, k) {
        var yy = ly + 20 + k * 22;
        svg.appendChild(el("line", { x1: lx + 10, x2: lx + 34, y1: yy - 4, y2: yy - 4, stroke: s.color, "stroke-width": 2.4,
                                     "stroke-dasharray": dash(s.line) || "" }));
        svg.appendChild(el("text", { x: lx + 42, y: yy, class: "legend-text" }, s.label));
      });
    }

    var cross = el("line", { x1: 0, x2: 0, y1: T, y2: T + ph, class: "cross", visibility: "hidden" });
    svg.appendChild(cross);
    svg.addEventListener("mousemove", function (ev) {
      var r = svg.getBoundingClientRect();
      var sx = (ev.clientX - r.left) / r.width * W, sy = (ev.clientY - r.top) / r.height * H;
      if (sx < L || sx > L + pw || sy < T || sy > T + ph) {
        readout.textContent = ""; cross.setAttribute("visibility", "hidden"); return;
      }
      var xv = X.lo + (sx - L) / pw * (X.hi - X.lo);
      var yv = Y.hi - (sy - T) / ph * (Y.hi - Y.lo);
      readout.textContent = "x = " + fmt(xv) + "   y = " + fmt(yv);
      cross.setAttribute("x1", sx); cross.setAttribute("x2", sx);
      cross.setAttribute("visibility", "visible");
    });
    svg.addEventListener("mouseleave", function () {
      readout.textContent = ""; cross.setAttribute("visibility", "hidden");
    });
    card.appendChild(svg);
  }

  function render(data) {
    var root = document.getElementById("figure");
    root.innerHTML = "";
    root.style.setProperty("--cols", String(data.cols));
    data.axes.forEach(function (ax) { drawAxes(ax, root); });
    document.getElementById("title").textContent = "Figure " + data.number;
    document.getElementById("status").textContent =
      (LIVE ? "live" : "saved") + " · " + new Date().toLocaleTimeString();
  }

  function apply() {
    var d = window.MVK;
    if (d && d.version !== shown) { shown = d.version; render(d); }
  }

  function poll() {
    var s = document.createElement("script");
    s.src = DATA_SRC + "?t=" + Date.now();
    s.onload = function () { apply(); s.remove(); };
    s.onerror = function () { s.remove(); };
    document.head.appendChild(s);
  }

  apply();
  if (LIVE) { setInterval(poll, 1000); }
})();
</script>
</body>
</html>
"""
