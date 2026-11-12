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
  const player = $("quranPlayer"), button = $("playQuranRecitation"), status = $("quranAudioStatus");
  const sourceSelect = $("quranAudioSource"), reciterSelect = $("quranReciter");
  if (!player || !button || !status || !sourceSelect || !reciterSelect) return;
  const ALFURQAN = "https://alfurqan.online/api/v1";
  const ALQURAN = "https://api.alquran.cloud/v1";
  // Official API base (no www redirect) documented by MP3Quran.net.
  const MP3QURAN = "https://mp3quran.net/api/v3";
  const memoryCatalogs = Object.create(null);
  const CACHE_TTL = 12 * 60 * 60 * 1000;
  let selectedItems = [];
  let playback = null;
  let requestToken = 0;
  const fetchJson = async url => {
    const response = await fetch(url, {headers:{Accept:"application/json"}, cache:"no-cache"});
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  };
  const option = (value, label) => { const el = document.createElement("option"); el.value = value; el.textContent = label; return el; };
  function stopPlayback(message) {
    requestToken++; playback = null; player.pause(); player.removeAttribute("src"); player.load();
    button.textContent = "استمع للسورة"; if (message) status.textContent = message;
  }
  function readStoredCatalog(provider) {
    try {
      const saved = JSON.parse(localStorage.getItem("dhker-audio-catalog-" + provider) || "null");
      return saved && Array.isArray(saved.items) && saved.items.length ? saved : null;
    } catch { return null; }
  }
  async function loadCatalog(provider) {
    if (memoryCatalogs[provider]) return memoryCatalogs[provider];
    const stored = readStoredCatalog(provider);
    if (stored && Date.now() - Number(stored.savedAt || 0) < CACHE_TTL) {
      memoryCatalogs[provider] = stored.items;
      return {items:stored.items,cached:true,stale:false};
    }
    try {
      let items = [];
      if (provider === "alfurqan") {
        const data = await fetchJson(ALFURQAN + "/reciters");
        items = (data.reciters || []).map(item => ({id:item.id,label:item.arabicName || item.name || item.id,provider:"alfurqan"}));
      } else if (provider === "alqurancloud") {
        const data = await fetchJson(ALQURAN + "/edition?format=audio&language=ar");
        items = (data.data || []).filter(item => item.identifier).map(item => ({id:item.identifier,label:item.name || item.englishName || item.identifier,provider:"alqurancloud"}));
      } else if (provider === "mp3quran") {
        const data = await fetchJson(MP3QURAN + "/reciters?language=ar");
        for (const reciter of data.reciters || []) {
          for (const moshaf of reciter.moshaf || []) {
            if (!moshaf.server || !moshaf.id) continue;
            items.push({id:String(moshaf.id),label:(reciter.name || "قارئ") + " — " + (moshaf.name || "رواية غير محددة"),server:moshaf.server,surahList:String(moshaf.surah_list || ""),provider:"mp3quran"});
          }
        }
      }
      if (!items.length) throw new Error("لم يُرجع المصدر أي قراء صالحين");
      memoryCatalogs[provider] = items;
      try { localStorage.setItem("dhker-audio-catalog-" + provider, JSON.stringify({savedAt:Date.now(),items:items})); } catch {}
      return {items:items,cached:false,stale:false};
    } catch (error) {
      if (stored) {
        memoryCatalogs[provider] = stored.items;
        return {items:stored.items,cached:true,stale:true};
      }
      throw error;
    }
  }
  async function refreshCatalog() {
    stopPlayback();
    const provider = sourceSelect.value;
    status.textContent = "جارٍ تحميل فهرس القراء من المصدر المختار…";
    reciterSelect.disabled = true; button.disabled = true; reciterSelect.replaceChildren();
    try {
      const catalog = await loadCatalog(provider);
      selectedItems = catalog.items;
      for (const item of selectedItems) reciterSelect.append(option(item.id,item.label));
      reciterSelect.disabled = false; button.disabled = false;
      const sourceNames = {alfurqan:"Al Furqan",alqurancloud:"AlQuran Cloud",mp3quran:"MP3Quran.net"};
      const cacheNote = catalog.stale ? " — نسخة محفوظة مؤقتاً؛ تعذر تحديث المصدر" : catalog.cached ? " — من الذاكرة المؤقتة" : " — تم تحديث الفهرس";
      status.textContent = sourceNames[provider] + " — " + selectedItems.length + " خياراً صوتياً متاحاً" + cacheNote + ". اختر القارئ ثم السورة.";
    } catch (error) {
      selectedItems = []; reciterSelect.append(option("","تعذر تحميل القراء"));
      status.textContent = "تعذر تحميل مكتبة الصوتيات. جرّب مصدراً آخر أو أعد المحاولة عند توفر الاتصال.";
      button.disabled = true;
    }
  }
  function currentItem() { return selectedItems.find(item => item.id === reciterSelect.value); }
  async function playAyahQueue(token) {
    if (!playback || token !== requestToken) return;
    const url = playback.queue[playback.index];
    if (!url) { stopPlayback("اكتملت تلاوة السورة."); return; }
    player.src = url;
    try { await player.play(); status.textContent = "تلاوة السورة " + playback.surah + " — الآية " + (playback.index + 1) + " من " + playback.queue.length; }
    catch { stopPlayback("تعذر تشغيل الملف الصوتي. تحقق من الاتصال أو اختر مصدراً آخر."); }
  }
  player.addEventListener("ended", () => {
    if (!playback) return;
    if (!playback.queue) { stopPlayback("انتهت التلاوة."); return; }
    if (playback.index + 1 < playback.queue.length) { playback.index += 1; playAyahQueue(requestToken); }
    else stopPlayback("اكتملت تلاوة السورة.");
  });
  player.addEventListener("error", () => { if (playback) stopPlayback("تعذر تحميل هذا التسجيل. جرّب قارئاً أو مكتبة أخرى."); });
  sourceSelect.addEventListener("change", refreshCatalog);
  reciterSelect.addEventListener("change", () => { if (playback) stopPlayback("تم تغيير القارئ."); });
  button.addEventListener("click", async () => {
    if (playback) { stopPlayback("تم إيقاف التلاوة."); return; }
    const item = currentItem(); if (!item) { status.textContent = "اختر قارئاً أولاً."; return; }
    const surah = Math.min(114,Math.max(1,Number($("quranSurah").value)||1)); $("quranSurah").value=String(surah);
    const token=++requestToken; button.disabled=true; button.textContent="جارٍ التجهيز…";
    status.textContent="جارٍ تجهيز السورة من "+sourceSelect.selectedOptions[0].textContent+"…";
    try {
      if(item.provider==="mp3quran"){
        const available=item.surahList.split(",").map(Number).filter(Number.isFinite);
        if(available.length&&!available.includes(surah))throw new Error("هذه السورة غير متاحة لهذا المصحف الصوتي");
        playback={provider:item.provider,surah:surah};
        player.src=item.server.replace(/\/$/,"")+"/"+String(surah).padStart(3,"0")+".mp3";
        await player.play(); status.textContent=item.label+" — السورة "+surah;
      } else if(item.provider==="alqurancloud"){
        const data=await fetchJson(ALQURAN+"/surah/"+surah+"/"+encodeURIComponent(item.id));
        const ayahs=data.data?.ayahs||[]; const queue=ayahs.map(ayah=>ayah.audio).filter(Boolean);
        if(!queue.length||queue.length!==ayahs.length)throw new Error("ملفات هذه السورة غير مكتملة لهذا الإصدار الصوتي");
        playback={provider:item.provider,surah:surah,queue:queue,index:0}; await playAyahQueue(token);
      } else {
        const data=await fetchJson(ALFURQAN+"/surahs/"+surah);
        const total=data.surah?.ayahCount||data.ayahCount||data.data?.ayahCount;
        if(!Number.isInteger(total)||total<1)throw new Error("تعذر معرفة عدد آيات السورة");
        const queue=Array.from({length:total},(_,index)=>ALFURQAN+"/audio/"+encodeURIComponent(item.id)+"/surah/"+surah+"/ayah/"+(index+1));
        playback={provider:item.provider,surah:surah,queue:queue,index:0}; await playAyahQueue(token);
      }
      if(playback)button.textContent="إيقاف التلاوة";
    } catch(error) {
      playback=null; player.pause(); player.removeAttribute("src"); button.textContent="استمع للسورة";
      status.textContent=error.message&&error.message.startsWith("هذه السورة")?error.message:"لم نتمكن من تشغيل هذا الخيار. غيّر المكتبة أو القارئ وحاول مجدداً.";
    } finally { button.disabled=false; }
  });
  await refreshCatalog();
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
  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest("input,select,textarea,button,a,[contenteditable=true]")) return;
    const section = $("quran");
    const bounds = section?.getBoundingClientRect();
    if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); loadQuranPage(Number($("quranPage").value) + 1); }
    else if (event.key === "ArrowRight") { event.preventDefault(); loadQuranPage(Number($("quranPage").value) - 1); }
  });
  loadQuranPage(Number(localStorage.getItem("dhker-last-quran-page") || 1));
  try { await loadCities(); } catch { $("prayerStatus").textContent = "تعذر تحميل المدن. تحقق من الاتصال ثم أعد تحميل الصفحة."; }
  try { await loadAdhkar(); } catch { $("adhkarList").textContent = "تعذر تحميل الأذكار."; }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});
