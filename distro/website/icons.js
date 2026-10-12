// Icon set for the VexOS site. Every icon is drawn from the shapes below, so
// the HTML only carries a name (data-icon="terminal") and no icon markup.
// Stroke icons on a 24x24 grid, drawn with currentColor.
(function () {
  "use strict";

  var SHAPES = {
    terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    package: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.6-2 2.8-.3 5.6-1.4 5.6-6a4.7 4.7 0 0 0-1.3-3.2 4.4 4.4 0 0 0-.1-3.2s-1-.3-3.3 1.2a11.5 11.5 0 0 0-6 0C6.9 2.4 5.9 2.7 5.9 2.7a4.4 4.4 0 0 0-.1 3.2A4.7 4.7 0 0 0 4.5 9c0 4.6 2.8 5.7 5.6 6-.6.6-.6 1.2-.6 2V21"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    feather: '<path d="M20.2 4.2a5.5 5.5 0 0 0-7.8 0L4 12.6V20h7.4l8.8-8.8a5.5 5.5 0 0 0 0-7z"/><line x1="16" y1="8" x2="2" y2="22"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/>'
  };

  function svg(name) {
    var shapes = SHAPES[name];
    if (!shapes) return "";
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      shapes + "</svg>";
  }

  // Replace every [data-icon] element with its SVG. Unknown names render nothing.
  function render(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      el.innerHTML = svg(el.getAttribute("data-icon"));
    });
  }

  window.VexIcons = { render: render, names: Object.keys(SHAPES) };
})();
