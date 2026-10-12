/* VexOS DevStudio front end. Plain JavaScript, no framework.
 * All text from files, programs, and the AI is inserted with textContent, never as HTML. */
(function () {
  "use strict";

  var TOKEN = (document.querySelector('meta[name="vexdev-token"]') || {}).content || "";
  var MONACO_VER = "0.52.2";
  var MONACO_BASE = "https://cdn.jsdelivr.net/npm/monaco-editor@" + MONACO_VER + "/min/vs";

  var $ = function (sel) { return document.querySelector(sel); };
  function h(tag, props) {
    var n = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "text") n.textContent = props[k];
      else if (k === "class") n.className = props[k];
      else if (k === "on") Object.keys(props.on).forEach(function (ev) { n.addEventListener(ev, props.on[ev]); });
      else n.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) n.appendChild(arguments[i]);
    return n;
  }

  // ------------------------------------------------------------ API
  function api(method, path, body) {
    var opts = { method: method, headers: { "X-VexDev-Token": TOKEN } };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(path, opts).then(function (r) {
      return r.text().then(function (t) {
        var data = {};
        try { data = t ? JSON.parse(t) : {}; } catch (e) { data = { error: t.slice(0, 200) }; }
        if (!r.ok) throw new Error(data.error || ("HTTP " + r.status));
        return data;
      });
    });
  }

  // ------------------------------------------------------------ state
  var editorReady = Promise.resolve();
  var state = {
    tabs: [],          // {path, content, dirty, model}
    active: null,      // path of the active tab
    selected: "",      // selected tree path ("" = workspace root)
    expanded: { "": true },
    job: null,         // current job id
    offset: 0,
    poll: null,
    outputTail: "",    // last output, for "Fix error"
    messages: [],      // AI chat history
    monaco: null,
    editor: null,
    lastCode: ""
  };

  var previewShown = false;
  function setStatus(text) { $("#statusText").textContent = text; }

  // ------------------------------------------------------------ editor (Monaco with a plain fallback)
  var LANG = {
    c: "c", h: "c", cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", py: "python", js: "javascript",
    mjs: "javascript", cjs: "javascript", ts: "typescript", tsx: "typescript", jsx: "javascript",
    json: "json", html: "html", css: "css", md: "markdown", rs: "rust", sh: "shell", toml: "ini",
    yml: "yaml", yaml: "yaml", go: "go", java: "java", txt: "plaintext"
  };
  function langFor(path) {
    var ext = (path.split(".").pop() || "").toLowerCase();
    return LANG[ext] || "plaintext";
  }

  function loadMonaco() {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error("editor CDN timed out")); }, 12000);
      var s = document.createElement("script");
      s.src = MONACO_BASE + "/loader.js";
      s.onload = function () {
        window.require.config({ paths: { vs: MONACO_BASE } });
        window.require(["vs/editor/editor.main"], function () {
          clearTimeout(timer);
          resolve(window.monaco);
        }, function (err) { clearTimeout(timer); reject(err); });
      };
      s.onerror = function () { clearTimeout(timer); reject(new Error("editor CDN unreachable")); };
      document.head.appendChild(s);
    });
  }

  function initEditor() {
    return loadMonaco().then(function (monaco) {
      state.monaco = monaco;
      monaco.editor.defineTheme("vexos", {
        base: "vs-dark", inherit: true, rules: [],
        colors: { "editor.background": "#0b0d12", "editor.lineHighlightBorder": "#161a24" }
      });
      state.editor = monaco.editor.create($("#editor"), {
        value: "", language: "plaintext", theme: "vexos", automaticLayout: true,
        fontFamily: "JetBrains Mono, DejaVu Sans Mono, monospace", fontSize: 14,
        minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4, wordWrap: "off"
      });
      state.editor.onDidChangeModelContent(function () {
        var t = currentTab();
        if (t && !t.dirty) { t.dirty = true; renderTabs(); }
      });
      state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () { saveActive(); });
      state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function () { runActive(); });
      updateView();
      setStatus("Editor ready");
    }).catch(function (err) {
      // Offline or blocked CDN: the plain text editor still works.
      updateView();
      setStatus("Basic editor (" + err.message + "). Syntax colors need internet access.");
    });
  }

  function updateView() {
    var has = state.tabs.length > 0;
    $("#welcome").classList.toggle("hidden", has);
    $("#editor").classList.toggle("hidden", !(has && state.editor));
    $("#fallback").classList.toggle("hidden", !(has && !state.editor));
  }

  function currentTab() {
    for (var i = 0; i < state.tabs.length; i++) if (state.tabs[i].path === state.active) return state.tabs[i];
    return null;
  }

  function editorText() {
    if (state.editor) return state.editor.getValue();
    return $("#fallback").value;
  }

  function editorSelection() {
    if (state.editor) {
      var sel = state.editor.getModel() && state.editor.getSelection();
      if (sel && !sel.isEmpty()) return state.editor.getModel().getValueInRange(sel);
      return "";
    }
    var f = $("#fallback");
    return f.value.slice(f.selectionStart, f.selectionEnd);
  }

  function insertAtCursor(text) {
    if (state.editor) {
      var sel = state.editor.getSelection();
      state.editor.executeEdits("ai", [{ range: sel, text: text, forceMoveMarkers: true }]);
      state.editor.focus();
    } else {
      var f = $("#fallback");
      var s = f.selectionStart, e = f.selectionEnd;
      f.value = f.value.slice(0, s) + text + f.value.slice(e);
      f.selectionStart = f.selectionEnd = s + text.length;
      f.dispatchEvent(new Event("input"));
      f.focus();
    }
  }

  function replaceEditorText(text) {
    if (state.editor) {
      state.editor.setValue(text);
    } else {
      var f = $("#fallback");
      f.value = text;
      f.dispatchEvent(new Event("input"));
    }
  }

  // ------------------------------------------------------------ tabs
  function openFile(path) {
    var existing = state.tabs.filter(function (t) { return t.path === path; })[0];
    if (existing) return activate(path);
    editorReady.then(function () {
      return api("GET", "/api/file?path=" + encodeURIComponent(path));
    }).then(function (f) {
      var tab = { path: path, content: f.content, dirty: false, model: null };
      if (state.monaco) {
        tab.model = state.monaco.editor.createModel(f.content, langFor(path),
          state.monaco.Uri.file("/vexos/" + path));
      }
      state.tabs.push(tab);
      activate(path);
    }).catch(function (e) { setStatus("Cannot open " + path + ": " + e.message); });
  }

  function activate(path) {
    var prev = currentTab();
    if (prev && !state.editor) prev.content = $("#fallback").value;
    state.active = path;
    var tab = currentTab();
    if (!tab) return;
    if (state.editor) {
      state.editor.setModel(tab.model);
      state.editor.focus();
    } else {
      $("#fallback").value = tab.content;
    }
    state.selected = path;
    renderTabs();
    renderTree();
    $("#previewHtml").disabled = !/\.html?$/i.test(path);
    setStatus(path);
  }

  function closeTab(path, ev) {
    if (ev) ev.stopPropagation();
    var tab = state.tabs.filter(function (t) { return t.path === path; })[0];
    if (!tab) return;
    if (tab.dirty && !window.confirm("Close " + path + " without saving?")) return;
    if (tab.model) tab.model.dispose();
    state.tabs = state.tabs.filter(function (t) { return t !== tab; });
    if (state.active === path) {
      var next = state.tabs[state.tabs.length - 1];
      state.active = null;
      if (next) activate(next.path);
      else {
        if (state.editor) state.editor.setModel(null);
        $("#fallback").value = "";
        renderTabs();
        renderTree();
      }
    } else renderTabs();
  }

  function renderTabs() {
    var box = $("#tabs");
    box.innerHTML = "";
    updateView();
    state.tabs.forEach(function (t) {
      var name = t.path.split("/").pop();
      var el = h("button", { class: "tab" + (t.path === state.active ? " active" : ""), title: t.path, on: {
        click: function () { activate(t.path); }
      } },
        t.dirty ? h("span", { class: "dirty", text: "●" }) : null,
        h("span", { text: name }),
        h("span", { class: "x", text: "×", on: { click: function (ev) { closeTab(t.path, ev); } } }));
      box.appendChild(el);
    });
  }

  // ------------------------------------------------------------ save
  function saveTab(tab) {
    var content = tab.model ? tab.model.getValue() : (tab === currentTab() ? $("#fallback").value : tab.content);
    tab.content = content;
    return api("PUT", "/api/file", { path: tab.path, content: content }).then(function () {
      tab.dirty = false;
      renderTabs();
      setStatus("Saved " + tab.path);
    });
  }

  function saveActive() {
    var t = currentTab();
    if (!t) return Promise.resolve();
    return saveTab(t).catch(function (e) { setStatus("Save failed: " + e.message); });
  }

  function saveAllDirty() {
    var dirty = state.tabs.filter(function (t) { return t.dirty; });
    return Promise.all(dirty.map(function (t) { return saveTab(t); }));
  }

  // ------------------------------------------------------------ tree
  // Each full render gets a generation number. Replies from an older render are dropped,
  // so refreshes never duplicate rows, and folder children keep their place in the list.
  var treeGen = 0;

  function renderTree() {
    var box = $("#tree");
    box.innerHTML = "";
    renderDir("", box, 0, ++treeGen);
  }

  function renderDir(rel, container, depth, gen) {
    api("GET", "/api/tree?path=" + encodeURIComponent(rel)).then(function (data) {
      if (gen !== treeGen) return;
      data.entries.forEach(function (e) {
        var isOpen = !!state.expanded[e.path];
        var row = h("div", {
          class: "row" + (e.path === state.selected ? " sel" : "") + (e.path === state.active ? " active" : ""),
          style: "padding-left:" + (10 + depth * 14) + "px",
          role: "treeitem",
          title: e.path,
          on: {
            click: function () {
              state.selected = e.path;
              if (e.dir) {
                state.expanded[e.path] = !isOpen;
                renderTree();
              } else {
                openFile(e.path);
              }
            }
          }
        },
          h("span", { class: "caret", text: e.dir ? (isOpen ? "▾" : "▸") : "" }),
          h("span", { class: "name" + (e.dir ? " dir" : ""), text: e.name }));
        container.appendChild(row);
        if (e.dir && isOpen) {
          // Placeholder keeps the order: children are filled in when their listing arrives.
          var sub = h("div");
          container.appendChild(sub);
          renderDir(e.path, sub, depth + 1, gen);
        }
      });
    }).catch(function (err) { if (gen === treeGen) setStatus("Tree error: " + err.message); });
  }

  function parentOfSelected() {
    var s = state.selected || "";
    return state.expanded[s] ? s : s.split("/").slice(0, -1).join("/");
  }

  function refreshTree() { renderTree(); }

  // ------------------------------------------------------------ output and jobs
  function appendOutput(text) {
    var out = $("#output");
    var atBottom = out.scrollTop + out.clientHeight >= out.scrollHeight - 20;
    out.textContent += text;
    state.outputTail = (state.outputTail + text).slice(-8000);
    if (atBottom) out.scrollTop = out.scrollHeight;
  }

  function showPanel(name) {
    document.querySelectorAll(".bottom-tabs .tab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-panel") === name);
    });
    $("#panel-output").classList.toggle("hidden", name !== "output");
    $("#panel-preview").classList.toggle("hidden", name !== "preview");
  }

  function setPreview(url, label) {
    var frame = $("#frame");
    frame.src = url;
    $("#previewUrl").textContent = label || url;
    showPanel("preview");
  }

  function watchJob(id, title) {
    previewShown = false;
    state.job = id;
    state.offset = 0;
    if (state.poll) clearInterval(state.poll);
    appendOutput("\n── " + title + " ──\n");
    state.poll = setInterval(pollJob, 300);
    pollJob();
  }

  function pollJob() {
    var id = state.job;
    if (!id) return;
    api("GET", "/api/jobs/" + id + "?offset=" + state.offset).then(function (j) {
      if (id !== state.job) return;
      if (j.output) appendOutput(j.output);
      state.offset = j.next_offset;
      if (j.url && !previewShown) {
        previewShown = true;
        setPreview(j.url, "Live app at " + j.url);
      }
      if (!j.running) {
        clearInterval(state.poll);
        state.poll = null;
        state.job = null;
        previewShown = false;
        var code = j.exit_code === null ? "" : ", exit " + j.exit_code;
        appendOutput("── finished (" + j.status + code + ") ──\n");
        setStatus("Finished: " + j.title + code);
        refreshTree();
      }
    }).catch(function (e) {
      clearInterval(state.poll);
      state.poll = null;
      setStatus("Lost the job: " + e.message);
    });
  }

  function runActive() {
    var target = state.active || state.selected || "";
    saveAllDirty().then(function () {
      showPanel("output");
      return api("POST", "/api/run", { path: target });
    }).then(function (r) {
      watchJob(r.job, "run " + (target || "workspace"));
      setStatus("Running " + (target || "workspace") + "…");
    }).catch(function (e) {
      showPanel("output");
      appendOutput("\n" + e.message + "\n");
      setStatus("Run failed");
    });
  }

  function stopJob() {
    if (!state.job) return setStatus("Nothing is running");
    api("POST", "/api/jobs/" + state.job + "/stop", {}).then(function () { setStatus("Stopped"); });
  }

  function runCommand() {
    var cmd = $("#cmd").value.trim();
    if (!cmd) return;
    var cwd = state.selected && state.expanded[state.selected] ? state.selected : parentOfSelected();
    showPanel("output");
    api("POST", "/api/exec", { command: cmd, cwd: cwd }).then(function (r) {
      watchJob(r.job, "$ " + cmd);
      $("#cmd").value = "";
    }).catch(function (e) { appendOutput("\n" + e.message + "\n"); });
  }

  function sendStdin() {
    var text = $("#stdin").value;
    if (!state.job) return setStatus("No program is running");
    api("POST", "/api/jobs/" + state.job + "/input", { text: text }).then(function () {
      appendOutput(text + "\n");
      $("#stdin").value = "";
    }).catch(function (e) { appendOutput("\n[input] " + e.message + "\n"); });
  }

  // ------------------------------------------------------------ projects and files
  function newProject() {
    var kind = $("#kind").value;
    var name = window.prompt("Project name (letters, numbers, dashes):", "my-" + kind);
    if (!name) return;
    api("POST", "/api/create", { kind: kind, name: name }).then(function (r) {
      state.expanded[r.path] = true;
      if (r.job) {
        showPanel("output");
        watchJob(r.job, "create " + kind + " " + r.path);
        setStatus("Creating " + r.path + "… (this can take a few minutes)");
      } else {
        refreshTree();
        var main = (r.files || []).filter(function (f) { return /^(main\.(c|py)|index\.(js|html))$/.test(f); })[0];
        if (main) openFile(r.path + "/" + main);
        setStatus("Created " + r.path);
      }
    }).catch(function (e) { window.alert(e.message); });
  }

  function newFile() {
    var base = parentOfSelected();
    var name = window.prompt("New file name (inside " + (base || "workspace") + "):", "untitled.txt");
    if (!name) return;
    var path = (base ? base + "/" : "") + name;
    api("PUT", "/api/file", { path: path, content: "" }).then(function () {
      refreshTree();
      openFile(path);
    }).catch(function (e) { window.alert(e.message); });
  }

  function newFolder() {
    var base = parentOfSelected();
    var name = window.prompt("New folder name (inside " + (base || "workspace") + "):", "folder");
    if (!name) return;
    var path = (base ? base + "/" : "") + name;
    api("POST", "/api/mkdir", { path: path }).then(function () {
      state.expanded[path] = true;
      refreshTree();
    }).catch(function (e) { window.alert(e.message); });
  }

  function renameItem() {
    var src = state.selected;
    if (!src) return window.alert("Select a file or folder first.");
    var name = window.prompt("New name:", src.split("/").pop());
    if (!name) return;
    var dst = src.split("/").slice(0, -1).concat([name]).join("/");
    api("POST", "/api/rename", { from: src, to: dst }).then(function () {
      state.tabs.forEach(function (t) { if (t.path === src) t.path = dst; });
      if (state.active === src) state.active = dst;
      state.selected = dst;
      refreshTree();
      renderTabs();
    }).catch(function (e) { window.alert(e.message); });
  }

  function deleteItem() {
    var src = state.selected;
    if (!src) return window.alert("Select a file or folder first.");
    if (!window.confirm("Delete " + src + "? This cannot be undone.")) return;
    api("POST", "/api/delete", { path: src }).then(function () {
      state.tabs.filter(function (t) { return t.path === src || t.path.indexOf(src + "/") === 0; })
        .forEach(function (t) { closeTab(t.path); });
      state.selected = "";
      refreshTree();
    }).catch(function (e) { window.alert(e.message); });
  }

  // ------------------------------------------------------------ AI
  var PROMPTS = {
    explain: "Explain what this code does, step by step, in plain words.",
    fix: "Find the cause of the error in the last output and fix the code. Give the complete fixed file in one code block.",
    improve: "Review this code. Improve correctness, clarity, and performance. Give the complete improved file in one code block.",
    tests: "Write focused tests for this code using the usual test tool for this language. Give the complete test file in one code block."
  };

  function aiContext() {
    var t = currentTab();
    var sel = editorSelection();
    return {
      file: t ? t.path : "",
      language: t ? langFor(t.path) : "",
      code: sel || (t ? editorText() : ""),
      error: state.outputTail
    };
  }

  function askAI(text) {
    if (!text.trim()) return;
    state.messages.push({ role: "user", content: text });
    addMessage("user", text);
    var thinking = addMessage("assistant", "Thinking…");
    api("POST", "/api/ai/chat", { messages: state.messages, context: aiContext() }).then(function (r) {
      state.messages.push({ role: "assistant", content: r.reply });
      thinking.remove();
      addMessage("assistant", r.reply);
      setStatus("AI replied");
    }).catch(function (e) {
      thinking.remove();
      state.messages.pop();
      addMessage("error", e.message);
    });
  }

  function addMessage(role, text) {
    var chat = $("#chat");
    var box = h("div", { class: "msg " + (role === "user" ? "user" : role === "error" ? "error" : "") });
    box.appendChild(h("div", { class: "who", text: role === "user" ? "You" : role === "error" ? "Error" : "VexOS AI" }));
    // Split replies into prose and fenced code blocks.
    var parts = String(text).split(/```[^\n]*\n?/);
    parts.forEach(function (part, i) {
      if (i % 2 === 0) {
        if (part.trim()) box.appendChild(h("div", { text: part.replace(/\s+$/, "") }));
      } else {
        box.appendChild(codeBlock(part.replace(/\n$/, "")));
      }
    });
    chat.appendChild(box);
    chat.scrollTop = chat.scrollHeight;
    return box;
  }

  function codeBlock(code) {
    var replaceBtn = h("button", { class: "mini", text: "Replace file", on: {
      click: function () {
        if (!currentTab()) return window.alert("Open a file first.");
        if (window.confirm("Replace the whole open file with this code?")) replaceEditorText(code);
      }
    } });
    var insertBtn = h("button", { class: "mini", text: "Insert at cursor", on: {
      click: function () { if (currentTab()) insertAtCursor(code); else window.alert("Open a file first."); }
    } });
    var copyBtn = h("button", { class: "mini", text: "Copy", on: {
      click: function () { if (navigator.clipboard) navigator.clipboard.writeText(code); }
    } });
    return h("div", { class: "code" },
      h("div", { class: "bar" }, copyBtn, insertBtn, replaceBtn),
      h("pre", null, h("code", { text: code })));
  }

  function refreshAIState() {
    api("GET", "/api/settings").then(function (s) {
      $("#aiState").textContent = s.groq_key_set ? "Groq · " + s.model : "no key";
      $("#aiState").classList.toggle("on", !!s.groq_key_set);
      $("#model").value = s.model;
      $("#keyState").textContent = s.groq_key_set
        ? "Key saved (" + s.groq_key_hint + "). Type a new one to replace it."
        : "No key saved yet.";
    }).catch(function () {});
  }

  function saveSettings() {
    var body = { model: $("#model").value.trim() };
    var key = $("#groqKey").value.trim();
    if (key) body.groq_api_key = key;
    api("POST", "/api/settings", body).then(function () {
      $("#groqKey").value = "";
      refreshAIState();
      setStatus("Settings saved");
      if (typeof $("#settings").close === "function") $("#settings").close();
      else $("#settings").removeAttribute("open");
    }).catch(function (e) { window.alert(e.message); });
  }

  function clearKey() {
    if (!window.confirm("Remove the saved Groq API key?")) return;
    api("POST", "/api/settings", { groq_api_key: "" }).then(function () { refreshAIState(); setStatus("Key removed"); });
  }

  // ------------------------------------------------------------ info and wiring
  function loadInfo() {
    api("GET", "/api/info").then(function (info) {
      var parts = [];
      ["gcc", "python3", "node", "npm", "cargo", "rustc", "gdb"].forEach(function (name) {
        var v = info.runtimes[name];
        if (v) parts.push(name + " " + (v.match(/\d[\w.\-+]*/) || ["ok"])[0]);
      });
      $("#runtimes").textContent = parts.join(" · ") + "   |   " + info.workspace;
    }).catch(function (e) { setStatus("Server error: " + e.message); });
  }

  function wire() {
    $("#newProject").addEventListener("click", newProject);
    $("#run").addEventListener("click", runActive);
    $("#stop").addEventListener("click", stopJob);
    $("#save").addEventListener("click", saveActive);
    $("#newFile").addEventListener("click", newFile);
    $("#newFolder").addEventListener("click", newFolder);
    $("#renameItem").addEventListener("click", renameItem);
    $("#deleteItem").addEventListener("click", deleteItem);
    $("#refresh").addEventListener("click", refreshTree);
    $("#clearOutput").addEventListener("click", function () { $("#output").textContent = ""; state.outputTail = ""; });
    $("#cmdRun").addEventListener("click", runCommand);
    $("#cmd").addEventListener("keydown", function (e) { if (e.key === "Enter") runCommand(); });
    $("#stdin").addEventListener("keydown", function (e) { if (e.key === "Enter") sendStdin(); });
    $("#previewHtml").addEventListener("click", function () {
      var t = currentTab();
      if (t) setPreview("/preview/" + encodeURI(t.path), "Preview of " + t.path);
    });
    document.querySelectorAll(".bottom-tabs .tab").forEach(function (b) {
      b.addEventListener("click", function () { showPanel(b.getAttribute("data-panel")); });
    });
    document.querySelectorAll(".ai-actions .chip").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-action");
        askAI(PROMPTS[key]);
      });
    });
    $("#chatForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var text = $("#chatInput").value;
      $("#chatInput").value = "";
      askAI(text);
    });
    $("#chatInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $("#chatForm").requestSubmit(); }
    });
    $("#openSettings").addEventListener("click", function () {
      refreshAIState();
      var dlg = $("#settings");
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
    });
    $("#saveSettings").addEventListener("click", saveSettings);
    $("#clearKey").addEventListener("click", clearKey);
    $("#fallback").addEventListener("input", function () {
      var t = currentTab();
      if (t) { t.content = $("#fallback").value; if (!t.dirty) { t.dirty = true; renderTabs(); } }
    });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveActive(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !state.editor) { e.preventDefault(); runActive(); }
    });
    window.addEventListener("beforeunload", function (e) {
      if (state.tabs.some(function (t) { return t.dirty; })) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wire();
    renderTabs();
    renderTree();
    loadInfo();
    refreshAIState();
    editorReady = initEditor();
  });
})();
