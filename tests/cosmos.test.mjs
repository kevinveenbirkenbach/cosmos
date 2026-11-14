import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as cosmos from "../ansible/roles/web-app-cst-cosmos/files/javascript/cosmos.mjs";

const DAY = 86400000;
const SIDEREAL_RATE = 360.98564736629;
const BERLIN = [52.5, 13.4];
const source = readFileSync(new URL("../ansible/roles/web-app-cst-cosmos/files/javascript/cosmos.mjs", import.meta.url), "utf8");
const at = (text) => Date.parse(text);
const near = (actual, expected, delta, label) => assert.ok(Math.abs(actual - expected) <= delta, `${label}: ${actual} is not within ${delta} of ${expected}`);
const angle = (actual, expected, delta, label) => near((((actual - expected + 540) % 360) + 360) % 360 - 180, 0, delta, label);
const brightest = (ra, dec) => cosmos.DATA.stars.find(([sra, sdec]) => Math.abs(sra - ra) < 0.3 && Math.abs(sdec - dec) < 0.3);
const culmination = (ra, longitude, from) => {
  const start = at(from);
  return start + ((((ra - longitude - cosmos.sidereal(start)) % 360) + 360) % 360) / SIDEREAL_RATE * DAY;
};

test("the sun matches Meeus and NOAA references", () => {
  const sun = cosmos.sun(at("1992-10-13T00:00:00Z"), 0, 0);
  near(sun.ra, 198.38083, 0.01, "ra");
  near(sun.dec, -7.78507, 0.01, "dec");
  near(sun.eot, 13.71, 0.1, "equation of time");
  near(cosmos.sun(at("2024-06-20T20:51:00Z"), 0, 0).dec, 23.438, 0.01, "June solstice");
  near(cosmos.sun(at("2024-03-20T03:06:00Z"), 0, 0).dec, 0, 0.05, "March equinox");
  near(cosmos.sun(at("2024-06-21T03:43:00Z"), 51.5074, -0.1278).alt, -0.833, 0.3, "London sunrise");
  near(cosmos.sidereal(at("1987-04-10T00:00:00Z")), 197.693195, 0.001, "sidereal 0h");
  near(cosmos.sidereal(at("1987-04-10T19:21:00Z")), 128.7378734, 0.001, "sidereal 19:21");
});

test("the moon matches Meeus within the low-precision series", () => {
  const moon = cosmos.moon(at("1992-04-12T00:00:00Z"), 0, 0);
  near(moon.lambda, 133.162655, 0.5, "longitude");
  near(moon.beta, -3.229126, 0.3, "latitude");
  near(moon.ra, 134.68847, 0.5, "ra");
  near(moon.dec, 13.768368, 0.3, "dec");
  near(moon.lit, 0.6786, 0.01, "lit");
  assert.ok(moon.waxing);
  assert.ok(cosmos.moon(at("2024-04-23T23:49:00Z"), ...BERLIN).lit > 0.99, "full moon");
  assert.ok(cosmos.moon(at("2024-04-08T18:21:00Z"), ...BERLIN).lit < 0.01, "new moon");
});

test("stages follow the sun altitude", () => {
  assert.deepEqual([-30, -15, -9, -3, 3, 20].map(cosmos.stage), ["night", "astronomical", "nautical", "civil", "golden", "day"]);
});

test("the text keeps 4.5:1 against the upper sky at every minute of a day and against both stops outside sunrise and sunset", () => {
  for (const [latitude, longitude] of [[0, 0], BERLIN, [69.6, 18.9]]) {
    for (const day of ["2026-03-20", "2026-06-21", "2026-12-21"]) {
      for (let minute = 0; minute < 1440; minute += 1) {
        const look = cosmos.tones(at(`${day}T00:00:00Z`) + minute * 60000, latitude, longitude);
        const label = `${latitude}/${longitude} ${day} minute ${minute}`;
        const ratio = cosmos.contrast(look.text, look.top);
        assert.ok(ratio >= 4.5, `${label}: ${ratio.toFixed(2)}`);
        if (look.legible === "all") {
          assert.ok(cosmos.contrast(look.text, look.bottom) >= 4.5, `${label} bottom`);
        } else {
          assert.ok(look.altitude > -3 && look.altitude < 5, `${label}: top only at ${look.altitude.toFixed(2)}`);
        }
      }
    }
  }
  assert.equal(cosmos.tones(at("2026-06-21T11:00:00Z"), ...BERLIN).legible, "all");
  assert.equal(cosmos.tones(at("2026-06-21T23:00:00Z"), ...BERLIN).legible, "all");
  assert.equal(cosmos.tones(at("2026-06-21T11:00:00Z"), ...BERLIN).scheme, "light");
  assert.equal(cosmos.tones(at("2026-06-21T23:00:00Z"), ...BERLIN).scheme, "dark");
});

test("catalogue stars sit at their published places and culminate where geometry puts them over Berlin", () => {
  assert.ok(cosmos.DATA.stars.filter(([, , mag]) => mag <= 4.5).length >= 500, "at least 500 stars to magnitude 4.5");
  const vega = brightest(279.2347, 38.7837);
  const betelgeuse = brightest(88.7929, 7.4069);
  assert.ok(vega && betelgeuse, "Vega and Betelgeuse are in the catalogue");
  near(vega[0], 279.2347, 0.05, "Vega ra");
  near(vega[1], 38.7837, 0.05, "Vega dec");
  near(betelgeuse[0], 88.7929, 0.05, "Betelgeuse ra");
  near(betelgeuse[1], 7.4069, 0.05, "Betelgeuse dec");
  const upper = culmination(279.2347, BERLIN[1], "2026-01-15T00:00:00Z");
  const high = cosmos.star(vega, upper, ...BERLIN);
  near(high.alt, 90 - 52.5 + 38.7837, 1, "Vega upper culmination altitude");
  angle(high.az, 180, 1, "Vega upper culmination azimuth");
  const low = cosmos.star(vega, upper + DAY * 180 / SIDEREAL_RATE, ...BERLIN);
  near(low.alt, 38.7837 - (90 - 52.5), 1, "Vega lower culmination altitude");
  angle(low.az, 0, 1, "Vega lower culmination azimuth");
  const orion = cosmos.star(betelgeuse, culmination(88.7929, BERLIN[1], "2026-01-15T00:00:00Z"), ...BERLIN);
  near(orion.alt, 90 - 52.5 + 7.4069, 1, "Betelgeuse culmination altitude");
  angle(orion.az, 180, 1, "Betelgeuse culmination azimuth");
});

test("timezones resolve to their tzdata places and hidden ones to the deployment default", () => {
  const berlin = cosmos.zonePlace("Europe/Berlin");
  near(berlin.latitude, 52.5, 0.5, "Berlin latitude");
  near(berlin.longitude, 13.4, 0.5, "Berlin longitude");
  assert.equal(berlin.source, "timezone");
  assert.equal(cosmos.zonePlace("Asia/Calcutta").source, "timezone");
  assert.deepEqual(cosmos.zonePlace("UTC", {latitude: 48.1, longitude: 11.6}), {latitude: 48.1, longitude: 11.6, source: "default"});
  assert.deepEqual(cosmos.zonePlace("Etc/GMT", {latitude: "48.1", longitude: "11.6"}), {latitude: 48.1, longitude: 11.6, source: "default"});
  assert.deepEqual(cosmos.zonePlace("UTC"), {latitude: 0, longitude: 0, source: "none"});
  assert.equal(cosmos.zonePlace("constructor").source, "none");
});

test("the deployment default comes from explicit coordinates, else from the host timezone", () => {
  const berlin = cosmos.home({zone: "Europe/Berlin"});
  near(berlin.latitude, 52.5, 0.5, "host zone latitude");
  near(berlin.longitude, 13.4, 0.5, "host zone longitude");
  assert.deepEqual(cosmos.home({latitude: "48.1", longitude: 11.6, zone: "Europe/Berlin"}), {latitude: 48.1, longitude: 11.6});
  assert.equal(cosmos.home({zone: "UTC"}), null);
  assert.equal(cosmos.home({}), null);
});

test("only a fully transparent page surface lets the stars through", () => {
  ["transparent", "rgba(0, 0, 0, 0)", "rgba(12, 34, 56, 0)", "rgb(0 0 0 / 0)", "color(srgb 1 0 0 / 0)"].forEach((color) => assert.ok(cosmos.transparent(color), color));
  ["rgb(0, 0, 0)", "rgb(255, 255, 255)", "rgba(0, 0, 0, 0.5)", "rgb(0 0 0)", "rgb(0 0 0 / 0.5)", "color(srgb 1 0 0)"].forEach((color) => assert.ok(!cosmos.transparent(color), color));
});

test("phone poses map to the direction the back camera points at", () => {
  const cases = [
    [[0, 90, 0], 0, 0, "upright facing north"],
    [[90, 90, 0], 270, 0, "upright, turned left to the west"],
    [[180, 90, 0], 180, 0, "upright facing south"],
    [[0, 135, 0], 0, 45, "tilted up 45 degrees to the north"],
    [[0, 90, -90], 90, 0, "rolled into landscape"],
  ];
  for (const [[alpha, beta, gamma], azimuth, altitude, label] of cases) {
    const view = cosmos.pose(alpha, beta, gamma);
    angle(view.azimuth, azimuth, 0.01, `${label} azimuth`);
    near(view.altitude, altitude, 0.01, `${label} altitude`);
  }
  near(cosmos.pose(0, 0, 0).altitude, -90, 0.01, "flat on the table");
  angle(cosmos.pose(0, 90, 0, 90).azimuth, 90, 0.01, "iOS compass heading east");
});

test("the hotkey matches by physical key and ignores text fields", () => {
  const hotkey = cosmos.parseHotkey("alt+shift+c");
  const press = (extra) => ({code: "KeyC", key: "Ç", altKey: true, shiftKey: true, ctrlKey: false, metaKey: false, ...extra});
  assert.ok(cosmos.pressed(hotkey, press()));
  assert.ok(!cosmos.pressed(hotkey, press({shiftKey: false})));
  assert.ok(!cosmos.pressed(hotkey, press({ctrlKey: true})));
  assert.ok(!cosmos.pressed(hotkey, press({code: "KeyX"})));
  assert.ok(cosmos.pressed(cosmos.parseHotkey("ctrl+alt+k"), {code: "KeyK", altKey: true, ctrlKey: true, shiftKey: false, metaKey: false}));
  assert.deepEqual(cosmos.parseHotkey(""), hotkey);
  assert.deepEqual(cosmos.parseHotkey(null), hotkey);
  for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
    assert.ok(cosmos.typing({tagName}), tagName);
  }
  assert.ok(cosmos.typing({tagName: "DIV", isContentEditable: true}));
  assert.ok(!cosmos.typing({tagName: "BUTTON"}));
  assert.ok(!cosmos.typing(null));
});

test("the preference cookie holds mode and orientation and never a place", () => {
  const cookie = cosmos.prefsCookie({mode: "off", orientation: "on", latitude: 52.5, longitude: 13.4}, "example.org", true);
  assert.equal(cookie, "cosmos=mode=off&orientation=on; Path=/; Max-Age=31536000; SameSite=Lax; Domain=example.org; Secure");
  assert.equal(cosmos.prefsCookie({mode: "colors"}, "", false), "cosmos=mode=colors; Path=/; Max-Age=31536000; SameSite=Lax");
  assert.deepEqual(cosmos.readPrefs("a=1; cosmos=mode=off&orientation=on; b=2"), {mode: "off", orientation: "on"});
  assert.deepEqual(cosmos.readPrefs("cosmos=mode=evil&orientation=sideways&latitude=52.5"), {});
  assert.deepEqual(cosmos.readPrefs(""), {});
  assert.deepEqual(cosmos.readPrefs(undefined), {});
});

test("the globe shows the sun where the almanac puts it and land where Natural Earth has it", () => {
  const solstice = cosmos.subsolar(at("2024-06-20T20:51:00Z"));
  near(solstice.latitude, 23.44, 0.05, "solstice sub-solar latitude");
  near(solstice.longitude, -132.3, 1, "solstice sub-solar longitude");
  const april = cosmos.subsolar(at("2024-04-15T12:00:00Z"));
  near(april.longitude, 0, 1, "equation of time near zero");
  const november = cosmos.subsolar(at("2024-11-03T12:00:00Z"));
  near(november.longitude, -4.1, 1, "equation of time +16.4 min");
  near(november.latitude, -15, 1, "November declination");
  assert.ok(cosmos.landAt(...BERLIN), "Berlin");
  assert.ok(cosmos.landAt(-25, 135), "Australia");
  assert.ok(!cosmos.landAt(0, -30), "Atlantic");
  assert.ok(!cosmos.landAt(30, -150), "Pacific");
  assert.deepEqual(cosmos.globePoint(0, 0, {latitude: 20, longitude: 40}), {latitude: 20, longitude: 40});
  assert.equal(cosmos.globePoint(0.8, 0.8, {latitude: 20, longitude: 40}), null);
  assert.ok(cosmos.daylight({latitude: 23.44, longitude: -132.3}, solstice) > 0.999);
});

test("the view lens puts the view direction at its anchor", () => {
  const phone = cosmos.lens({azimuth: 90, altitude: 30, fov: 60, anchor: 0.5, square: true}, 400, 800);
  const center = cosmos.place(phone, 30, 90);
  near(center.x, 200, 1e-6, "x");
  near(center.y, 400, 1e-6, "y");
  const desk = cosmos.lens({azimuth: 180, altitude: 0, fov: 180, anchor: 0.86}, 1000, 1000);
  near(cosmos.place(desk, 0, 180).y, 860, 1e-6, "horizon line");
});

test("the library is one strict-CSP module without imports, audio, agent graph or foreign theme writes", () => {
  assert.doesNotMatch(source, /^\s*import[\s{(]/m);
  assert.doesNotMatch(source, /AudioContext|<audio|new Audio\(|\.mp3|\.ogg/);
  assert.doesNotMatch(source, /ForceGraph|3d-force-graph/);
  assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML|setAttribute\("style"|<style/);
  assert.doesNotMatch(source, /--design-|data-design-theme|colorScheme|color-scheme/);
  assert.doesNotMatch(source, /(documentElement|root)\.style\b/);
});
