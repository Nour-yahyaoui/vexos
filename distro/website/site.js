// VexOS site: fills the page from one config object and renders icons from icons.js.
(function () {
  "use strict";

  // Change these in one place. Everything on the page reads from here.
  var SITE = {
    name: "VexOS Desktop",
    tagline: "Debian-based live desktop",
    summary:
      "A clean, fast Linux desktop built on Debian. Boots from a single ISO in VirtualBox, " +
      "with Python, Node.js, and Firefox ready to use, and the full apt package manager underneath.",
    featuresIntro: "Small, familiar, and ready for work from the first boot.",
    author: "Nour-yahyaoui",
    repoName: "vexos",
    repo: "https://github.com/Nour-yahyaoui/vexos",
    // Always points at the newest release's ISO. Upload the ISO with this exact file name.
    download: "https://github.com/Nour-yahyaoui/vexos/releases/latest/download/vexos-desktop-1.0-amd64.iso",
    releases: "https://github.com/Nour-yahyaoui/vexos/releases",
    base: "Debian 13 (trixie)",
    version: "1.0",
    aboutText:
      "VexOS is a small desktop distribution built on Debian. It adds a dark XFCE desktop, " +
      "a dock, a terminal text editor called vexpad, and a set of ready-to-run tools. " +
      "Everything underneath is standard Debian, so you can install any package with apt."
  };

  var FEATURES = [
    { icon: "monitor", title: "XFCE desktop", text: "Light, familiar, and fast. Dark theme, a dock, and a clean login screen." },
    { icon: "globe", title: "Firefox ready", text: "Firefox ESR for web apps and HTML and JavaScript pages out of the box." },
    { icon: "code", title: "Python and Node.js", text: "Python 3 with pip and venv, plus Node.js and npm, ready to run your code." },
    { icon: "package", title: "Full apt", text: "Every Debian package is one command away. Nothing is locked down." },
    { icon: "terminal", title: "Terminal tools", text: "git, build-essential, vim, nano, htop, and vexpad for quick edits." },
    { icon: "shield", title: "Built on Debian", text: "Debian's security updates and a stable base you already trust." }
  ];

  var STEPS = [
    "Download the ISO (button above, or the releases page).",
    "In VirtualBox, create a new VM: Linux, Debian (64-bit), 4 GB RAM, 2 CPUs.",
    "Under Storage, attach the ISO to the optical drive. Skip the virtual hard disk.",
    "Set Display to VMSVGA with 128 MB video memory for full-screen resolution.",
    "Start the VM and choose the Live entry. Log in as user with password live."
  ];

  var REQUIREMENTS = [
    "VirtualBox 7 or newer, on Windows, macOS, or Linux",
    "64-bit CPU with 2 cores and 4 GB RAM for the VM",
    "About 10 GB of free disk space for the VM and the ISO"
  ];

  // Plain text fields, filled by data-text="key".
  function fillText() {
    document.querySelectorAll("[data-text]").forEach(function (el) {
      var key = el.getAttribute("data-text");
      if (key === "year") { el.textContent = String(new Date().getFullYear()); return; }
      if (SITE[key] !== undefined) el.textContent = SITE[key];
    });
  }

  // Links that point at the repository or the download page.
  function fillLinks() {
    document.querySelectorAll("[data-link]").forEach(function (el) {
      var key = el.getAttribute("data-link");
      var url = { repo: SITE.repo, download: SITE.download, releases: SITE.releases }[key];
      if (!url) return;
      el.setAttribute("href", url);
      if (el.tagName === "A" && el.textContent.trim() === "") el.textContent = SITE.repo.replace("https://", "");
    });
  }

  function renderFeatures() {
    var box = document.querySelector('[data-list="features"]');
    if (!box) return;
    box.innerHTML = "";
    FEATURES.forEach(function (f) {
      var card = document.createElement("article");
      card.className = "card";
      card.innerHTML =
        '<span class="card-icon" data-icon="' + f.icon + '"></span>' +
        "<h3></h3><p></p>";
      card.querySelector("h3").textContent = f.title;
      card.querySelector("p").textContent = f.text;
      box.appendChild(card);
    });
  }

  function renderList(key, items, tag) {
    var box = document.querySelector('[data-list="' + key + '"]');
    if (!box) return;
    box.innerHTML = "";
    items.forEach(function (text) {
      var li = document.createElement(tag || "li");
      if (key === "requirements") {
        li.innerHTML = '<span class="check" data-icon="check"></span>';
        li.appendChild(document.createTextNode(text));
      } else {
        li.textContent = text;
      }
      box.appendChild(li);
    });
  }

  // Mobile menu: opens and closes the nav and keeps aria-expanded in sync.
  function setupMenu() {
    var btn = document.querySelector(".menu-toggle");
    var nav = document.getElementById("nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      btn.querySelector("[data-icon]").setAttribute("data-icon", open ? "close" : "menu");
      window.VexIcons.render(btn);
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillText();
    fillLinks();
    renderFeatures();
    renderList("steps", STEPS, "li");
    renderList("requirements", REQUIREMENTS, "li");
    window.VexIcons.render(document);
    setupMenu();
  });
})();
