/* ==========================================================================
   Dhker — Islamic identity switcher and eight-point star / lantern emblem
   ========================================================================== */
(() => {
  'use strict';
  const root = document.documentElement;
  const styles = [
    { id: 'mihrab', label: '١. محراب الزمرد' },
    { id: 'andalus', label: '٢. قصر الحمراء' },
    { id: 'kufic', label: '٣. القباب الكوفية' }
  ];
  const validStyle = value => styles.some(item => item.id === value);
  const read = (key, fallback) => {
    try { return localStorage.getItem(key) || fallback; }
    catch (_) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, value); } catch (_) { /* Session still works. */ }
  };

  let currentStyle = read('dhker_style', read('dhker.identity.preferences.v1.style', 'mihrab'));
  let currentTheme = read('dhker_theme', read('dhker.identity.preferences.v1.theme', 'dark'));
  if (!validStyle(currentStyle)) currentStyle = 'mihrab';
  if (currentTheme !== 'light' && currentTheme !== 'dark') currentTheme = 'dark';

  function apply() {
    root.dataset.dhkerStyle = currentStyle;
    root.dataset.dhkerTheme = currentTheme;
    write('dhker_style', currentStyle);
    write('dhker_theme', currentTheme);
    write('dhker.identity.preferences.v1', JSON.stringify({ style: currentStyle, theme: currentTheme }));

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
  }

  function buildBar() {
    if (document.getElementById('dhker-identity-bar')) return;
    const bar = document.createElement('section');
    bar.id = 'dhker-identity-bar';
    bar.dir = 'rtl';
    bar.setAttribute('aria-label', 'تخصيص مظهر ذِكر');
    bar.innerHTML = '<div class="dhk-bar-inner">' +
      '<div class="dhk-style-group"><span class="dhk-label">✦ الهوية الإسلامية:</span>' +
      styles.map(style => '<button type="button" class="dhk-btn" data-dhker-style-choice="' +
        style.id + '" aria-pressed="false">' + style.label + '</button>').join('') +
      '</div><button type="button" class="dhk-theme-btn" id="dhkerThemeToggle" aria-pressed="false"></button>' +
      '</div>';
    document.body.prepend(bar);
    bar.addEventListener('click', event => {
      const styleButton = event.target.closest('[data-dhker-style-choice]');
      if (styleButton) currentStyle = styleButton.dataset.dhkerStyleChoice;
      if (event.target.closest('#dhkerThemeToggle')) currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      apply();
    });
  }

  function injectLanternLogo() {
    // Match the actual brand link in the current Dhker website.
    const brandLink = document.querySelector('header.site-header a.brand, header a.brand, header a[href="#home"]');
    if (!brandLink || brandLink.querySelector('.dhk-injected-logo')) return;
    const oldMark = brandLink.querySelector('.brand-mark');
    if (!oldMark) return;

    const emblem = document.createElement('span');
    emblem.className = 'brand-mark dhk-injected-logo';
    emblem.setAttribute('role', 'img');
    emblem.setAttribute('aria-label', 'شعار ذِكر: مشكاة ونجمة ثمانية');
    emblem.innerHTML = '<svg viewBox="0 0 512 512" width="42" height="42" aria-hidden="true" focusable="false">' +
      '<rect width="512" height="512" rx="115" fill="#081824" stroke="#C6A76A" stroke-width="16"/>' +
      '<g transform="translate(256 256)"><rect x="-145" y="-145" width="290" height="290" rx="22" fill="#0B2623" stroke="#C6A76A" stroke-width="14"/>' +
      '<rect x="-145" y="-145" width="290" height="290" rx="22" fill="#0E332D" stroke="#C6A76A" stroke-width="14" transform="rotate(45)"/></g>' +
      '<path d="M256 96 C318 148 356 206 356 278 L356 386 L156 386 L156 278 C156 206 194 148 256 96Z" fill="#05111A" stroke="#C6A76A" stroke-width="14"/>' +
      '<path d="M256 104V184" stroke="#C6A76A" stroke-width="12"/>' +
      '<path d="M222 192L206 248C202 272 220 300 256 308C292 300 310 272 306 248L290 192Z" fill="#42C6A5" stroke="#C6A76A" stroke-width="10"/>' +
      '<path d="M256 212L265 240L293 249L265 258L256 286L247 258L219 249L247 240Z" fill="#FFFFFF"/>' +
      '</svg>';
    oldMark.replaceWith(emblem);
  }

  function initialize() {
    buildBar();
    injectLanternLogo();
    apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();