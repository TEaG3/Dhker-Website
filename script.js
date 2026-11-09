(function () {
  "use strict";

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("primary-nav");

  // قائمة الجوال
  if (toggle && nav) {
    const closeMenu = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "فتح القائمة");
    };

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });
  }

  // نموذج التواصل
  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");

  if (form && note) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        note.textContent = "يرجى تعبئة جميع الحقول.";
        note.style.color = "var(--color-gold)";
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.textContent = "يرجى إدخال بريد إلكتروني صحيح.";
        note.style.color = "var(--color-gold)";
        return;
      }

      note.textContent = "النموذج غير متصل بخادم بعد. راسلنا عبر مستودع GitHub مؤقتًا.";
      note.style.color = "var(--color-primary)";
      form.reset();
    });
  }
})();
