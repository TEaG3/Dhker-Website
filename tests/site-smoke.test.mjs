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

test("homepage exposes independent service tabs and no embedded Quran reader", () => {
  for (const id of ["home", "prayer", "adhkar", "hadith", "audio"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.doesNotMatch(html, /id="quran"|id="quranContent"|href="#quran"/);
  assert.match(html, /href="\.\/quran-reader\.html"/);
  assert.match(html, /data-tab-panel|class="container app-section tab-panel"/);
  assert.ok(script.includes('document.querySelectorAll(".tab-panel")'));
  assert.ok(script.includes('showTab(location.hash.slice(1) || "home", false)'));
});
test("site links to Android releases without exposing an unverified APK", () => {
  assert.match(html, /TEaG3\/Dhker\/releases/);
  assert.match(html, /تابع إصدار Android/);
  assert.doesNotMatch(html, /releases\/download\/[^"']+\.apk/);
});
test("adhan tabs include a global stop control and accessible play state", () => {
  assert.match(html, /id="adhanCategories"/);
  assert.match(html, /data-adhan-tab="default"/);
  assert.match(html, /data-adhan-tab="fajr"/);
  assert.match(html, /data-adhan-tab="library"/);
  assert.match(html, /id="stopAdhan"/);
  assert.ok(script.includes('stopButton.addEventListener("click"'));
  assert.ok(script.includes('function resetPlayback(message = "")'));
  assert.ok(script.includes('button.setAttribute("aria-pressed", "true")'));
  assert.ok(script.includes('player.addEventListener("ended"'));
});
test("adhkar library has navigable categories and valid references", () => {
  assert.match(html, /id="adhkarCategories"/);
  assert.ok(script.includes('tab.addEventListener("click", () => { selected = category.id; render(); })'));
  const ids = new Set(refs.references.map((ref) => ref.id));
  assert.ok(adhkar.categories.length >= 4);
  for (const category of adhkar.categories) {
    assert.ok(category.items.length > 0);
    for (const item of category.items) assert.ok(ids.has(item.reference_id));
  }
});
test("hadith library provides book tiles, chapter tabs, and a back control", () => {
  assert.match(html, /id="hadithBooks"/);
  assert.match(html, /id="hadithChapters"/);
  assert.match(html, /id="backHadithBooks"/);
  assert.ok(script.includes('button.addEventListener("click", () => loadBook(book))'));
  assert.ok(script.includes('tab.addEventListener("click", () => loadChapter(book.id, chapterId, tab))'));
  assert.ok(script.includes('backButton.addEventListener("click", showBooks)'));
});
test("prayer city catalog includes Baghdad and valid calculation methods", () => {
  assert.ok(cities.some((city) => city.id === "baghdad"));
  for (const city of cities) assert.ok(city.city && city.country && Number.isInteger(city.method));
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
test("standalone Mushaf controls use the RTL keyboard mapping", () => {
  assert.match(reader, /aria-keyshortcuts="ArrowRight"/);
  assert.match(reader, /aria-keyshortcuts="ArrowLeft"/);
  assert.ok(reader.includes("التالي ←"));
  assert.ok(reader.includes("→ السابق"));
  assert.ok(mushaf.includes('event.key==="ArrowLeft"){event.preventDefault();nextPage();}'));
  assert.ok(mushaf.includes('event.key==="ArrowRight"){event.preventDefault();previousPage();}'));
});
test("third-party source and license notices remain included", () => {
  assert.ok(reader.includes("THIRD-PARTY-NOTICES.md"));
  assert.ok(notices.includes("@gullabs/flipbook-core 3.2.2"));
  assert.ok(notices.includes("MPL-2.0"));
  assert.ok(flipLicense.startsWith("Mozilla Public License Version 2.0"));
  assert.ok(upstreamLicense.startsWith("MIT License"));
});
test("service worker refreshes the new tabbed homepage and standalone Mushaf", () => {
  assert.match(sw, /dhker-web-v9/);
  assert.match(sw, /quran-reader\.html/);
  assert.match(sw, /mushaf-reader\.js/);
  assert.match(sw, /MUSHAF_CACHE/);
  assert.match(sw, /raw\.githubusercontent\.com/);
});
