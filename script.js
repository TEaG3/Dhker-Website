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

function setupAudio() {
  const player = $("adhanPlayer");
  document.querySelectorAll(".audio-play").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.dataset.audio;
      if (player.dataset.current === key && !player.paused) {
        player.pause();
        button.textContent = "استمع";
        return;
      }
      document.querySelectorAll(".audio-play").forEach((item) => { item.textContent = "استمع"; });
      player.src = ADHAN_AUDIO[key];
      player.dataset.current = key;
      try {
        await player.play();
        button.textContent = "إيقاف";
      } catch {
        $("audio").querySelector(".source-note").textContent = "تعذر تشغيل التسجيل من المصدر حالياً. تحقق من الاتصال أو افتح صفحة المصدر.";
      }
    });
  });
  player.addEventListener("ended", () => {
    document.querySelectorAll(".audio-play").forEach((item) => { item.textContent = "استمع"; });
  });
}

function setupQuranAudio() {
  const player = $("quranPlayer");
  const button = $("playQuranRecitation");
  const status = $("quranAudioStatus");
  if (!player || !button || !status) return;

  button.addEventListener("click", async () => {
    const surah = Math.min(114, Math.max(1, Number($("quranSurah").value) || 1));
    const reciter = $("quranReciter").value;
    $("quranSurah").value = String(surah);
    const url = `https://cdn.islamic.network/quran/audio-surah/128/${encodeURIComponent(reciter)}/${surah}.mp3`;

    if (player.dataset.source === url && !player.paused) {
      player.pause();
      status.textContent = "تم إيقاف التلاوة مؤقتاً.";
      return;
    }

    player.pause();
    player.src = url;
    player.dataset.source = url;
    status.textContent = "جارٍ الاتصال بمصدر التلاوة…";
    try {
      await player.play();
      status.textContent = `تلاوة السورة رقم ${surah} — ${$("quranReciter").selectedOptions[0].textContent}`;
    } catch {
      status.textContent = "تعذر تشغيل التلاوة حالياً. تحقق من الاتصال أو جرّب قارئاً آخر.";
    }
  });

  player.addEventListener("ended", () => {
    status.textContent = "انتهت التلاوة.";
  });
  player.addEventListener("error", () => {
    status.textContent = "تعذر تحميل الملف الصوتي من المصدر حالياً.";
  });
}

function setupNavigation() {
  const toggle = $("menuToggle");
  const nav = $("navList");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("active");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
  }));
}

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupAudio();
  setupQuranAudio();
  $("loadPage").addEventListener("click", () => loadQuranPage($("quranPage").value));
  $("prevPage").addEventListener("click", () => loadQuranPage(Number($("quranPage").value) - 1));
  $("nextPage").addEventListener("click", () => loadQuranPage(Number($("quranPage").value) + 1));
  $("quranPage").addEventListener("keydown", (event) => {
    if (event.key === "Enter") loadQuranPage($("quranPage").value);
  });
  loadQuranPage(Number(localStorage.getItem("dhker-last-quran-page") || 1));
  try { await loadCities(); } catch { $("prayerStatus").textContent = "تعذر تحميل المدن. تحقق من الاتصال ثم أعد تحميل الصفحة."; }
  try { await loadAdhkar(); } catch { $("adhkarList").textContent = "تعذر تحميل الأذكار."; }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});
