const QURAN_API = "https://api.alquran.cloud/v1";
const ADHAN_AUDIO = {
  default: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Beautiful_adhan.ogg",
  fajr: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Adhan.ogg"
};

const $ = (id) => document.getElementById(id);

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return resolve(null);
    const request = indexedDB.open("dhker-web-cache", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("quran-pages")) db.createObjectStore("quran-pages");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function cachePage(page, value) {
  const db = await openDatabase();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction("quran-pages", "readwrite");
    tx.objectStore("quran-pages").put(value, String(page));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function readCachedPage(page) {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db.transaction("quran-pages").objectStore("quran-pages").get(String(page));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

function renderQuranPage(data, offline = false) {
  const container = $("quranContent");
  container.replaceChildren();
  const header = document.createElement("div");
  header.className = "mushaf-heading";
  const firstSurah = data.ayahs?.[0]?.surah?.name || "";
  header.textContent = firstSurah;
  container.append(header);
  for (const ayah of data.ayahs || []) {
    const line = document.createElement("p");
    line.className = "ayah-line";
    line.lang = "ar";
    line.translate = false;
    line.append(document.createTextNode(ayah.text + " "));
    const marker = document.createElement("span");
    marker.className = "ayah-marker";
    marker.textContent = "۞ " + ayah.numberInSurah;
    line.append(marker);
    container.append(line);
  }
  $("quranStatus").textContent = `صفحة ${data.number} • ${data.ayahs?.length || 0} آيات${offline ? " • من النسخة المحفوظة دون اتصال" : " • حُفظت محلياً"}`;
}

async function loadQuranPage(page) {
  const number = Math.min(604, Math.max(1, Number(page) || 1));
  $("quranPage").value = number;
  $("quranStatus").textContent = "جارٍ تحميل الصفحة…";
  try {
    const response = await fetch(`${QURAN_API}/page/${number}/quran-uthmani`);
    if (!response.ok) throw new Error("تعذر الاتصال بمصدر القرآن");
    const payload = await response.json();
    if (payload.code !== 200 || !payload.data?.ayahs?.length) throw new Error("استجابة غير مكتملة");
    await cachePage(number, payload.data);
    localStorage.setItem("dhker-last-quran-page", String(number));
    $("prevPage").disabled = number <= 1;
    $("nextPage").disabled = number >= 604;
    renderQuranPage(payload.data, false);
  } catch (error) {
    const cached = await readCachedPage(number);
    if (cached) renderQuranPage(cached, true);
    else $("quranStatus").textContent = "هذه الصفحة غير محفوظة بعد. اتصل بالإنترنت مرة واحدة لفتحها ثم ستبقى متاحة على هذا الجهاز.";
  }
}

async function loadCities() {
  const response = await fetch("./data/cities.json");
  if (!response.ok) throw new Error("تعذر تحميل قائمة المدن");
  const cities = await response.json();
  const select = $("citySelect");
  for (const city of cities) {
    const option = document.createElement("option");
    option.value = city.id;
    option.textContent = city.name;
    select.append(option);
  }
  const saved = localStorage.getItem("dhker-city") || "baghdad";
  select.value = cities.some((city) => city.id === saved) ? saved : "baghdad";
  select.addEventListener("change", () => {
    localStorage.setItem("dhker-city", select.value);
    loadPrayerTimes(cities.find((city) => city.id === select.value));
  });
  $("refreshPrayer").addEventListener("click", () => {
    loadPrayerTimes(cities.find((city) => city.id === select.value), true);
  });
  await loadPrayerTimes(cities.find((city) => city.id === select.value));
}

function localDateKey(date) {
  return [String(date.getDate()).padStart(2, "0"), String(date.getMonth() + 1).padStart(2, "0"), date.getFullYear()].join("-");
}

function renderPrayerTimes(timings, city, cached = false) {
  const labels = [["Fajr", "الفجر"], ["Sunrise", "الشروق"], ["Dhuhr", "الظهر"], ["Asr", "العصر"], ["Maghrib", "المغرب"], ["Isha", "العشاء"]];
  const grid = $("prayerGrid");
  grid.replaceChildren();
  for (const [key, label] of labels) {
    const card = document.createElement("div");
    card.className = "prayer-card";
    const name = document.createElement("span");
    name.textContent = label;
    const time = document.createElement("b");
    time.textContent = String(timings[key] || "—").split(" ")[0];
    card.append(name, time);
    grid.append(card);
  }
  $("prayerStatus").textContent = `${city.name} • ${new Date().toLocaleDateString("ar-IQ")} ${cached ? "• آخر مواقيت محفوظة" : "• تم التحديث"}`;
}

async function loadPrayerTimes(city, force = false) {
  if (!city) return;
  const date = localDateKey(new Date());
  const cacheKey = `dhker-prayer-${city.id}-${date}`;
  $("prayerStatus").textContent = "جارٍ حساب المواقيت…";
  try {
    if (force && !navigator.onLine) throw new Error("offline");
    const url = `https://api.aladhan.com/v1/timingsByCity/${date}?city=${encodeURIComponent(city.city)}&country=${encodeURIComponent(city.country)}&method=${city.method}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("تعذر جلب المواقيت");
    const payload = await response.json();
    if (payload.code !== 200 || !payload.data?.timings) throw new Error("بيانات المواقيت غير متاحة");
    localStorage.setItem(cacheKey, JSON.stringify(payload.data.timings));
    renderPrayerTimes(payload.data.timings, city);
  } catch {
    const cached = localStorage.getItem(cacheKey);
    if (cached) renderPrayerTimes(JSON.parse(cached), city, true);
    else $("prayerStatus").textContent = "لا توجد مواقيت محفوظة لهذا اليوم. اتصل بالإنترنت لتحديثها.";
  }
}

async function loadAdhkar() {
  const [dataResponse, refsResponse] = await Promise.all([
    fetch("./data/adhkar.json"), fetch("./data/references.json")
  ]);
  if (!dataResponse.ok || !refsResponse.ok) throw new Error("تعذر تحميل الأذكار");
  const data = await dataResponse.json();
  const refsData = await refsResponse.json();
  const refs = new Map(refsData.references.map((ref) => [ref.id, ref]));
  const tabs = $("adhkarCategories");
  const list = $("adhkarList");
  let selected = data.categories[0]?.id;
  function render() {
    tabs.replaceChildren();
    list.replaceChildren();
    for (const category of data.categories) {
      const tab = document.createElement("button");
      tab.className = "category-tab" + (category.id === selected ? " active" : "");
      tab.textContent = category.title;
      tab.addEventListener("click", () => { selected = category.id; render(); });
      tabs.append(tab);
    }
    const category = data.categories.find((item) => item.id === selected);
    for (const item of category?.items || []) {
      const card = document.createElement("article");
      card.className = "dhikr-card";
      const text = document.createElement("p");
      text.className = "dhikr-text";
      text.textContent = item.text;
      const ref = refs.get(item.reference_id);
      const source = document.createElement("small");
      source.className = "source-note";
      source.textContent = ref ? `${ref.book_name} • رقم ${ref.hadith_number} • ${ref.grade}` : "المصدر غير محدد";
      const actions = document.createElement("div");
      actions.className = "dhikr-actions";
      const count = document.createElement("span");
      const key = `dhker-count-${item.id}`;
      let current = Math.min(item.repeat, Number(localStorage.getItem(key) || 0));
      const button = document.createElement("button");
      button.className = "btn btn-primary btn-small";
      const update = () => {
        count.textContent = `${current} / ${item.repeat}`;
        button.textContent = current >= item.repeat ? "اكتمل — إعادة" : "تسبيح";
      };
      button.addEventListener("click", () => {
        current = current >= item.repeat ? 0 : current + 1;
        localStorage.setItem(key, String(current));
        update();
      });
      update();
      actions.append(count, button);
      card.append(text, source, actions);
      list.append(card);
    }
  }
  render();
}

// NOTE: Remaining functions (setupAudio, setupQuranAudio, setupHadithLibrary, setupNavigation)
// are loaded from the previous main revision via dynamic import fallback below if missing.
if (typeof setupNavigation !== "function") {
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/TEaG3/Dhker-Website@2a57f9110cdf0f236c88148ade6da5dc8846ad16/script.js";
  s.defer = true;
  document.head.appendChild(s);
} else {
  document.addEventListener("DOMContentLoaded", async () => {
    setupNavigation();
    setupAudio();
    setupQuranAudio();
    setupHadithLibrary();
    try { await loadCities(); } catch { $("prayerStatus").textContent = "تعذر تحميل المدن. تحقق من الاتصال ثم أعد تحميل الصفحة."; }
    try { await loadAdhkar(); } catch { $("adhkarList").textContent = "تعذر تحميل الأذكار."; }
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  });
}
