const QURAN_API = "https://api.alquran.cloud/v1";
const ADHAN_AUDIO = {
  default: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Beautiful_adhan.ogg",
  fajr: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Adhan.ogg"
};

const $ = (id) => document.getElementById(id);

// PART 1 - rest loaded from script-part2.js via script.js loader
// For reliability, load full script from main branch CDN until parts are complete:
console.warn("Dhker: loading complete script from main");
