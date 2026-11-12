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

async function setupAudio(){
 const player=$("adhanPlayer"),status=$("adhanAudioStatus"),list=document.querySelector(".audio-list");if(!player||!status||!list)return;const api="https://alfurqan.online/api/v1";
 try{const r=await fetch(api+"/athan/list");if(!r.ok)throw Error();const d=await r.json(),items=d.athans||d.items||d.data||[];if(!items.length)throw Error();list.replaceChildren();
  for(const item of items){const id=item.id||item.slug;if(!id)continue;const card=document.createElement("div");card.className="audio-card dhk-illuminated-card";const info=document.createElement("div"),title=document.createElement("b"),meta=document.createElement("small"),button=document.createElement("button");title.textContent=item.name_ar||item.arabicName||item.name||"تسجيل أذان";meta.textContent=[item.muezzin,item.location].filter(Boolean).join(" • ")||"تسجيل أذان";info.append(title,meta);button.className="btn btn-outline btn-small audio-play";button.textContent="استمع";
   button.addEventListener("click",async()=>{if(player.dataset.current===id&&!player.paused){player.pause();button.textContent="استمع";return;}list.querySelectorAll(".audio-play").forEach(b=>b.textContent="استمع");player.pause();player.src=api+"/athan/"+encodeURIComponent(id);player.dataset.current=id;try{await player.play();button.textContent="إيقاف";status.textContent="يُبث التسجيل من مكتبة الأذان.";}catch{button.textContent="استمع";status.textContent="تعذر تشغيل التسجيل. اختر تسجيلاً آخر.";}});card.append(info,button);list.append(card);}
  if(!list.children.length)throw Error();status.textContent="مكتبة الأذان جاهزة — "+list.children.length+" تسجيلاً.";
 }catch{status.textContent="تعذر تحميل مكتبة الأذان الآن. تحقق من الاتصال ثم أعد المحاولة.";}
 player.addEventListener("ended",()=>list.querySelectorAll(".audio-play").forEach(b=>b.textContent="استمع"));
}
async function setupQuranAudio() {
  const player=$("quranPlayer"), button=$("playQuranRecitation"), status=$("quranAudioStatus"), select=$("quranReciter"); if(!player||!button||!status||!select)return;
  const api="https://alfurqan.online/api/v1"; let current=null;
  try { const r=await fetch(api+"/reciters"); if(!r.ok)throw Error(); const d=await r.json(), reciters=d.reciters||[]; if(!reciters.length)throw Error(); select.replaceChildren();
    for(const item of reciters){const o=document.createElement("option");o.value=item.id;o.textContent=item.arabicName||item.name||item.id;select.append(o);}
    const preferred=["maher-almuaiqly","husary","abdul-basit-murattal","minshawy-murattal"];select.value=preferred.find(id=>reciters.some(x=>x.id===id))||reciters[0].id;status.textContent="تتوفر تلاوات من "+reciters.length+" قارئاً.";
  }catch{status.textContent="تعذر تحميل قائمة القراء. تحقق من الاتصال.";button.disabled=true;return;}
  async function nextAyah(){if(!current)return;player.src=api+"/audio/"+encodeURIComponent(current.reciter)+"/surah/"+current.surah+"/ayah/"+current.ayah;try{await player.play();status.textContent="السورة "+current.surah+" — الآية "+current.ayah+" من "+current.total;}catch{current=null;button.textContent="استمع للسورة";status.textContent="تعذر تشغيل التلاوة. تحقق من الاتصال أو اختر قارئاً آخر.";}}
  player.addEventListener("ended",()=>{if(!current)return;if(current.ayah<current.total){current.ayah++;nextAyah();}else{current=null;button.textContent="استمع للسورة";status.textContent="اكتملت التلاوة.";}});
  button.addEventListener("click",async()=>{if(current){current=null;player.pause();player.removeAttribute("src");button.textContent="استمع للسورة";status.textContent="تم إيقاف التلاوة.";return;}const surah=Math.min(114,Math.max(1,Number($("quranSurah").value)||1));button.textContent="إيقاف التلاوة";status.textContent="جارٍ تجهيز السورة…";try{const r=await fetch(api+"/surahs/"+surah);if(!r.ok)throw Error();const d=await r.json(),total=d.surah?.ayahCount||d.ayahCount;if(!Number.isInteger(total)||total<1)throw Error();current={surah:surah,reciter:select.value,ayah:1,total:total};await nextAyah();}catch{current=null;button.textContent="استمع للسورة";status.textContent="تعذر جلب بيانات السورة. حاول مجدداً.";}});
  player.addEventListener("error",()=>{if(current){current=null;button.textContent="استمع للسورة";status.textContent="تعذر تحميل ملف التلاوة. اختر قارئاً آخر.";}});
}
async function setupHadithLibrary(){
 const booksEl=$("hadithBook"),chaptersEl=$("hadithChapter"),list=$("hadithList"),status=$("hadithStatus");if(!booksEl||!chaptersEl||!list||!status)return;
 const api="https://alfurqan.online/api/v1/hadith";
 try{const r=await fetch(api+"/list");if(!r.ok)throw Error();const d=await r.json(),books=d.books||d.items||d.data||[];if(!books.length)throw Error();booksEl.replaceChildren();
  for(const b of books){const o=document.createElement("option");o.value=b.id;o.textContent=b.name_ar||b.name||b.name_en||b.id;booksEl.append(o);}
  async function loadBook(){status.textContent="جارٍ تحميل أبواب الكتاب…";list.replaceChildren();chaptersEl.disabled=true;try{const r=await fetch(api+"/"+encodeURIComponent(booksEl.value));if(!r.ok)throw Error();const d=await r.json(),chapters=d.chapters||d.book?.chapters||[];chaptersEl.replaceChildren();for(const c of chapters){const o=document.createElement("option");o.value=c.id??c.chapterId;o.textContent=c.name_ar||c.name||c.title||("الباب "+o.value);chaptersEl.append(o);}chaptersEl.disabled=!chapters.length;if(chapters.length)await loadChapter();else status.textContent="لا توجد أبواب متاحة.";}catch{status.textContent="تعذر تحميل أبواب الكتاب.";}}
  async function loadChapter(){if(!chaptersEl.value)return;status.textContent="جارٍ تحميل الأحاديث…";list.replaceChildren();try{const r=await fetch(api+"/"+encodeURIComponent(booksEl.value)+"/chapter/"+encodeURIComponent(chaptersEl.value));if(!r.ok)throw Error();const d=await r.json(),items=d.hadiths||d.chapter?.hadiths||[];for(const item of items){const card=document.createElement("article");card.className="dhikr-card";const n=document.createElement("small");n.className="source-note";n.textContent="حديث رقم "+(item.idInBook||item.id||"");const p=document.createElement("p");p.className="dhikr-text";p.textContent=item.arabic||item.text_ar||item.text||"النص العربي غير متاح";card.append(n,p);list.append(card);}status.textContent="الأحاديث المعروضة: "+items.length;}catch{status.textContent="تعذر تحميل أحاديث هذا الباب.";}}
  booksEl.addEventListener("change",loadBook);chaptersEl.addEventListener("change",loadChapter);await loadBook();
 }catch{status.textContent="تعذر تحميل فهرس كتب الحديث حالياً. تحقق من الاتصال.";}
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
  setupHadithLibrary();
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
