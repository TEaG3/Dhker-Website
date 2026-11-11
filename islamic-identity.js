/* Dhker — Islamic architecture ornaments + identity controls (v2)
   Idempotent, layout-preserving enhancement. Existing page content remains untouched. */
(() => {
  'use strict';
  const root = document.documentElement;
  const styles = [
    { id: 'mihrab', label: 'محراب الزمرد' },
    { id: 'andalus', label: 'قصر الحمراء' },
    { id: 'kufic', label: 'القباب الكوفية' }
  ];
  const storageKey = 'dhker.identity.preferences.v1';
  const validStyle = value => styles.some(item => item.id === value);
  const safeGet = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };

  let saved = {};
  try { saved = JSON.parse(safeGet(storageKey) || '{}') || {}; } catch (_) {}
  let currentStyle = validStyle(saved.style) ? saved.style :
    (validStyle(safeGet('dhker_style')) ? safeGet('dhker_style') : 'mihrab');
  let currentTheme = (saved.theme === 'light' || saved.theme === 'dark') ? saved.theme :
    (safeGet('dhker_theme') === 'light' ? 'light' : 'dark');

  function persist() {
    const value = JSON.stringify({ style: currentStyle, theme: currentTheme });
    safeSet(storageKey, value);
    // Keep legacy preference keys in sync for compatibility with older builds.
    safeSet('dhker_style', currentStyle);
    safeSet('dhker_theme', currentTheme);
  }

  function apply() {
    root.dataset.dhkerStyle = currentStyle;
    root.dataset.dhkerTheme = currentTheme;
    document.querySelectorAll('[data-dhker-style-choice]').forEach(button => {
      const active = button.dataset.dhkerStyleChoice === currentStyle;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const themeButton = document.getElementById('dhkerThemeToggle');
    if (themeButton) {
      themeButton.textContent = currentTheme === 'dark' ? '☀️ الوضع النهاري' : '🌙 الوضع الليلي';
      themeButton.setAttribute('aria-pressed', String(currentTheme === 'light'));
    }
    persist();
  }

  function buildBar() {
    if (document.getElementById('dhker-identity-bar')) return;
    const bar = document.createElement('section');
    bar.id = 'dhker-identity-bar';
    bar.setAttribute('aria-label', 'تخصيص مظهر ذِكر');
    bar.innerHTML = '<div class="dhk-bar-inner">' +
      '<div class="dhk-style-group"><span class="dhk-label">اختر الطراز</span>' +
      styles.map(item => '<button type="button" class="dhk-btn" data-dhker-style-choice="' +
        item.id + '" aria-pressed="false">' + item.label + '</button>').join('') +
      '</div><button type="button" class="dhk-theme-btn" id="dhkerThemeToggle" aria-pressed="false">الوضع الليلي</button>' +
      '</div>';
    const header = document.querySelector('.site-header');
    if (header && header.parentNode) header.parentNode.insertBefore(bar, header);
    else document.body.prepend(bar);
    bar.addEventListener('click', event => {
      const styleButton = event.target.closest('[data-dhker-style-choice]');
      if (styleButton && validStyle(styleButton.dataset.dhkerStyleChoice)) {
        currentStyle = styleButton.dataset.dhkerStyleChoice;
        apply();
      } else if (event.target.closest('#dhkerThemeToggle')) {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        apply();
      }
    });
  }

  const lanternSVG = (suffix) => `
    <svg viewBox="0 0 80 220" role="img" aria-hidden="true" focusable="false">
      <defs><radialGradient id="dhkLanternGlow-${suffix}" cx="50%" cy="45%" r="58%">
        <stop offset="0%" stop-color="#FFFDF0"/><stop offset="48%" stop-color="var(--dhk-accent)"/>
        <stop offset="100%" stop-color="var(--dhk-bg-surface)"/>
      </radialGradient></defs>
      <path d="M40 0V75" stroke="var(--dhk-gold)" stroke-width="2" stroke-dasharray="4 3"/>
      <circle cx="40" cy="45" r="4" fill="var(--dhk-gold)"/>
      <path d="M22 92Q40 68 58 92Z" fill="var(--dhk-gold)"/>
      <rect x="16" y="92" width="48" height="6" rx="3" fill="var(--dhk-gold-light)"/>
      <path d="M20 98 12 142Q10 170 40 186Q70 170 68 142L60 98Z"
        fill="url(#dhkLanternGlow-${suffix})" stroke="var(--dhk-gold)" stroke-width="3"/>
      <path d="M40 99V184M16 128H64M14 154H66" stroke="var(--dhk-gold)" stroke-width="1.4" opacity=".75"/>
      <path d="m40 116 5 18 18 5-18 5-5 18-5-18-18-5 18-5Z" fill="#FFFDF0" opacity=".9"/>
      <path d="M28 186H52L46 198H34Z" fill="var(--dhk-gold)"/>
      <path d="m40 198 6 12-6 10-6-10Z" fill="var(--dhk-accent)" stroke="var(--dhk-gold)" stroke-width="1.5"/>
    </svg>`;

  function shamsaSVG() {
    return `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <g transform="translate(100 100)" fill="none" stroke="currentColor" stroke-width="1.15">
        <rect x="-64" y="-64" width="128" height="128"/>
        <rect x="-64" y="-64" width="128" height="128" transform="rotate(22.5)"/>
        <rect x="-64" y="-64" width="128" height="128" transform="rotate(45)"/>
        <rect x="-64" y="-64" width="128" height="128" transform="rotate(67.5)"/>
        <circle r="88" stroke-dasharray="3 5"/><circle r="52"/><circle r="24"/>
      </g></svg>`;
  }

  function archSVG() {
    return `<svg class="dhk-arch-svg-overlay" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M12 490V210C12 105 110 35 200 8 290 35 388 105 388 210V490Z"
        fill="none" stroke="var(--dhk-gold)" stroke-width="2" stroke-dasharray="6 5"/>
      <path d="M24 478V215C24 118 115 50 200 22 285 50 376 118 376 215V478Z"
        fill="none" stroke="var(--dhk-gold)" stroke-width="1.2" opacity=".6"/>
      <g fill="none" stroke="var(--dhk-gold)" stroke-width="1.4">
        <circle cx="52" cy="52" r="18"/><circle cx="348" cy="52" r="18"/>
        <path d="m52 36 5 12 11 4-11 5-5 11-5-11-11-5 11-4Z" fill="var(--dhk-gold)" opacity=".65"/>
        <path d="m348 36 5 12 11 4-11 5-5 11-5-11-11-5 11-4Z" fill="var(--dhk-gold)" opacity=".65"/>
      </g></svg>`;
  }

  const cornerSVG = `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path d="M2 30V8Q2 2 8 2H30M6 22V10Q6 6 10 6H22"
      fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="10" cy="10" r="2.2" fill="currentColor"/></svg>`;

  function injectOrnamentStyles() {
    if (document.getElementById('dhk-live-ornament-styles')) return;
    const style = document.createElement('style');
    style.id = 'dhk-live-ornament-styles';
    style.textContent = `
      .hero{position:relative;isolation:isolate}
      .dhk-lanterns-stage{position:absolute;inset:0 0 auto;height:205px;z-index:3;pointer-events:none;overflow:visible}
      .dhk-lantern{position:absolute;top:-4px;width:clamp(42px,5vw,66px);height:180px;filter:none;transform-origin:50% 0;animation:none}
      .dhk-lantern svg{display:block;width:100%;height:100%;overflow:visible}
      .dhk-lantern.l-right{right:5%}.dhk-lantern.l-left{left:5%;animation-delay:-2.2s}
      .dhk-lantern.l-center{left:50%;transform:translateX(-50%) scale(.78);animation-delay:-4s;opacity:.82}
      .dhk-shamsa-bg{position:absolute;width:min(44vw,360px);aspect-ratio:1;left:2%;top:8%;z-index:-1;pointer-events:none;color:var(--dhk-gold);opacity:.11;animation:none}
      .dhk-shamsa-bg svg{width:100%;height:100%;display:block}
      .verse-card{position:relative;isolation:isolate}
      .dhk-arch-svg-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:.34}
      .verse-card>*:not(.dhk-arch-svg-overlay){position:relative;z-index:1}
      .dhk-illuminated-card{position:relative}
      .dhk-corner-ornament{position:absolute;width:22px;height:22px;color:var(--dhk-gold);opacity:.72;pointer-events:none;z-index:2}
      .dhk-corner-ornament svg{display:block;width:100%;height:100%}
      .dhk-corner-ornament.tl{top:7px;left:7px}
      .dhk-corner-ornament.tr{top:7px;right:7px;transform:scaleX(-1)}
      .dhk-corner-ornament.bl{bottom:7px;left:7px;transform:scaleY(-1)}
      .dhk-corner-ornament.br{bottom:7px;right:7px;transform:scale(-1)}
      @keyframes dhkLanternSway{from{rotate:-2deg}to{rotate:2deg}}
      @keyframes dhkShamsaTurn{to{transform:rotate(360deg)}}
      @media(max-width:700px){.dhk-lanterns-stage{height:120px}.dhk-lantern{width:34px;height:112px}.dhk-lantern.l-center{display:none}.dhk-shamsa-bg{width:62vw;left:-8%;top:18%}.dhk-corner-ornament{width:16px;height:16px}}
      @media(prefers-reduced-motion:reduce){.dhk-lantern,.dhk-shamsa-bg{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function addCorner(card) {
    if (card.querySelector('.dhk-corner-ornament')) return;
    card.classList.add('dhk-illuminated-card');
    ['tl','tr','bl','br'].forEach(position => {
      const corner = document.createElement('span');
      corner.className = 'dhk-corner-ornament ' + position;
      corner.innerHTML = cornerSVG;
      card.appendChild(corner);
    });
  }

  function decorate() {
    injectOrnamentStyles();
    const hero = document.querySelector('.hero');
    if (hero && !hero.querySelector('.dhk-lanterns-stage')) {
      const stage = document.createElement('div');
      stage.className = 'dhk-lanterns-stage';
      stage.setAttribute('aria-hidden','true');
      stage.innerHTML = '<div class="dhk-lantern l-right">' + lanternSVG('right') + '</div>' +
        '<div class="dhk-lantern l-left">' + lanternSVG('left') + '</div>' +
        '<div class="dhk-lantern l-center">' + lanternSVG('center') + '</div>';
      hero.appendChild(stage);
    }
    if (hero && !hero.querySelector('.dhk-shamsa-bg')) {
      const shamsa = document.createElement('div');
      shamsa.className = 'dhk-shamsa-bg';
      shamsa.setAttribute('aria-hidden','true');
      shamsa.innerHTML = shamsaSVG();
      hero.prepend(shamsa);
    }
    const verse = document.querySelector('.hero .verse-card');
    if (verse && !verse.querySelector('.dhk-arch-svg-overlay')) {
      verse.insertAdjacentHTML('afterbegin',archSVG());
    }
    // Decorate only known, intentional card components; avoid broad div scans.
    document.querySelectorAll('.service-card,.audio-card').forEach(addCorner);
  }

  function init() {
    buildBar();
    apply();
    decorate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',init,{once:true});
  } else {
    init();
  }
})();