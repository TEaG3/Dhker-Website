import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const mobileCss = await readFile(new URL("../mobile-app.css", import.meta.url), "utf8");
const identityCss = await readFile(new URL("../islamic-identity.css", import.meta.url), "utf8");
const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
const reader = await readFile(new URL("../quran-reader.html", import.meta.url), "utf8");
const mushaf = await readFile(new URL("../mushaf-reader.js", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const manifest = await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8");
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
  assert.ok(script.includes('button.addEventListener("click", () => openBook(book))'));
  assert.ok(script.includes('button.addEventListener("click", () => loadChapter(chapter, button))'));
  assert.ok(script.includes('backBooks?.addEventListener("click", () => {'));
});
test("prayer city catalog includes Baghdad and valid calculation methods", () => {
  assert.ok(cities.some((city) => city.id === "baghdad"));
  for (const city of cities) assert.ok(city.city && city.country && Number.isInteger(city.method));
});
test("standalone Mushaf uses the page-curl engine with ascending Arabic page order", () => {
  assert.ok(reader.includes('src="./mushaf-reader.js?v=14"'));
  assert.ok(reader.includes('id="mushafBook"'));
  assert.ok(mushaf.includes('https://esm.sh/@gullabs/flipbook-core@3.2.2'));
  assert.ok(mushaf.includes('https://cdn.jsdelivr.net/npm/@gullabs/flipbook-core@3.2.2/+esm'));
  assert.ok(mushaf.includes("loadPageFlipModule()"));
  assert.ok(mushaf.includes('readingDirection:"rtl"'));
  assert.ok(mushaf.includes("loadFromHTML(pageElements)"));
  assert.ok(mushaf.includes("pageFlip.flipNext()"));
  assert.ok(mushaf.includes("pageFlip.flipPrev()"));
  assert.ok(mushaf.includes("pageFlip.flipToPage(target-1)"));
  assert.ok(mushaf.includes("TOTAL_PAGES=604"));
  assert.ok(mushaf.includes('loading="lazy"'));
  assert.ok(mushaf.includes("mushafFallback"));
  assert.ok(mushaf.includes('fallback.addEventListener("pointerdown"'));
  assert.ok(mushaf.includes('if(dx<0)nextPage()'));
  assert.ok(mushaf.includes('else previousPage()'));
  assert.ok(mushaf.includes('fallback.style.touchAction="pan-y pinch-zoom"'));
  assert.ok(mushaf.includes('const isMobile=window.matchMedia("(max-width: 767px)").matches;'));
  assert.ok(mushaf.includes("preloadRadius=isMobile?2:8"));
  assert.ok(mushaf.includes("flippingTime:isMobile?620:850"));
  assert.ok(mushaf.includes("maxShadowOpacity:isMobile?.28:.68"));
  assert.doesNotMatch(mushaf, /if\(window\.matchMedia\("\(max-width: 767px\)"\)\.matches\)\{\s*fallbackRender/);
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
  assert.match(sw, /dhker-web-v23/);
  assert.match(sw, /quran-reader\.html/);
  assert.match(sw, /mushaf-reader\.js/);
  assert.match(sw, /MUSHAF_CACHE/);
  assert.match(sw, /assets\/mushaf\/hafsTajweed/);
});

test("recitation player remains available in its own tab without embedded Quran pages", () => {
  assert.match(html, /id="recitations"/);
  assert.match(html, /href="#recitations"/);
  assert.match(html, /id="quranAudioSource"/);
  assert.match(html, /id="quranReciter"/);
  assert.match(html, /id="quranSurah"/);
  assert.match(html, /id="playQuranRecitation"/);
  assert.match(html, /id="quranPlayer"/);
  assert.match(html, /id="quranAudioStatus"/);
  assert.ok(script.includes("setupQuranAudio();"));
  assert.ok(script.includes("async function setupQuranAudio()"));
  assert.doesNotMatch(html, /id="quranContent"|id="quranStatus"|id="quranPage"/);
});
test("Mushaf header is opaque and does not overlay the page with the global identity frieze", () => {
  assert.match(reader, /background:#07130f!important/);
  assert.match(reader, /\.mushaf-header::before,.mushaf-header::after\{content:none!important/);
  assert.match(reader, /position:relative;top:auto/);
});

test("hadith library uses the documented 17-book API with book, chapter and hadith browsing", () => {
  assert.match(html, /id="hadithBooksView"/);
  assert.match(html, /id="hadithBookSearch"/);
  assert.match(html, /id="hadithBookCategories"/);
  assert.match(html, /id="hadithChaptersView"/);
  assert.match(html, /id="hadithChapterSearch"/);
  assert.match(html, /id="hadithReadView"/);
  assert.match(html, /id="hadithTextSearch"/);
  assert.match(html, /id="hadithLoadMore"/);
  assert.ok(script.includes('fetchJson(API + "/list")'));
  assert.ok(script.includes('fetchJson(API + "/" + encodeURIComponent(book.id))'));
  assert.ok(script.includes('"/chapter/" + encodeURIComponent(chapterId)'));
  assert.ok(script.includes("book.total_hadiths"));
  assert.ok(script.includes("chapter.hadith_count"));
  assert.ok(script.includes("hadith.english"));
  assert.ok(script.includes("PAGE_SIZE = 20"));
});
test("hadith takhrij opens official Dorar search in a new tab without client-side API tokens or JSONP", () => {
  assert.match(script, /https:\/\/dorar\.net\/hadith\/search/);
  assert.ok(script.includes('"https://dorar.net/hadith/search?q=" + encodeURIComponent(originalText.slice(0, 160))'));
  assert.ok(script.includes('takhrijLink.target = "_blank"'));
  assert.ok(script.includes('takhrijLink.rel = "noopener noreferrer"'));
  assert.ok(script.includes("التحقق من صحة الحديث والتخريج"));
  assert.doesNotMatch(script, /dorar_api\.json|DORAR_API|callbackName|searchDorar/);
});
test("hadith data and grading sources are attributed separately", () => {
  assert.doesNotMatch(html, /Al Furqan Hadith API|Hadith-JSON|class="hadith-attribution"/);
  assert.ok(script.includes("https://dorar.net/hadith/search?q="));
});
test("service worker refreshes the hadith library interface", () => {
  assert.match(sw, /dhker-web-v23/);
});

test("supplied hadith code is integrated without duplicate screens, globals, or inline handlers", () => {
  assert.match(html, /id="hadithLoader"/);
  assert.ok(script.includes('const API = "https://alfurqan.online/api/v1/hadith"'));
  assert.equal((script.match(/async function setupHadithLibrary\(\)/g) || []).length, 1);
  assert.doesNotMatch(html, /id="hadith-books-screen"|id="hadith-chapters-screen"|id="hadith-content-screen"/);
  assert.doesNotMatch(script, /HADITH_BASE_URL|currentBookData|currentBookId|showBooksScreen\(|showChaptersScreen\(/);
  assert.doesNotMatch(html, /onclick=["'](?:loadBook|loadChapter|showBooksScreen|showChaptersScreen)/);
  const start = script.indexOf("async function setupHadithLibrary()");
  const end = script.indexOf("function setupNavigation()", start);
  const libraryScript = script.slice(start, end);
  assert.doesNotMatch(libraryScript, /\.innerHTML\s*=/);
  assert.ok(libraryScript.includes("setStatus(message, loading = false)"));
  assert.ok(libraryScript.includes('setStatus("جارٍ تحميل فهرس الكتب السبعة عشر…", true)'));
  assert.ok(libraryScript.includes('setStatus("جارٍ تحميل أحاديث هذا الباب…", true)'));
});
test("hadith data is fetched by book and chapter instead of downloading whole book JSON files", () => {
  assert.ok(script.includes('fetchJson(API + "/list")'));
  assert.ok(script.includes('fetchJson(API + "/" + encodeURIComponent(book.id))'));
  assert.ok(script.includes('"/chapter/" + encodeURIComponent(chapterId)'));
  assert.doesNotMatch(script, /raw\.githubusercontent\.com\/AhmedBaset\/hadith-json/);
});
test("hadith loader styles are scoped and respect reduced motion", () => {
  assert.match(css, /\.hadith-loader\[hidden\]/);
  assert.match(css, /\.hadith-spinner/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("Mushaf uses locally bundled page images and caches them on demand", () => {
  assert.ok(mushaf.includes('const IMAGE_BASE="./assets/mushaf/hafsTajweed/page";'));
  assert.doesNotMatch(mushaf, /raw\.githubusercontent\.com\/Zizwar\/mushaf-mauri/);
  assert.match(sw, /url\.pathname\.includes\("\/assets\/mushaf\/hafsTajweed\/"\)/);
  assert.match(sw, /const MUSHAF_CACHE = "dhker-mushaf-pages-v1"/);
  assert.match(sw, /url\.origin === self\.location\.origin/);
});

test("mobile-first app shell provides bottom navigation without replacing service panels", () => {
  assert.match(html, /mobile-app\.css/);
  assert.match(html, /class="mobile-app-nav"/);
  for (const id of ["home", "prayer", "adhkar", "hadith"]) assert.match(html, new RegExp('href="#' + id + '"'));
  assert.match(html, /href="\.\/quran-reader\.html"/);
  assert.match(mobileCss, /mobile-app-nav/);
  assert.ok(script.includes('.mobile-app-nav a[href^="#"]'));
  assert.match(sw, /dhker-web-v23/);
  assert.match(sw, /mobile-app\.css/);
});

test("Mushaf leftward swipe advances the ascending Quran page sequence", () => {
  assert.match(mushaf, /readingDirection:"rtl"/);
  assert.match(mushaf, /for\(let n=1;n<=TOTAL_PAGES;n\+\+\)/);
  assert.match(reader, /mushaf-reader\.js\?v=14/);
  assert.match(sw, /dhker-web-v23/);
});

test("Hadith page uses a concise verification action and project design credit", () => {
  assert.doesNotMatch(html, /مصدر النصوص والفهارس|Hadith-JSON/);
  assert.ok(html.includes("© 2026 ذِكر  | تصميم أبو عبّد المهيمن العراقي"));
  assert.match(script, /التحقق من صحة الحديث والتخريج/);
  assert.doesNotMatch(script, /يفتح البحث في موقع الدرر السنية الرسمي/);
  assert.match(sw, /dhker-web-v23/);
});


test("service navigation hides fixed decorative lanterns from content panels", () => {
  assert.ok(script.includes('document.body.classList.toggle("dhker-service-view", id !== "home")'));
  assert.match(identityCss, /\.dhker-service-view \.dhk-3d-lantern-stage/);
  assert.match(identityCss, /visibility: hidden !important/);
});


test("PWA metadata supports standalone installation on mobile browsers", () => {
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /mobile-web-app-capable/);
  assert.match(html, /apple-touch-icon/);
  assert.match(manifest, /"display_override":\s*\[\s*"standalone",\s*"minimal-ui"\s*\]/);
});

test("service worker uses network-first navigation and versioned cache for app shell", () => {
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /await fetch\(request\)/);
  assert.match(sw, /dhker-web-v23/);
});

test("mobile service panels remove decorative header strips and reserve space for bottom navigation", () => {
  assert.match(mobileCss, /dhker-service-view #dhker-identity-bar/);
  assert.match(mobileCss, /dhker-service-view \.ayah-ribbon/);
  assert.match(mobileCss, /padding-bottom:calc\(var\(--dhker-nav-height\) \+ 20px\)/);
});
