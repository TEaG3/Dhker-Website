/* Dhker script bootstrap
 * Loads the last known-good full script from the main branch.
 * Keeps the app functional while perf branch ships index + landing improvements.
 */
(function () {
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/TEaG3/Dhker-Website@main/script.js";
  s.defer = true;
  s.onerror = function () {
    console.error("Dhker: failed to load script from CDN; try a hard refresh.");
  };
  document.head.appendChild(s);
})();
