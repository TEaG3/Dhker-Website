import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
const adhkar = JSON.parse(await readFile(new URL("../data/adhkar.json", import.meta.url), "utf8"));
const refs = JSON.parse(await readFile(new URL("../data/references.json", import.meta.url), "utf8"));
const cities = JSON.parse(await readFile(new URL("../data/cities.json", import.meta.url), "utf8"));

test("site includes all four primary services", () => {
  for (const id of ["quran", "prayer", "adhkar", "audio"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});

test("site points to the current Android release and repository", () => {
  assert.match(html, /TEaG3\/Dhker\/releases/);
  assert.match(html, /app-release\.apk/);
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
  for (const city of cities) {
    assert.ok(city.city && city.country);
    assert.ok(Number.isInteger(city.method));
  }
});

test("script implements offline Quran cache and service worker registration", () => {
  assert.match(script, /indexedDB/);
  assert.match(script, /serviceWorker/);
  assert.match(script, /alquran\\.cloud/);
});

test("Quran recitation player offers multiple reciters and uses the documented AlQuran Cloud CDN", () => {
  assert.ok(html.includes('id="quranPlayer"'));
  assert.ok(html.includes('id="quranReciter"'));
  assert.ok(html.includes('id="quranSurah"'));
  assert.ok(script.includes("cdn.islamic.network/quran/audio-surah/128/"));
  for (const reciter of ["ar.alafasy", "ar.husary", "ar.minshawi", "ar.abdulbasit"]) {
    assert.ok(html.includes(reciter));
  }
});
