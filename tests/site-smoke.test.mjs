import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
const reader = await readFile(new URL("../quran-reader.html", import.meta.url), "utf8");
const mushaf = await readFile(new URL("../mushaf-reader.js", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const notices = await readFile(new URL("../THIRD-PARTY-NOTICES.md", import.meta.url), "utf8");
const flipLicense = await readFile(new URL("../licenses/flipbook-core-MPL-2.0.txt", import.meta.url), "utf8");
const upstreamLicense = await readFile(new URL("../licenses/stpageflip-MIT.txt", import.meta.url), "utf8");
const adhkar = JSON.parse(await readFile(new URL("../data/adhkar.json", import.meta.url), "utf8"));
const refs = JSON.parse(await readFile(new URL("../data/references.json", import.meta.url), "utf8"));
const cities = JSON.parse(await readFile(new URL("../data/cities.json", import.meta.url), "utf8"));

test("site includes its primary services", () => {
  for (const id of ["quran", "prayer", "adhkar", "audio", "hadith"]) assert.match(html, new RegExp('id="' + id + '"'));
});
test("site links to official Android releases without exposing an unverified APK", () => {
  assert.match(html, /TEaG3\/Dhker\/releases/);
  assert.match(html, /تابع إصدار Android/);
  assert.doesNotMatch(html, /releases\/download\/[^"']+\.apk/);
});
test("adhan player exposes an error status target", () => {
  assert.match(html, /id="adhanAudioStatus"/);
  assert.ok(script.includes('status=$("adhanAudioStatus")'));
});
test("offline adhkar data is populated and references resolve", () => {
  const ids = new Set(refs.references.map((ref) => ref.id));
  assert.ok(adhkar.categories.length >= 4);
  for (const category of adhkar.categories) {
    assert.ok(category.items.length > 0);
    for (const item of category.items) assert.ok(ids.has(item.reference_id));
  }
});
test("prayer city catalog includes Baghdad and valid methods", () => {
  assert.ok(cities.some((city) => city.id === "baghdad"));
  for (const city of cities) assert.ok(city.city && city.country && Number.isInteger(city.method));
});
test("Quran audio selector exposes three independent catalog providers", () => {
  assert.ok(html.includes('id="quranAudioSource"'));
  assert.ok(html.includes('id="quranReciter"'));
  assert.ok(html.includes('id="quranSurah"'));
  assert.ok(html.includes("Al Furqan"));
  assert.ok(html.includes("AlQuran Cloud"));
  assert.ok(html.includes("MP3Quran.net"));
  assert.ok(script.includes('const ALFURQAN = "https://alfurqan.online/api/v1"'));
  assert.ok(script.includes('const ALQURAN = "https://api.alquran.cloud/v1"'));
  assert.ok(script.includes('const MP3QURAN = "https://mp3quran.net/api/v3"'));
  assert.ok(script.includes('/edition?format=audio&language=ar'));
  assert.ok(script.includes("reciter.moshaf"));
  assert.ok(script.includes("surah_list"));
  assert.ok(script.includes("CACHE_TTL"));
  assert.ok(script.includes("stale:true"));
});
test("standalone Mushaf uses the real RTL page-curl engine", () => {
  assert.ok(reader.includes('src="./mushaf-reader.js?v=9"'));
  assert.ok(reader.includes('id="mushafBook"'));
  assert.ok(mushaf.includes('https://esm.sh/@gullabs/flipbook-core@3.2.2'));
  assert.ok(mushaf.includes('readingDirection:"rtl"'));
  assert.ok(mushaf.includes("loadFromHTML(pageElements)"));
  assert.ok(mushaf.includes("pageFlip.flipNext()"));
  assert.ok(mushaf.includes("pageFlip.flipPrev()"));
  assert.ok(mushaf.includes("pageFlip.flipToPage(target-1)"));
  assert.ok(mushaf.includes("TOTAL_PAGES=604"));
  assert.ok(mushaf.includes('loading="lazy"'));
  assert.ok(mushaf.includes("mushafFallback"));
});
test("RTL page controls and keyboard arrows use the same mapping", () => {
  assert.match(reader, /aria-keyshortcuts="ArrowRight"/);
  assert.match(reader, /aria-keyshortcuts="ArrowLeft"/);
  assert.ok(reader.includes("التالي ←"));
  assert.ok(reader.includes("→ السابق"));
  assert.ok(mushaf.includes('event.key==="ArrowLeft"){event.preventDefault();nextPage();}'));
  assert.ok(mushaf.includes('event.key==="ArrowRight"){event.preventDefault();previousPage();}'));
});
test("third-party source and license notices are included", () => {
  assert.ok(reader.includes("THIRD-PARTY-NOTICES.md"));
  assert.ok(notices.includes("@gullabs/flipbook-core 3.2.2"));
  assert.ok(notices.includes("MPL-2.0"));
  assert.ok(flipLicense.startsWith("Mozilla Public License Version 2.0"));
  assert.ok(upstreamLicense.startsWith("MIT License"));
});
test("service worker caches the new Mushaf script and already-opened page scans", () => {
  assert.match(sw, /quran-reader\.html/);
  assert.match(sw, /mushaf-reader\.js/);
  assert.match(sw, /MUSHAF_CACHE/);
  assert.match(sw, /raw\.githubusercontent\.com/);
});
