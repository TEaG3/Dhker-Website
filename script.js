document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const navList = document.getElementById("navList");

  if (menuToggle && navList) {
    // فتح وإغلاق القائمة في الجوال
    menuToggle.addEventListener("click", () => {
      navList.classList.toggle("active");
    });

    // إغلاق القائمة تلقائياً عند النقر على أي رابط
    navList.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navList.classList.remove("active");
      });
    });
  }
});
