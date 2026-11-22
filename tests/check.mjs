// Checks the course page before every deploy: page structure, script syntax, element references,
// quiz data and the option-pricing maths. Run with `npm test`. Exits non-zero on any failure.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log("ok    " + msg);
  else { console.error("FAIL  " + msg); failures++; }
};

// Page structure
check(/^<!doctype html>/i.test(html.trim()), "page starts with a doctype");
check(/<title>[^<]+<\/title>/.test(html), "page has a title");
check(/<meta name="viewport"[^>]*width=device-width/.test(html), "page has a responsive viewport tag");
check(/<html lang="en">/.test(html), "page declares its language");

// Every inline script compiles
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
check(scripts.length > 0, "page has an inline script");
scripts.forEach((code, i) => {
  try { new vm.Script(code, { filename: `inline-script-${i}.js` }); check(true, `inline script ${i} compiles`); }
  catch (e) { check(false, `inline script ${i} compiles: ${e.message}`); }
});
const js = scripts.join("\n");

// Every element the script looks up by a fixed id exists
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const refs = new Set([...js.matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g)].map(m => m[1]));
const missing = [...refs].filter(r => !ids.has(r));
check(missing.length === 0, "every element the script looks up exists" + (missing.length ? ` (missing: ${missing.join(", ")})` : ""));

// Every module route has a section, and every section is reachable
const routes = [...html.matchAll(/data-route="([a-z-]+)"/g)].map(m => m[1]);
const modules = [...js.matchAll(/^\s*\["([a-z-]+)", "[^"]+", "[^"]+", \d+\]/gm)].map(m => m[1]);
check(modules.length === 10, `10 course modules are listed (found ${modules.length})`);
modules.forEach(m => check(routes.includes(m), `module "${m}" has a section`));

// Quiz data: four questions per module, each answer points at a real option
const qStart = js.indexOf("const QUIZ"), qEnd = js.indexOf("function buildQuizzes");
check(qStart > 0 && qEnd > qStart, "quiz data found");
const qctx = vm.createContext({});
vm.runInContext(js.slice(qStart, qEnd) + "\n;globalThis.QZ = QUIZ;", qctx);
for (const m of modules) {
  const qs = qctx.QZ[m] || [];
  check(qs.length === 4, `module "${m}" has 4 quiz questions`);
  qs.forEach((q, i) => check(Array.isArray(q[1]) && q[1].length >= 2 && q[2] >= 0 && q[2] < q[1].length && typeof q[3] === "string",
    `module "${m}" question ${i + 1} has a valid answer and explanation`));
}

// Pricing maths
const mEnd = js.indexOf("/* ---------- storage");
check(mEnd > 0, "maths block found");
const ctx = vm.createContext({ Math });
vm.runInContext(js.slice(0, mEnd) + "\n;globalThis.api = { bs, ivAt, erf, R, Q };", ctx);
const { bs, ivAt, erf, R, Q } = ctx.api;
const S = 25800, K = 26000, T = 30 / 365, v = 0.14;
const c = bs(S, K, T, v, "C"), p = bs(S, K, T, v, "P");
check(Math.abs(c.price - p.price - (S * Math.exp(-Q * T) - K * Math.exp(-R * T))) < 1e-6, "put-call parity holds");
check(Math.abs(erf(1) - 0.8427007929) < 2e-7, "normal-distribution approximation is accurate");
check(c.delta > 0.4 && c.delta < 0.55 && p.delta < -0.4 && p.delta > -0.6, "near-the-money deltas are sensible");
check(c.theta < 0 && c.vega > 0 && c.gamma > 0, "a long call has negative theta and positive vega and gamma");
check(bs(S, K, 0, v, "C").price === 0 && bs(26500, K, 0, v, "C").price === 500, "at expiry an option is worth its intrinsic value");
check(Math.abs(ivAt(S * 0.95, S, v) - v - 0.0287) < 0.002, "NIFTY skew adds about 2.9 IV points to the 95% put");
check(Math.abs(ivAt(S * 1.05, S, v) - v + 0.0171) < 0.002, "and takes about 1.7 points off the 105% call");

if (failures) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nAll checks passed.");
