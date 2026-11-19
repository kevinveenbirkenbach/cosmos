const { test, expect, devices } = require("@playwright/test");
const { resolveTimeout } = require("./timeouts");

const {
  expectHstsWhenTls,
  ownResponseHeaders,
  gotoOnion,
  normalizeBaseUrl,
  requireDotenvValue,
  runAdminFlow,
  runBiberFlow,
  runGuestFlow,
} = require("./personas");
test.use({ ignoreHTTPSErrors: true });

const appBaseUrl = normalizeBaseUrl(process.env.APP_BASE_URL || "");
const canonicalDomain = requireDotenvValue(process.env.CANONICAL_DOMAIN, "CANONICAL_DOMAIN");
const libraryPath = requireDotenvValue(process.env.COSMOS_LIBRARY_PATH, "COSMOS_LIBRARY_PATH");
const BERLIN = { latitude: "52.5", longitude: "13.4" };
const MOMENTS = { noon: "2026-06-21T11:10:00Z", dusk: "2026-06-21T19:40:00Z", night: "2026-12-21T21:00:00Z" };

const sky = (page) => page.locator("cosmos-sky");
const panelOpen = (page) => page.evaluate(() => document.querySelector("cosmos-sky").settings.open);
const pin = (page, attributes) =>
  page.evaluate((values) => {
    const element = document.querySelector("cosmos-sky");
    for (const [name, value] of Object.entries(values)) {
      element.setAttribute(name, value);
    }
  }, attributes);
const watchProblems = (page) => {
  const problems = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      problems.push(`console: ${message.text()}`);
    }
  });
  return problems;
};

test.beforeEach(async ({ page }) => {
  expect(appBaseUrl, "APP_BASE_URL must be set").toBeTruthy();
  expect(canonicalDomain, "CANONICAL_DOMAIN must be set").toBeTruthy();
  await page.context().clearCookies();
});

test("Cosmos front page is served under canonical domain with TLS", async ({ page }) => {
  const response = await gotoOnion(page, `${appBaseUrl}/`);
  expect(response, "Expected Cosmos response").toBeTruthy();
  expect(response.status(), "Expected Cosmos front page status < 400").toBeLessThan(400);
  expect(response.url().includes(canonicalDomain), `Expected canonical domain "${canonicalDomain}" to back the Cosmos URL`).toBe(true);
  expectHstsWhenTls(await ownResponseHeaders(response), appBaseUrl, "Cosmos");
});

test("the library is served same-origin under the CDN path as JavaScript", async ({ request }) => {
  const response = await request.get(`${appBaseUrl}${libraryPath}`, { timeout: resolveTimeout(30_000) });
  expect(response.status(), "Expected the cosmos library to answer 200").toBe(200);
  expect(response.headers()["content-type"] || "", "Expected a JavaScript MIME type").toMatch(/javascript/);
});

test("other sites load the public library from /js/cosmos.js as a module", async ({ page, request }) => {
  const url = `${appBaseUrl}/js/cosmos.js`;
  const response = await request.get(url, { headers: { Origin: "https://example.org" }, timeout: resolveTimeout(30_000) });
  expect(response.status(), "Expected the public library to answer 200").toBe(200);
  expect(response.headers()["access-control-allow-origin"], "Expected the library to allow every origin").toBe("*");
  await page.setContent(`<script type="module" src="${url}"></script>`);
  await expect.poll(() => page.evaluate(() => Boolean(customElements.get("cosmos-sky"))), { timeout: resolveTimeout(30_000) }).toBe(true);
});

test("the sky sets only cosmos properties and attributes on the root, without errors or CSP violations", async ({ page }) => {
  const problems = watchProblems(page);
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => window.__cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`));
  });
  await gotoOnion(page, `${appBaseUrl}/`);
  await expect(sky(page)).toHaveAttribute("data-mode", "full");
  const root = await page.evaluate(() => ({
    style: document.documentElement.getAttribute("style"),
    icons: document.querySelector("cosmos-sky").shadowRoot.querySelectorAll("svg").length,
    props: document.adoptedStyleSheets
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .filter((rule) => rule.selectorText === ":root")
      .flatMap((rule) => Array.from(rule.style))
      .sort(),
    marks: document.documentElement.getAttributeNames().filter((name) => name.startsWith("data-")).sort(),
    violations: window.__cspViolations,
    paints: document.querySelector("cosmos-sky").paints,
  }));
  expect(root.style, "cosmos leaves no style attribute on html").toBeNull();
  expect(root.icons, "the settings panel is built on first open only").toBe(0);
  expect(root.props).toEqual(["--cosmos-scheme", "--cosmos-sky-bottom", "--cosmos-sky-top", "--cosmos-stage", "--cosmos-sun-altitude", "--cosmos-text"]);
  expect(root.marks).toEqual(["data-cosmos-legible", "data-cosmos-mode", "data-cosmos-scheme", "data-cosmos-stage"]);
  expect(root.violations).toEqual([]);
  expect(root.paints).toBeGreaterThan(0);
  await page.waitForTimeout(resolveTimeout(3000));
  const later = await page.evaluate(() => document.querySelector("cosmos-sky").paints);
  expect(later - root.paints, "no repaint loop while nothing moves; one minute tick may fall into the wait").toBeLessThanOrEqual(1);
  expect(problems).toEqual([]);
});

test("a background on body keeps the stars hidden until the page clears it", async ({ page }) => {
  await gotoOnion(page, `${appBaseUrl}/`);
  await expect(sky(page)).toHaveAttribute("data-mode", "full");
  await expect(sky(page)).not.toHaveAttribute("data-covered", "");
  await page.evaluate(() => {
    document.body.style.background = "rgb(20, 30, 40)";
    window.cosmos.refresh();
  });
  await expect(sky(page)).toHaveAttribute("data-covered", "");
  const covered = await page.evaluate(() => {
    const element = document.querySelector("cosmos-sky");
    return { paints: element.paints, canvas: getComputedStyle(element.shadowRoot.querySelector("canvas")).display };
  });
  expect(covered.canvas, "a covered sky shows no canvas").toBe("none");
  await page.evaluate(() => {
    document.body.style.background = "";
    window.cosmos.refresh();
  });
  await expect(sky(page)).not.toHaveAttribute("data-covered", "");
  expect(await page.evaluate(() => document.querySelector("cosmos-sky").paints), "a cleared page gets the stars back").toBeGreaterThan(covered.paints);
});

test("Alt+Shift+C toggles the panel, Esc closes it, and text fields keep the keys", async ({ page }) => {
  await gotoOnion(page, `${appBaseUrl}/`);
  await page.keyboard.press("Alt+Shift+KeyC");
  expect(await panelOpen(page)).toBe(true);
  await page.keyboard.press("Escape");
  expect(await panelOpen(page)).toBe(false);
  await page.evaluate(() => {
    const field = document.createElement("input");
    field.id = "probe-field";
    document.body.append(field);
  });
  await page.locator("#probe-field").focus();
  await page.keyboard.press("Alt+Shift+KeyC");
  expect(await panelOpen(page)).toBe(false);
});

test("menu hooks open the panel and fire the cosmos events", async ({ page }) => {
  await page.addInitScript(() => {
    window.__cosmosEvents = [];
    for (const name of ["cosmos:open", "cosmos:close", "cosmos:change"]) {
      document.addEventListener(name, () => window.__cosmosEvents.push(name));
    }
  });
  await gotoOnion(page, `${appBaseUrl}/#cosmos`);
  expect(await panelOpen(page), "#cosmos opens the panel").toBe(true);
  await page.evaluate(() => window.cosmos.close());
  await page.locator("[data-cosmos-open]").click();
  expect(await panelOpen(page), "data-cosmos-open opens the panel").toBe(true);
  await page.evaluate(() => window.cosmos.toggle());
  await page.locator("main cosmos-globe").click();
  expect(await panelOpen(page), "the globe opens the panel").toBe(true);
  await page.evaluate(() => (window.cosmos.settings = { mode: "colors" }));
  await expect(sky(page)).toHaveAttribute("data-mode", "colors");
  const events = await page.evaluate(() => window.__cosmosEvents);
  expect(events).toEqual(expect.arrayContaining(["cosmos:open", "cosmos:close", "cosmos:change"]));
  const cookie = (await page.context().cookies()).find((entry) => entry.name === "cosmos");
  expect(cookie && cookie.value).toBe("mode=colors");
  expect(cookie.value).not.toMatch(/latitude|longitude|\d+\.\d+/);
});

test("switching the cosmos off sticks across reloads", async ({ page }) => {
  await gotoOnion(page, `${appBaseUrl}/`);
  await page.evaluate(() => (window.cosmos.settings = { mode: "off" }));
  await page.reload();
  await expect(sky(page)).toHaveAttribute("data-mode", "off");
  const declared = await page.evaluate(() =>
    document.adoptedStyleSheets.some((sheet) => Array.from(sheet.cssRules).some((rule) => rule.cssText.includes("--cosmos-")))
  );
  expect(declared, "an off cosmos declares no --cosmos-* property").toBe(false);
});

test("the place comes from the timezone without any geolocation call", async ({ page }) => {
  await page.addInitScript(() => {
    window.__geolocationCalls = 0;
    const real = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (...args) => {
      window.__geolocationCalls += 1;
      return real(...args);
    };
  });
  await gotoOnion(page, `${appBaseUrl}/`);
  await page.waitForTimeout(resolveTimeout(1000));
  expect(await page.evaluate(() => window.__geolocationCalls)).toBe(0);
  expect(await page.evaluate(() => document.querySelector("cosmos-sky").settings.place)).toMatch(/timezone|default|none/);
});

test("a granted location is used silently and stays in the browser", async ({ browser }) => {
  test.skip(!appBaseUrl.startsWith("https://"), "browsers grant geolocation only to secure contexts; onion vhosts serve plain HTTP");
  const context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: ["geolocation"], geolocation: { latitude: 48.137, longitude: 11.576 } });
  const page = await context.newPage();
  await gotoOnion(page, `${appBaseUrl}/`);
  await expect.poll(() => page.evaluate(() => document.querySelector("cosmos-sky").settings.place)).toBe("gps");
  expect(await page.evaluate(() => localStorage.getItem("cosmos-place"))).toBe(JSON.stringify({ latitude: 48.14, longitude: 11.58 }));
  expect((await context.cookies()).map((entry) => entry.value).join(" ")).not.toMatch(/48\.1|11\.5/);
  await context.close();
});

test("inside a frame the sky runs colors only and draws no canvas", async ({ page }) => {
  await gotoOnion(page, `${appBaseUrl}/`);
  const mode = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const frame = document.createElement("iframe");
        frame.src = location.href.split("#")[0];
        frame.addEventListener("load", () => {
          const inner = frame.contentDocument.querySelector("cosmos-sky");
          const canvas = inner.shadowRoot.querySelector("canvas");
          resolve({ mode: inner.dataset.mode, canvas: frame.contentWindow.getComputedStyle(canvas).display, paints: inner.paints });
        });
        document.body.append(frame);
      })
  );
  expect(mode).toEqual({ mode: "colors", canvas: "none", paints: 0 });
});

test("screenshots at noon, dusk and night with the panel closed and open", async ({ page }, testInfo) => {
  await gotoOnion(page, `${appBaseUrl}/`);
  for (const [moment, time] of Object.entries(MOMENTS)) {
    await pin(page, { ...BERLIN, time });
    await page.evaluate(() => window.cosmos.close());
    await page.screenshot({ path: testInfo.outputPath(`cosmos-${moment}.png`) });
    await page.evaluate(() => window.cosmos.open());
    await page.screenshot({ path: testInfo.outputPath(`cosmos-${moment}-panel.png`) });
  }
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--cosmos-stage").trim())).toBe("night");
});

test("on a phone whose motion sensors are allowed the sky follows the device orientation", async ({ browser }, testInfo) => {
  test.skip(!appBaseUrl.startsWith("https://"), "browsers expose motion sensors only to secure contexts; onion vhosts serve plain HTTP");
  const context = await browser.newContext({ ...devices["Pixel 7"], ignoreHTTPSErrors: true, permissions: ["accelerometer", "gyroscope", "magnetometer"] });
  const page = await context.newPage();
  await gotoOnion(page, `${appBaseUrl}/`);
  await pin(page, { ...BERLIN, time: MOMENTS.night });
  await expect.poll(() => page.evaluate(() => document.querySelector("cosmos-sky").settings.orientation)).toBe("on");
  const before = await page.evaluate(() => document.querySelector("cosmos-sky").paints);
  await page.evaluate(() => {
    const type = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.dispatchEvent(new DeviceOrientationEvent(type, { alpha: 0, beta: 120, gamma: 0, absolute: true }));
  });
  await expect.poll(() => page.evaluate(() => document.querySelector("cosmos-sky").paints)).toBeGreaterThan(before);
  await page.screenshot({ path: testInfo.outputPath("cosmos-phone-north-up.png") });
  await context.close();
});

test("on a phone that gates motion behind a prompt the sky waits for a tap and asks nothing on load", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["Pixel 7"], ignoreHTTPSErrors: true });
  await context.addInitScript(() => {
    window.__motionAsks = 0;
    const ask = DeviceOrientationEvent.requestPermission;
    DeviceOrientationEvent.requestPermission = (...args) => {
      window.__motionAsks += 1;
      return ask.apply(DeviceOrientationEvent, args);
    };
  });
  const page = await context.newPage();
  await gotoOnion(page, `${appBaseUrl}/`);
  await expect(sky(page)).toHaveAttribute("data-mode", "full");
  await page.waitForTimeout(resolveTimeout(1000));
  expect(await page.evaluate(() => document.querySelector("cosmos-sky").settings.orientation)).toBe("off");
  expect(await page.evaluate(() => window.__motionAsks), "no motion prompt on load").toBe(0);
  await context.close();
});

test("guest: public-landing → auth chain → never authenticated", async ({ page }) => {
  await runGuestFlow(page);
});

test("biber: app → universal logout", async ({ page }) => {
  await runBiberFlow(page);
});

test("administrator: app → universal logout", async ({ page }) => {
  await runAdminFlow(page);
});
