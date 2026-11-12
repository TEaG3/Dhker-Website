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

async function setupAudio() {
  const player = $("adhanPlayer");
  const status = $("adhanAudioStatus");
  const list = $("adhanLibraryList");
  const stopButton = $("stopAdhan");
  const tabs = $("adhanCategories");
  if (!player || !status || !list || !stopButton || !tabs) return;

  const api = "https://alfurqan.online/api/v1";
  let activeButton = null;

  function resetPlayback(message = "") {
    player.pause();
    player.removeAttribute("src");
    player.load();
    if (activeButton) {
      activeButton.textContent = "استمع";
      activeButton.setAttribute("aria-pressed", "false");
    }
    activeButton = null;
    stopButton.disabled = true;
    if (message) status.textContent = message;
  }

  async function playFrom(button, url, key) {
    if (activeButton === button && !player.paused) {
      resetPlayback("تم إيقاف صوت الأذان.");
      return;
    }
    resetPlayback();
    player.src = url;
    player.dataset.current = key;
    activeButton = button;
    button.textContent = "إيقاف";
    button.setAttribute("aria-pressed", "true");
    stopButton.disabled = false;
    try {
      await player.play();
      status.textContent = "يُشغّل تسجيل الأذان الآن.";
    } catch {
      resetPlayback("تعذر تشغيل التسجيل. تحقق من الاتصال ثم حاول مجدداً.");
    }
  }

  function showAdhanTab(name) {
    tabs.querySelectorAll("[data-adhan-tab]").forEach((tab) => {
      const selected = tab.dataset.adhanTab === name;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    document.querySelectorAll(".adhan-tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== "adhanPanel-" + name;
    });
  }

  tabs.querySelectorAll("[data-adhan-tab]").forEach((tab) => {
    tab.addEventListener("click", () => showAdhanTab(tab.dataset.adhanTab));
  });

  document.querySelectorAll(".adhan-play[data-audio]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.audio;
      const url = ADHAN_AUDIO[key];
      if (url) playFrom(button, url, key);
    });
  });

  stopButton.addEventListener("click", () => {
    resetPlayback("تم إيقاف صوت الأذان.");
  });

  player.addEventListener("ended", () => resetPlayback("انتهى تسجيل الأذان."));
  player.addEventListener("error", () => resetPlayback("تعذر تحميل التسجيل. اختر تسجيلاً آخر."));

  try {
    const response = await fetch(api + "/athan/list");
    if (!response.ok) throw new Error("Audio catalog request failed");
    const data = await response.json();
    const items = data.athans || data.items || data.data || [];
    if (!items.length) throw new Error("Empty audio catalog");

    list.replaceChildren();
    for (const item of items) {
      const id = item.id || item.slug;
      if (!id) continue;
      const card = document.createElement("div");
      card.className = "audio-card dhk-illuminated-card";
      const info = document.createElement("div");
      const title = document.createElement("b");
      const meta = document.createElement("small");
      const button = document.createElement("button");
      title.textContent = item.name_ar || item.arabicName || item.name || "تسجيل أذان";
      meta.textContent = [item.muezzin, item.location].filter(Boolean).join(" • ") || "تسجيل أذان";
      button.className = "btn btn-outline btn-small adhan-play";
      button.type = "button";
      button.textContent = "استمع";
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        playFrom(button, api + "/athan/" + encodeURIComponent(id), "library:" + id);
      });
      info.append(title, meta);
      card.append(info, button);
      list.append(card);
    }
    if (!list.children.length) throw new Error("No usable audio entries");
    status.textContent = "مكتبة الأذان جاهزة — " + list.children.length + " تسجيلاً.";
  } catch {
    list.replaceChildren();
    const message = document.createElement("p");
    message.className = "source-note";
    message.textContent = "تعذر تحميل مكتبة التسجيلات الآن. يمكنك استخدام الأذان الأساسي أو أذان الفجر، ثم المحاولة مجدداً.";
    list.append(message);
    status.textContent = "تعذر تحميل المكتبة الخارجية. التسجيلان الأساسي والفجر متاحان عند الاتصال.";
  }
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
async function setupHadithLibrary() {
  const booksEl = $("hadithBooks");
  const chaptersWrap = $("hadithChaptersWrap");
  const chaptersEl = $("hadithChapters");
  const selectedBookEl = $("hadithSelectedBook");
  const backButton = $("backHadithBooks");
  const list = $("hadithList");
  const status = $("hadithStatus");
  if (!booksEl || !chaptersWrap || !chaptersEl || !selectedBookEl || !backButton || !list || !status) return;

  const api = "https://alfurqan.online/api/v1/hadith";

  function showBooks() {
    booksEl.hidden = false;
    chaptersWrap.hidden = true;
    list.replaceChildren();
    status.textContent = "اختر كتاباً لعرض أبوابه وأحاديثه.";
  }

  async function loadChapter(bookId, chapterId, activeTab) {
    chaptersEl.querySelectorAll(".category-tab").forEach((tab) => {
      const selected = tab === activeTab;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    status.textContent = "جارٍ تحميل الأحاديث…";
    list.replaceChildren();
    try {
      const response = await fetch(api + "/" + encodeURIComponent(bookId) + "/chapter/" + encodeURIComponent(chapterId));
      if (!response.ok) throw new Error("Hadith chapter request failed");
      const data = await response.json();
      const items = data.hadiths || data.chapter?.hadiths || [];
      for (const item of items) {
        const card = document.createElement("article");
        card.className = "dhikr-card";
        const number = document.createElement("small");
        number.className = "source-note";
        number.textContent = "حديث رقم " + (item.idInBook || item.id || "");
        const text = document.createElement("p");
        text.className = "dhikr-text";
        text.textContent = item.arabic || item.text_ar || item.text || "النص العربي غير متاح";
        card.append(number, text);
        list.append(card);
      }
      status.textContent = items.length ? "الأحاديث المعروضة: " + items.length : "لا توجد أحاديث متاحة في هذا الباب.";
    } catch {
      status.textContent = "تعذر تحميل أحاديث هذا الباب. حاول اختيار باب آخر.";
    }
  }

  async function loadBook(book) {
    status.textContent = "جارٍ تحميل أبواب " + (book.name_ar || book.name || "الكتاب") + "…";
    list.replaceChildren();
    chaptersEl.replaceChildren();
    booksEl.hidden = true;
    chaptersWrap.hidden = false;
    selectedBookEl.textContent = book.name_ar || book.name || book.name_en || "أبواب الكتاب";
    try {
      const response = await fetch(api + "/" + encodeURIComponent(book.id));
      if (!response.ok) throw new Error("Hadith book request failed");
      const data = await response.json();
      const chapters = data.chapters || data.book?.chapters || [];
      if (!chapters.length) {
        status.textContent = "لا توجد أبواب متاحة لهذا الكتاب.";
        return;
      }
      for (const chapter of chapters) {
        const chapterId = chapter.id ?? chapter.chapterId;
        if (chapterId === undefined || chapterId === null) continue;
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "category-tab";
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", "false");
        tab.textContent = chapter.name_ar || chapter.name || chapter.title || ("الباب " + chapterId);
        tab.addEventListener("click", () => loadChapter(book.id, chapterId, tab));
        chaptersEl.append(tab);
      }
      const firstTab = chaptersEl.querySelector(".category-tab");
      if (firstTab) firstTab.click();
      else status.textContent = "لم يتم العثور على أبواب قابلة للعرض.";
    } catch {
      status.textContent = "تعذر تحميل أبواب الكتاب. تحقق من الاتصال.";
    }
  }

  backButton.addEventListener("click", showBooks);

  try {
    const response = await fetch(api + "/list");
    if (!response.ok) throw new Error("Hadith books request failed");
    const data = await response.json();
    const books = data.books || data.items || data.data || [];
    if (!books.length) throw new Error("Empty hadith catalog");
    booksEl.replaceChildren();
    for (const book of books) {
      if (!book.id) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "library-entry";
      const title = document.createElement("b");
      const detail = document.createElement("small");
      title.textContent = book.name_ar || book.name || book.name_en || book.id;
      detail.textContent = book.name_en || "اضغط لعرض الأبواب والأحاديث";
      button.append(title, detail);
      button.addEventListener("click", () => loadBook(book));
      booksEl.append(button);
    }
    if (!booksEl.children.length) throw new Error("No usable books");
    status.textContent = "اختر كتاباً لعرض أبوابه وأحاديثه.";
  } catch {
    booksEl.replaceChildren();
    status.textContent = "تعذر تحميل فهرس كتب الحديث حالياً. تحقق من الاتصال.";
  }
}
function setupNavigation() {
  const toggle = $("menuToggle");
  const nav = $("navList");

  function showTab(id, updateHistory = true) {
    const panels = Array.from(document.querySelectorAll(".tab-panel"));
    if (!panels.some((panel) => panel.id === id)) id = "home";
    panels.forEach((panel) => {
      const active = panel.id === id;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    nav.querySelectorAll('a[href^="#"]').forEach((link) => {
      if (link.getAttribute("href") === "#" + id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (updateHistory) history.pushState({ tab: id }, "", "#" + id);
    if (id !== "home") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href").slice(1);
      if (!document.getElementById(id)?.classList.contains("tab-panel")) return;
      event.preventDefault();
      showTab(id);
      nav.classList.remove("active");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("active");
    toggle.setAttribute("aria-expanded", String(open));
  });

  window.addEventListener("popstate", () => {
    showTab(location.hash.slice(1) || "home", false);
  });
  showTab(location.hash.slice(1) || "home", false);
}

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupAudio();
  setupHadithLibrary();
  try { await loadCities(); } catch { $("prayerStatus").textContent = "تعذر تحميل المدن. تحقق من الاتصال ثم أعد تحميل الصفحة."; }
  try { await loadAdhkar(); } catch { $("adhkarList").textContent = "تعذر تحميل الأذكار."; }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});
