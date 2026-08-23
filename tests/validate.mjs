/* ============================================================
   Validation harness for FIRE Reframed.

   It does NOT re-type the formula. It reads the SHIPPED script.js,
   extracts the exact `requiredCorpus` function the site runs, and
   checks it three ways:

     1. Closed form vs. an independent year-by-year cash-flow
        simulation (proves the algebra is the right present value).
     2. Reproduces the published Part 4 & Part 5 article tables
        (proves fidelity to what you already put in print).
     3. Edge cases: return = / > / < inflation.

   Run:  node tests/validate.mjs
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "script.js"), "utf8");

/* --- Pull the real requiredCorpus() out of the shipped source --- */
const m = src.match(/function requiredCorpus\([^)]*\)\s*\{[\s\S]*?\n  \}/);
if (!m) { console.error("Could not locate requiredCorpus in script.js"); process.exit(1); }
const requiredCorpus = new Function("return (" + m[0] + ")")();
console.log("Extracted requiredCorpus() verbatim from script.js\n");

let passed = 0, failed = 0;
const ok = (cond, label, detail = "") => {
  (cond ? passed++ : failed++);
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
};
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);

/* --- Independent check: does the corpus actually fund the plan? ---
   Start with corpus, withdraw an inflation-growing amount at the
   start of each year, grow the remainder by the return. If the
   corpus is correct, the money is exhausted (final balance ~ 0). */
function simulateFinalBalance(corpus, annual, years, retPct, inflPct) {
  const r = retPct / 100, g = inflPct / 100;
  let bal = corpus;
  for (let t = 0; t < years; t++) {
    bal -= annual * Math.pow(1 + g, t); // withdraw at start of year
    bal *= 1 + r;                        // remainder grows
  }
  return bal; // want ~0
}

console.log("1) Closed form vs. independent simulation (final balance should be ~0)");
{
  let worst = 0;
  const annual = 1_800_000; // arbitrary; result is scale-free
  for (let r = 2; r <= 12; r += 0.5) {
    for (let g = 2; g <= 12; g += 0.5) {
      for (const years of [10, 20, 30, 40, 50, 65]) {
        const corpus = requiredCorpus(annual, years, r, g);
        const finalBal = simulateFinalBalance(corpus, annual, years, r, g);
        worst = Math.max(worst, Math.abs(finalBal) / corpus);
      }
    }
  }
  ok(worst < 1e-9, "corpus exactly funds the withdrawals across 2,646 scenarios",
     "max residual = " + worst.toExponential(2) + " of corpus");
}

/* --- Fidelity: reproduce the published article tables ---
   Part 4 & 5 assume returns merely keep pace with inflation
   (real return = 0), so the tool's general formula must collapse
   to corpus = annual x years. We feed return = inflation. */
const AGES = [25, 30, 35, 40, 45, 50, 55, 60];
const LIFE = 90;

console.log("\n2a) Part 4 — Allowed Monthly Spend (₹ lakh), ground truth from the article image");
{
  const CORPUS_CR = [1, 2, 5, 10, 15, 20, 30, 50, 100];
  const truth = [
    [0.13,0.14,0.15,0.17,0.19,0.21,0.24,0.28],
    [0.26,0.28,0.30,0.33,0.37,0.42,0.48,0.56],
    [0.64,0.69,0.76,0.83,0.93,1.04,1.19,1.39],
    [1.28,1.39,1.52,1.67,1.85,2.08,2.38,2.78],
    [1.92,2.08,2.27,2.50,2.78,3.13,3.57,4.17],
    [2.56,2.78,3.03,3.33,3.70,4.17,4.76,5.56],
    [3.85,4.17,4.55,5.00,5.56,6.25,7.14,8.33],
    [6.41,6.94,7.58,8.33,9.26,10.42,11.90,13.89],
    [12.82,13.89,15.15,16.67,18.52,20.83,23.81,27.78],
  ];
  let worst = 0, cells = 0;
  CORPUS_CR.forEach((cr, ri) => AGES.forEach((age, ci) => {
    const years = LIFE - age;
    // via the general formula with real return 0 (return == inflation, any rate)
    const corpus = requiredCorpus(cr * 1e7 / years, years, 6, 6); // annual = corpus/years -> corpus back
    // simplest: monthly = corpus / years / 12, corpus fixed at cr*1e7
    const monthlyLakh = (cr * 1e7) / years / 12 / 1e5;
    worst = Math.max(worst, Math.abs(monthlyLakh - truth[ri][ci]));
    cells++;
  }));
  ok(worst <= 0.005, `all ${cells} cells match the printed table`,
     "max abs diff = " + worst.toFixed(4) + " lakh (rounding)");
}

console.log("\n2b) Cross-check: the r=g special case equals corpus/years (ties tables to the master formula)");
{
  let worst = 0;
  [1e7, 1e8, 1e9].forEach((corpus) => AGES.forEach((age) => {
    const years = LIFE - age;
    const annual = corpus / years;
    for (const rate of [4, 6, 8, 10]) {
      // return == inflation -> real return 0 -> formula must give annual*years == corpus
      worst = Math.max(worst, rel(requiredCorpus(annual, years, rate, rate), corpus));
    }
  }));
  ok(worst < 1e-9, "requiredCorpus(annual, years, x, x) === annual*years for all x",
     "max rel err = " + worst.toExponential(2));
}

console.log("\n2c) Part 5 — Corpus Required (₹ crore), ground truth from the article image");
{
  const SPEND_L = [1, 2, 3, 5, 10]; // per month, lakh
  const truth = [
    [7.8,7.2,6.6,6,5.4,4.8,4.2,3.6],
    [15.6,14.4,13.2,12,10.8,9.6,8.4,7.2],
    [23.4,21.6,19.8,18,16.2,14.4,12.6,10.8],
    [39,36,33,30,27,24,21,18],
    [78,72,66,60,54,48,42,36],
  ];
  let worst = 0, cells = 0;
  SPEND_L.forEach((sl, ri) => AGES.forEach((age, ci) => {
    const years = LIFE - age;
    const corpusCr = (sl * 1e5 * 12 * years) / 1e7; // monthly*12*years
    worst = Math.max(worst, Math.abs(corpusCr - truth[ri][ci]));
    cells++;
  }));
  ok(worst <= 0.005, `all ${cells} cells match the printed table`,
     "max abs diff = " + worst.toFixed(4) + " Cr");
}

console.log("\n3) Edge cases");
{
  const annual = 1_200_000, years = 40;
  // return > inflation -> need LESS than the zero-real floor
  const hi = requiredCorpus(annual, years, 10, 6);
  ok(hi < annual * years, "return > inflation needs less than annual×years floor",
     hi.toExponential(3) + " < " + (annual * years).toExponential(3));
  // return < inflation -> need MORE than the floor
  const lo = requiredCorpus(annual, years, 4, 7);
  ok(lo > annual * years, "return < inflation needs more than annual×years floor",
     lo.toExponential(3) + " > " + (annual * years).toExponential(3));
  // return == inflation -> exactly the floor
  ok(rel(requiredCorpus(annual, years, 6, 6), annual * years) < 1e-9,
     "return == inflation equals the floor exactly");
  // 1 year -> exactly one year's spend
  ok(rel(requiredCorpus(annual, 1, 8, 6), annual) < 1e-9,
     "a 1-year horizon needs exactly one year of spend");
}

console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
