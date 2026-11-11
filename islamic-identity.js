/* Dhker identity controls — style and appearance persist on this browser. */
(() => {
  'use strict';
  const root = document.documentElement;
  const styles = [
    { id: 'mihrab', label: 'محراب الزمرد' },
    { id: 'andalus', label: 'قصر الحمراء' },
    { id: 'kufic', label: 'القباب الكوفية' }
  ];
  const storageKey = 'dhker.identity.preferences.v1';
  const safeRead = () => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
    catch (_) { return {}; }
  };
  const saved = safeRead();
  let currentStyle = styles.some(x => x.id === saved.style) ? saved.style : 'mihrab';
  let currentTheme = saved.theme === 'light' ? 'light' : 'dark';

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ style: currentStyle, theme: currentTheme })); }
    catch (_) { /* Private browsing or storage restrictions: keep the current session working. */ }
  }
  function apply() {
    root.dataset.dhkerStyle = currentStyle;
    root.dataset.dhkerTheme = currentTheme;
    const themeButton = document.getElementById('dhkerThemeToggle');
    if (themeButton) {
      themeButton.textContent = currentTheme === 'dark' ? '☀️ الوضع النهاري' : '🌙 الوضع الليلي';
      themeButton.setAttribute('aria-pressed', String(currentTheme === 'light'));
    }
    document.querySelectorAll('[data-dhker-style-choice]').forEach(button => {
      const active = button.dataset.dhkerStyleChoice === currentStyle;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    persist();
  }
  function buildBar() {
    if (document.getElementById('dhker-identity-bar')) return;
    const bar = document.createElement('section');
    bar.id = 'dhker-identity-bar';
    bar.setAttribute('aria-label', 'تخصيص مظهر ذِكر');
    bar.innerHTML = '<div class="dhk-bar-inner">' +
      '<div class="dhk-style-group"><span class="dhk-label">اختر الطراز</span>' +
      styles.map(style => '<button type="button" class="dhk-btn" data-dhker-style-choice="' +
        style.id + '" aria-pressed="false">' + style.label + '</button>').join('') +
      '</div><button type="button" class="dhk-theme-btn" id="dhkerThemeToggle" aria-pressed="false">الوضع الليلي</button>' +
      '</div>';
    const header = document.querySelector('.site-header');
    if (header) header.parentNode.insertBefore(bar, header);
    else document.body.prepend(bar);
    bar.addEventListener('click', event => {
      const styleButton = event.target.closest('[data-dhker-style-choice]');
      if (styleButton) {
        currentStyle = styleButton.dataset.dhkerStyleChoice;
        apply();
      }
      if (event.target.closest('#dhkerThemeToggle')) {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        apply();
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { buildBar(); apply(); }, { once: true });
  } else {
    buildBar(); apply();
  }
})();