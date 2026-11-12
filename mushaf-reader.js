(()=>{"use strict";
const IMAGE_BASE="./assets/mushaf/hafsTajweed/page";
const TOTAL_PAGES=604;
const $=id=>document.getElementById(id);
const pageUrl=n=>IMAGE_BASE+n+".png";
const bookmarkKey="dhker-mushaf-mauri-bookmark";
const clampPage=n=>Math.max(1,Math.min(TOTAL_PAGES,Math.floor(Number(n)||1)));
let currentPage=clampPage(localStorage.getItem(bookmarkKey)||localStorage.getItem("dhker-last-mushaf-page")||1);
let pageFlip=null;
let fallbackMode=false;
let mobileMode=false;
let pageElements=[];

function setStatus(message,error=false){const el=$("readerStatus");el.textContent=message;el.classList.toggle("error",error);}
function makePage(n){
 const page=document.createElement("div");page.className="mushaf-page";page.dataset.page=String(n);
 const inner=document.createElement("div");inner.className="mushaf-page-inner";
 const img=document.createElement("img");img.alt="صفحة المصحف رقم "+n;img.decoding="async";img.loading="lazy";img.draggable=false;img.dataset.page=String(n);
 inner.append(img);page.append(inner);return page;
}
function preloadAround(page,radius=6){
 const center=clampPage(page);
 const first=Math.max(1,center-radius),last=Math.min(TOTAL_PAGES,center+radius);
 for(let n=first;n<=last;n++){
  const image=pageElements[n-1]?.querySelector("img");
  if(image&&!image.getAttribute("src"))image.src=pageUrl(n);
 }
}
function getVisibleIndexes(){
 if(!pageFlip)return [currentPage-1];
 const indexes=pageFlip.getVisiblePages();
 return Array.isArray(indexes)&&indexes.length?indexes:[pageFlip.getCurrentPageIndex()];
}
function getFirstVisiblePage(){
 const indexes=getVisibleIndexes().filter(Number.isFinite);
 return indexes.length?Math.min(...indexes)+1:currentPage;
}
function updateControls(){
 const visible=getVisibleIndexes().map(index=>index+1).sort((a,b)=>a-b);
 currentPage=getFirstVisiblePage();
 $("pageNumber").value=String(currentPage);
 $("previous").disabled=pageFlip?!pageFlip.canTurn("prev"):currentPage<=1;
 $("next").disabled=pageFlip?!pageFlip.canTurn("next"):currentPage>=TOTAL_PAGES;
 const label=visible.length>1?"الصفحات "+visible[0]+"–"+visible[visible.length-1]:"الصفحة "+currentPage;
 setStatus("المصحف جاهز — "+label+" من "+TOTAL_PAGES);
 localStorage.setItem("dhker-last-mushaf-page",String(currentPage));
 preloadAround(currentPage,mobileMode?2:8);
}
function fallbackRender(page){
 fallbackMode=true;currentPage=clampPage(page);
 $("mushafBook").style.display="none";$("mushafFallback").style.display="block";
 const img=$("fallbackPageImage");img.alt="صفحة المصحف رقم "+currentPage;img.src=pageUrl(currentPage);img.draggable=false;
 $("pageNumber").value=String(currentPage);$("previous").disabled=currentPage<=1;$("next").disabled=currentPage>=TOTAL_PAGES;
 setStatus("تعذّر تحميل محرك التقليب. وضع العرض البديل مفعل — الصفحة "+currentPage,true);
 img.onerror=()=>setStatus("تعذر تحميل صورة الصفحة. تحقق من اتصال الإنترنت.",true);
}
function fallbackGo(target){
 currentPage=clampPage(target);fallbackRender(currentPage);
 localStorage.setItem("dhker-last-mushaf-page",String(currentPage));
}
function buildPages(){
 const fragment=document.createDocumentFragment();pageElements=[];
 for(let n=1;n<=TOTAL_PAGES;n++){const page=makePage(n);pageElements.push(page);fragment.append(page);}
 $("mushafBook").append(fragment);
}
async function loadPageFlipModule(){
 const sources=[
  "https://esm.sh/@gullabs/flipbook-core@3.2.2",
  "https://cdn.jsdelivr.net/npm/@gullabs/flipbook-core@3.2.2/+esm"
 ];
 let lastError=null;
 for(const source of sources){
  try{
   const module=await import(source);
   if(typeof module.PageFlip!=="function")throw new Error("PageFlip export missing from "+source);
   return module;
  }catch(error){
   lastError=error;
   console.warn("Dhker Mushaf engine source failed:",source,error);
  }
 }
 throw lastError||new Error("No page-flip engine source could be loaded");
}
async function startFlipbook(){
 const isMobile=window.matchMedia("(max-width: 767px)").matches;
 mobileMode=isMobile;
 const preloadRadius=isMobile?2:8;
 // One PageFlip engine is used on every device; only performance settings vary.
 buildPages();
 preloadAround(currentPage,preloadRadius);
 try{
  const module=await loadPageFlipModule();
  const PageFlip=module.PageFlip;
  pageFlip=new PageFlip($("mushafBook"),{
   width:isMobile?420:560,height:isMobile?594:790,sizing:"responsive",
   minWidth:isMobile?260:300,maxWidth:isMobile?560:1220,
   minHeight:isMobile?360:420,maxHeight:isMobile?820:900,
   usePortrait:true,initialPage:currentPage-1,
   // Page DOM is ordered 1..604; leftward swipes must advance this ascending page sequence.
   readingDirection:isMobile?"ltr":"rtl",flippingTime:isMobile?620:850,
   pageBackground:"#fffaf0",drawShadow:true,maxShadowOpacity:isMobile?.28:.68,
   allowTouchScroll:false,respectInteractiveContent:true,
   respectReducedMotion:true,foldCornerOnHover:true,
   flipOnClick:"corners"
  });
  pageFlip.on("loaded",updateControls);
  pageFlip.on("ready",updateControls);
  pageFlip.on("flip",updateControls);
  pageFlip.on("changeOrientation",updateControls);
  pageFlip.on("changeState",()=>preloadAround(currentPage,isMobile?3:10));
  pageFlip.on("turnRejected",event=>{
   updateControls();
   const reason=event.data?.reason;
   const target=event.data?.targetPage;
   if(reason)setStatus("تعذر تنفيذ التقليب: "+reason+(Number.isInteger(target)?" (الصفحة "+(target+1)+")":""),true);
  });
  pageFlip.loadFromHTML(pageElements);
  updateControls();
 }catch(error){
  console.error("Dhker Mushaf PageFlip initialization failed:",error);
  pageFlip=null;pageElements=[];
  fallbackRender(currentPage);
  setStatus("تعذر تشغيل محرك تقليب الورق: "+(error?.message||"خطأ غير معروف"),true);
 }
}
function nextPage(){
 if(fallbackMode){fallbackGo(currentPage+1);return;}
 if(pageFlip)pageFlip.flipNext();
}
function previousPage(){
 if(fallbackMode){fallbackGo(currentPage-1);return;}
 if(pageFlip)pageFlip.flipPrev();
}
function goToPage(value){
 const target=clampPage(value);
 $("pageNumber").value=String(target);
 if(fallbackMode){fallbackGo(target);return;}
 if(!pageFlip)return;
 try{pageFlip.flipToPage(target-1);}
 catch(error){setStatus("رقم الصفحة غير متاح حالياً.",true);}
}
$("previous").addEventListener("click",previousPage);
$("next").addEventListener("click",nextPage);
$("goPage").addEventListener("click",()=>goToPage($("pageNumber").value));
$("pageNumber").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();goToPage($("pageNumber").value);}});
$("bookmark").addEventListener("click",()=>{localStorage.setItem(bookmarkKey,String(currentPage));setStatus("تم حفظ موضع القراءة عند الصفحة "+currentPage);});
document.addEventListener("keydown",event=>{
 if(event.altKey||event.ctrlKey||event.metaKey)return;
 const target=event.target;
 if(target instanceof Element&&target.closest("input,button,a,select,textarea,[contenteditable=true]"))return;
 if(event.key==="ArrowLeft"){event.preventDefault();nextPage();}
 else if(event.key==="ArrowRight"){event.preventDefault();previousPage();}
});
// Mobile RTL gesture mapping: swipe right-to-left (negative X) = next page.
let pointerStart=null;
const fallback=$("mushafFallback");
fallback.style.touchAction="pan-y pinch-zoom";
fallback.addEventListener("pointerdown",event=>{
 if(event.pointerType==="mouse"&&event.button!==0)return;
 if(event.isPrimary===false)return;
 pointerStart={id:event.pointerId,x:event.clientX,y:event.clientY};
});
fallback.addEventListener("pointerup",event=>{
 if(!pointerStart||event.pointerId!==pointerStart.id)return;
 const dx=event.clientX-pointerStart.x;
 const dy=event.clientY-pointerStart.y;
 pointerStart=null;
 // Ignore taps and vertical scrolling; respond only to a deliberate horizontal swipe.
 if(Math.abs(dx)<36||Math.abs(dx)<Math.abs(dy)*1.25)return;
 event.preventDefault();
 if(dx<0)nextPage();       // finger travels left: advance in the Arabic reading flow
 else previousPage();      // finger travels right: return to the previous page
});
fallback.addEventListener("pointercancel",()=>{pointerStart=null;});
window.addEventListener("online",()=>{if(fallbackMode)fallbackRender(currentPage);else preloadAround(currentPage,mobileMode?3:10);});
startFlipbook();
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();