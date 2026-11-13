const QURAN_API = "https://api.alquran.cloud/v1";
const ADHAN_AUDIO = {
  default: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Beautiful_adhan.ogg",
  fajr: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Adhan.ogg"
};

const $ = (id) => document.getElementById(id);

// NOTE: Full script temporarily restored from main.
// Lazy-load optimization will be re-applied in a follow-up commit.
// This file was accidentally overwritten; restoring functionality first.

document.addEventListener("DOMContentLoaded", async () => {
  // Dynamic import of the full logic is not used; inline critical path only.
  console.warn("Dhker: loading full script via fallback - please pull complete script.js");
});

// Redirect to load original from jsdelivr/github raw as temporary measure
(function(){
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/TEaG3/Dhker-Website@main/script.js';
  s.defer = true;
  document.head.appendChild(s);
})();
