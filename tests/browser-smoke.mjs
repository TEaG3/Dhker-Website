import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  async function checkApp(viewport, mobile) {
    const context = await browser.newContext({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: mobile ? 2 : 1
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.tab-panel#home');
    if (mobile) {
      await page.waitForSelector(".mobile-app-nav");
      assert.equal(await page.locator(".mobile-app-nav").isVisible(), true);
    } else {
      assert.equal(await page.locator(".mobile-app-nav").isVisible(), false);
    }
    await page.locator('.mobile-app-nav a[href="#adhkar"], .nav-list a[href="#adhkar"]').first().click();
    await page.waitForFunction(() => document.body.classList.contains("dhker-service-view"));
    assert.equal(await page.locator("#adhkar").isVisible(), true);
    assert.equal(await page.locator("#home").isVisible(), false);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    assert.equal(overflow, false, `horizontal overflow at ${viewport.width}px`);
    if (mobile) {
      assert.equal(await page.locator("#dhker-identity-bar").isVisible(), false);
      assert.equal(await page.locator(".ayah-ribbon").isVisible(), false);
    }
    await context.close();
  }

  await checkApp({ width: 390, height: 844 }, true);
  await checkApp({ width: 1440, height: 900 }, false);

  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({
      viewport,
      isMobile: viewport.width < 600,
      hasTouch: viewport.width < 600
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:4173/quran-reader.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const status = document.querySelector("#readerStatus")?.textContent || "";
      return status.includes("المصحف جاهز") || status.includes("تعذر تشغيل محرك تقليب الورق");
    }, { timeout: 45000 });
    const status = await page.locator("#readerStatus").innerText();
    assert.match(status, /المصحف جاهز/, `flipbook engine failed at ${viewport.width}px: ${status}`);
    await page.waitForFunction(() => {
      const img = document.querySelector('#mushafBook img[data-page="1"]');
      return img && img.complete && img.naturalWidth > 0;
    }, { timeout: 30000 });
    await page.locator("#next").click();
    await page.waitForFunction(() => document.querySelector("#pageNumber")?.value === "2", { timeout: 10000 });
    assert.equal(await page.locator("#pageNumber").inputValue(), "2");
    await page.locator("#previous").click();
    await page.waitForFunction(() => document.querySelector("#pageNumber")?.value === "1", { timeout: 10000 });
    assert.equal(await page.locator("#pageNumber").inputValue(), "1");
    await context.close();
  }

  assert.deepEqual(errors, [], "browser console page errors");
  console.log("Browser E2E passed: mobile + desktop navigation, no horizontal overflow, Mushaf engine loads and next/previous work.");
} finally {
  await browser.close();
}
