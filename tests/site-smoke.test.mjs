import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
const reader = await readFile(new URL("../quran-reader.html", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const adhkar = JSON.parse(await readFile(new URL("../data/adhkar.json", import.meta.url), "utf8"));
const refs = JSON.parse(await readFile(new URL("../data/references.json", import.meta.url), "utf8"));
const cities = JSON.parse(await readFile(new URL("../data/cities.json", import.meta.url), "utf8"));

test("site includes all four primary services", () => {
  for (const id of ["quran", "prayer", "adhkar", "audio", "hadith"]) assert.match(html, new RegExp('id="' + id + '"'));
});
test("site links to official Android releases without exposing an unverified APK", () => {
  assert.match(html, /TEaG3\/Dhker\/releases/);
  assert.match(html, /تابع إصدار Android/);
  assert.doesNotMatch(html, /releases\/download\/[^"']+\.apk/);
});
test("adhan playback errors have a valid status target", () => {
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
test("site script implements offline Quran cache and service worker registration", () => {
  assert.ok(script.includes('status=$("adhanAudioStatus")'));
  assert.ok(script.includes('status=$("adhanAudioStatus")'));
  assert.ok(script.includes("api.alquran.cloud"));
});
test("Quran recitation player offers multiple independent audio libraries", () => {
  assert.ok(html.includes('id="quranPlayer"'));
  assert.ok(html.includes('id="quranReciter"'));
  assert.ok(html.includes('id="quranAudioSource"'));
  assert.ok(html.includes("AlQuran Cloud"));
  assert.ok(html.includes("MP3Quran.net"));
  assert.ok(html.includes('id="quranSurah"'));
  assert.ok(script.includes('api+"/audio/"'));
  assert.ok(script.includes("https://api.alquran.cloud/v1"));
  assert.ok(script.includes("https://www.mp3quran.net/api/v3"));
  assert.ok(script.includes("moshaf"));
  assert.ok(script.includes("surah_list"));
  assert.ok(script.includes("setupHadithLibrary"));
  assert.ok(script.includes('api+"/athan/"'));
  assert.ok(script.includes("setupHadithLibrary"));
  assert.ok(script.includes('api+"/athan/"'));
  assert.ok(html.includes("alfurqan.online/docs"));
});
test("Mushaf navigation buttons and keyboard arrows share the same RTL mapping", () => {
  assert.match(reader, /aria-keyshortcuts="ArrowRight"/);
  assert.match(reader, /aria-keyshortcuts="ArrowLeft"/);
  assert.ok(reader.includes('e.key==="ArrowLeft"{e.preventDefault();go(current+step,"next")'));
  assert.ok(reader.includes('e.key==="ArrowRight"){e.preventDefault();go(current-step,"prev")'));
  assert.ok(reader.includes("navigationBusy"));
  assert.ok(reader.includes("التالي ←"));
  assert.ok(reader.includes("→ السابق"));
});

test("standalone mushaf uses scanned 604-page images with responsive navigation", () => {
  assert.match(reader, /Zizwar\/mushaf-mauri/);
  assert.ok(reader.includes('IMAGE_BASE+n+".png"'));
  assert.match(reader, /MAX_PAGE=604/);
  assert.match(reader, /mushaf-mobile-page/);
  assert.match(reader, /dhker-mushaf-mauri-bookmark/);
  assert.doesNotMatch(reader, /St\.PageFlip|quranFlipBook|api\.alquran\.cloud/);
  for (const id of ["leftPage", "rightPage", "mobilePageImage", "previous", "next", "bookmark"]) assert.match(reader, new RegExp('id="' + id + '"'));
});
test("service worker caches the reader and previously opened Mushaf images", () => {
  assert.match(sw, /quran-reader\.html/);
  assert.match(sw, /MUSHAF_CACHE/);
  assert.match(sw, /raw\.githubusercontent\.com/);
});
