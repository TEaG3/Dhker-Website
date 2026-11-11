/* ==========================================================================
   محرك الهوية المعمارية الآمن للموقع (islamic-identity.js v4)
   لا يمسح ولا يستبدل أي دالة برمجية أو حدث (Event Listener) في الموقع الأصلي
   ========================================================================== */
(function () {
  const root = document.documentElement;
  const savedStyle = localStorage.getItem('dhker_style') || 'mihrab';
  const savedTheme = localStorage.getItem('dhker_theme') || 'dark';

  root.setAttribute('data-dhker-style', savedStyle);
  root.setAttribute('data-dhker-theme', savedTheme);

  // 1. وجه القنديل الإسلامي المفرغ (يتقاطع في 4 زوايا 3D)
  function getLanternFacetSVG() {
    return `
      <svg viewBox="0 0 80 260" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dhkGold3D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFF4C8"/>
            <stop offset="50%" stop-color="#D4AF37"/>
            <stop offset="100%" stop-color="#7A580B"/>
          </linearGradient>
        </defs>
        <line x1="40" y1="0" x2="40" y2="82" stroke="url(#dhkGold3D)" stroke-width="3" stroke-dasharray="6 4"/>
        <circle cx="40" cy="48" r="5" fill="url(#dhkGold3D)"/>
        <path d="M22 98 C22 76, 58 76, 58 98 Z" fill="url(#dhkGold3D)"/>
        <path d="M16 98 H64 L60 110 H20 Z" fill="#0B2822" stroke="url(#dhkGold3D)" stroke-width="2"/>
        <path d="M20 110 L10 150 L22 192 H58 L70 150 L60 110 Z" 
              fill="rgba(63, 224, 181, 0.16)" stroke="url(#dhkGold3D)" stroke-width="3" stroke-linejoin="round"/>
        <path d="M40 116 C52 128, 56 142, 56 162 V186 H24 V162 C24 142, 28 128, 40 116 Z" 
              stroke="url(#dhkGold3D)" stroke-width="1.5" fill="rgba(255, 243, 196, 0.1)"/>
        <path d="M25 192 L32 208 H48 L55 192 Z" fill="url(#dhkGold3D)"/>
        <polygon points="40,208 47,224 40,242 33,224" fill="#3FE0B5" stroke="url(#dhkGold3D)" stroke-width="2"/>
      </svg>
    `;
  }

  function create3DLanternUnit(posClass) {
    const facet = getLanternFacetSVG();
    return `
      <div class="dhk-3d-pendulum ${posClass}">
        <div class="dhk-lantern-rotor">
          <div class="dhk-lantern-plane p1">${facet}</div>
          <div class="dhk-lantern-plane p2">${facet}</div>
          <div class="dhk-lantern-plane p3">${facet}</div>
          <div class="dhk-lantern-plane p4">${facet}</div>
          <div class="dhk-lantern-ring ring-top"></div>
          <div class="dhk-lantern-ring ring-mid"></div>
          <div class="dhk-lantern-ring ring-bot"></div>
          <div class="dhk-lantern-core-light"></div>
        </div>
      </div>
    `;
  }

  // 2. قوس المقرنصات والتوريق العربي (Muqarnas Arch SVG)
  function createMuqarnasArchSVG() {
    return `
      <svg class="dhk-muqarnas-svg-frame" viewBox="0 0 420 520" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="408" height="508" rx="18" stroke="#D4AF37" stroke-width="2.5" opacity="0.85"/>
        <path d="M18 502 V210 C18 165, 38 130, 68 100 C88 78, 118 52, 155 34 C178 22, 198 14, 210 10 C222 14, 242 22, 265 34 C302 52, 332 78, 352 100 C382 130, 402 165, 402 210 V502 Z" 
              stroke="#D4AF37" stroke-width="3" fill="none"/>
        <path d="M30 490 V215 C30 120, 120 48, 210 22 C300 48, 390 120, 390 215 V490 Z" 
              stroke="#3FE0B5" stroke-width="1.4" stroke-dasharray="8 5" opacity="0.7"/>
      </svg>
    `;
  }

  // 3. زوايا تذهيب المصاحف (Corner Rosettes)
  function createCornerRosetteSVG() {
    return `
      <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 46 V14 C2 7.37 7.37 2 14 2 H46" stroke="#D4AF37" stroke-width="3"/>
        <path d="M8 38 V16 C8 11.58 11.58 8 16 8 H38" stroke="#FFF3C4" stroke-width="1.3"/>
        <path d="M16 8 L22 16 L16 24 L10 16 Z" fill="#D4AF37"/>
        <circle cx="16" cy="16" r="3" fill="#3FE0B5"/>
      </svg>
    `;
  }

  // 4. الشمسة الإسلامية ذات الـ 16 رأساً
  function create16PointShamsaSVG() {
    let squares = '';
    for (let i = 0; i < 4; i++) {
      squares += `<rect x="-95" y="-95" width="190" height="190" rx="8" transform="rotate(${i * 22.5})" />`;
    }
    return `
      <svg viewBox="0 0 320 320" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(160,160)" stroke="#D4AF37" stroke-width="1.5">
          ${squares}
          <circle r="138" stroke-dasharray="6 4" stroke-width="2"/>
          <circle r="108"/>
          <circle r="68" stroke="#3FE0B5" stroke-width="1.8"/>
        </g>
      </svg>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    // أ) إضافة القناديل ثلاثية الأبعاد أعلى الشاشة دون اعتراض أي نقرات
    if (!document.querySelector('.dhk-3d-lantern-stage')) {
      const stage = document.createElement('div');
      stage.className = 'dhk-3d-lantern-stage';
      stage.setAttribute('aria-hidden', 'true');
      stage.innerHTML = create3DLanternUnit('pos-right') + create3DLanternUnit('pos-left');
      document.body.appendChild(stage);
    }

    // ب) إضافة الشمسة الإسلامية الدوارة خلف القسم الترحيبي
    const heroSection = document.querySelector('main section:first-of-type, .hero');
    if (heroSection && !document.querySelector('.dhk-3d-shamsa-wrap')) {
      heroSection.style.position = 'relative';
      const shamsaWrap = document.createElement('div');
      shamsaWrap.className = 'dhk-3d-shamsa-wrap';
      shamsaWrap.setAttribute('aria-hidden', 'true');
      shamsaWrap.innerHTML = `
        <div class="dhk-shamsa-layer outer-ring">${create16PointShamsaSVG()}</div>
        <div class="dhk-shamsa-layer inner-ring">${create16PointShamsaSVG()}</div>
      `;
      heroSection.prepend(shamsaWrap);
    }

    // ج) تجميل بطاقة الآية القرآنية بإطار المحراب المنقوش وتفاعل الماوس 3D
    const rosetteHTML = createCornerRosetteSVG();
    document.querySelectorAll('div, aside').forEach(el => {
      if (el.textContent.includes('تَطْمَئِنُّ الْقُلُوبُ') || el.textContent.includes('تَنفَعُ الْمُؤْمِنِينَ')) {
        if (el.children.length <= 8 && el.offsetWidth > 200 && el.offsetWidth < 720) {
          el.classList.add('dhk-3d-mihrab-card');
          if (!el.querySelector('.dhk-muqarnas-svg-frame')) {
            el.insertAdjacentHTML('afterbegin', createMuqarnasArchSVG());
            ['c-tl', 'c-tr', 'c-bl', 'c-br'].forEach(pos => {
              const corner = document.createElement('span');
              corner.className = `dhk-rosette-corner ${pos}`;
              corner.innerHTML = rosetteHTML;
              el.appendChild(corner);
            });
          }

          el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const rotY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 8;
            const rotX = -((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 8;
            el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
          });

          el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
          });
        }
      }
    });

    // د) تجميل البطاقات في الموقع بإطار وزوايا المخطوطات الذهبية
    document.querySelectorAll('article, .card, .feature-card').forEach(card => {
      if (!card.classList.contains('dhk-3d-mihrab-card')) {
        card.classList.add('dhk-illuminated-card');
      }
    });

    // هـ) تفعيل مظهر المصحف الورقي الأبيض المصفرّ وتقليب الصفحة 3D على حاوية القرآن الموجودة في موقعك
    const quranSection = document.querySelector('#quran, [id*="quran"], [class*="quran-reader"], [class*="mushaf"]');
    if (quranSection) {
      const readerBox = quranSection.querySelector('.card, [class*="page"], [class*="container"] > div:last-child') || quranSection;
      readerBox.classList.add('dhk-parchment-quran-surface');
    }

    // الاستماع لأزرار الطرز والوضع الليلي/النهاري وأزرار تقليب صفحات القرآن دون تعطيل دوالها الأصلية
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, a');
      if (!btn) return;
      const txt = btn.textContent.trim();

      // تبديل الطرز الثلاثة
      if (txt.includes('محراب الزمرد')) {
        root.setAttribute('data-dhker-style', 'mihrab');
        localStorage.setItem('dhker_style', 'mihrab');
      } else if (txt.includes('قصر الحمراء')) {
        root.setAttribute('data-dhker-style', 'andalus');
        localStorage.setItem('dhker_style', 'andalus');
      } else if (txt.includes('القباب الكوفية')) {
        root.setAttribute('data-dhker-style', 'kufic');
        localStorage.setItem('dhker_style', 'kufic');
      } else if (txt.includes('الوضع النهاري') || txt.includes('الوضع الليلي')) {
        const next = root.getAttribute('data-dhker-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-dhker-theme', next);
        localStorage.setItem('dhker_theme', next);
      }

      // تشغيل حركة تقليب صفحة المصحف 3D عند الضغط على التالي/السابق في قسم القرآن
      if (txt.includes('التالية') || txt.includes('التالي') || btn.classList.contains('nav-next')) {
        const surface = document.querySelector('.dhk-parchment-quran-surface');
        if (surface) {
          surface.classList.remove('dhk-page-flip-next', 'dhk-page-flip-prev');
          void surface.offsetWidth;
          surface.classList.add('dhk-page-flip-next');
        }
      } else if (txt.includes('السابقة') || txt.includes('السابق') || btn.classList.contains('nav-prev')) {
        const surface = document.querySelector('.dhk-parchment-quran-surface');
        if (surface) {
          surface.classList.remove('dhk-page-flip-next', 'dhk-page-flip-prev');
          void surface.offsetWidth;
          surface.classList.add('dhk-page-flip-prev');
        }
      }
    });
  });
})();
