// VexOS DevStudio layout: resizable and closable panels, focus mode (-) and full screen (+).
// Loaded after app.js. It only moves panels around; it does not change the editor or the server.
(function () {
  "use strict";

  var KEY = "vexdev-layout-v1";
  var DEFAULTS = { side: 250, ai: 340, bottom: 260, sideOpen: true, aiOpen: true, bottomOpen: true };
  var app = document.getElementById("app");
  var statusBar = document.querySelector(".status");
  var focusSaved = null; // panel state before focus mode, so - can restore it

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return Object.assign({}, DEFAULTS, s);
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  var prefs = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* storage full or disabled */ }
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function apply() {
    var root = document.documentElement.style;
    root.setProperty("--side-w", prefs.side + "px");
    root.setProperty("--ai-w", prefs.ai + "px");
    root.setProperty("--bottom-h", prefs.bottom + "px");

    app.classList.toggle("no-side", !prefs.sideOpen);
    app.classList.toggle("no-ai", !prefs.aiOpen);
    app.classList.toggle("no-bottom", !prefs.bottomOpen);

    setPressed("tglSide", prefs.sideOpen);
    setPressed("tglAi", prefs.aiOpen);
    setPressed("tglBottom", prefs.bottomOpen);
  }

  function setPressed(id, on) {
    var b = document.getElementById(id);
    if (b) b.setAttribute("aria-pressed", on ? "true" : "false");
  }

  // Keep the editor usable: never let the sidebar, chat, or console take all the space.
  function limits() {
    var w = app.clientWidth;
    var h = app.clientHeight;
    return { maxSide: Math.max(160, Math.floor(w * 0.5)),
             maxAi: Math.max(220, Math.floor(w * 0.5)),
             maxBottom: Math.max(80, h - (statusBar ? statusBar.offsetHeight : 22) - 160) };
  }

  function clampPrefs() {
    var l = limits();
    prefs.side = clamp(prefs.side, 160, l.maxSide);
    prefs.ai = clamp(prefs.ai, 220, l.maxAi);
    prefs.bottom = clamp(prefs.bottom, 80, l.maxBottom);
  }

  // Drag handles
  var drag = null;

  function startDrag(ev, which) {
    ev.preventDefault();
    drag = { which: which };
    var handle = ev.currentTarget;
    handle.classList.add("active");
    app.classList.add("dragging");
    if (which === "bottom") app.classList.add("h");
    handle.setPointerCapture(ev.pointerId);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  }

  function onMove(ev) {
    if (!drag) return;
    var r = app.getBoundingClientRect();
    var l = limits();
    if (drag.which === "side") {
      prefs.side = clamp(Math.round(ev.clientX - r.left), 160, l.maxSide);
      prefs.sideOpen = true;
    } else if (drag.which === "ai") {
      prefs.ai = clamp(Math.round(r.right - ev.clientX), 220, l.maxAi);
      prefs.aiOpen = true;
    } else if (drag.which === "bottom") {
      var statusH = statusBar ? statusBar.offsetHeight : 22;
      prefs.bottom = clamp(Math.round(r.bottom - statusH - ev.clientY), 80, l.maxBottom);
      prefs.bottomOpen = true;
    }
    apply();
  }

  function endDrag(ev) {
    if (!drag) return;
    var handle = ev.currentTarget;
    handle.classList.remove("active");
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", endDrag);
    handle.removeEventListener("pointercancel", endDrag);
    app.classList.remove("dragging", "h");
    drag = null;
    clampPrefs();
    apply();
    save();
  }

  function bindHandle(id, which) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("pointerdown", function (ev) { startDrag(ev, which); });
    el.addEventListener("dblclick", function () {
      var d = DEFAULTS;
      if (which === "side") prefs.side = d.side;
      if (which === "ai") prefs.ai = d.ai;
      if (which === "bottom") prefs.bottom = d.bottom;
      apply();
      save();
    });
  }

  // Show or hide a panel
  function setOpen(name, open) {
    if (name === "side") prefs.sideOpen = open;
    if (name === "ai") prefs.aiOpen = open;
    if (name === "bottom") prefs.bottomOpen = open;
    apply();
    save();
  }

  function on(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }

  on("tglSide", function () { setOpen("side", !prefs.sideOpen); });
  on("tglAi", function () { setOpen("ai", !prefs.aiOpen); });
  on("tglBottom", function () { setOpen("bottom", !prefs.bottomOpen); });
  on("closeSide", function () { setOpen("side", false); });
  on("closeAi", function () { setOpen("ai", false); });
  on("closeBottom", function () { setOpen("bottom", false); });

  // "-": focus mode hides the side panels and the console. Click again to restore.
  on("winMin", function () {
    if (focusSaved) {
      prefs.sideOpen = focusSaved.sideOpen;
      prefs.aiOpen = focusSaved.aiOpen;
      prefs.bottomOpen = focusSaved.bottomOpen;
      focusSaved = null;
    } else {
      focusSaved = { sideOpen: prefs.sideOpen, aiOpen: prefs.aiOpen, bottomOpen: prefs.bottomOpen };
      prefs.sideOpen = false;
      prefs.aiOpen = false;
      prefs.bottomOpen = false;
    }
    apply();
    save();
  });

  // "+": full screen (the browser window fills the screen; F11 also works).
  on("winMax", function () {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {});
    }
  });

  // Running code opens the console so the output is visible.
  on("run", function () {
    if (!prefs.bottomOpen) setOpen("bottom", true);
  });

  bindHandle("rzSide", "side");
  bindHandle("rzAi", "ai");
  bindHandle("rzBottom", "bottom");

  window.addEventListener("resize", function () {
    clampPrefs();
    apply();
  });

  // Small windows start with the chat closed, so the editor has room.
  if (window.innerWidth < 1100 && !localStorage.getItem(KEY)) {
    prefs.aiOpen = false;
  }

  clampPrefs();
  apply();
})();
