/* ============================================================
   FIRE Reframed — interactive companion
   Vanilla JS, no dependencies. The math is deliberately honest:
   corpus = present value of inflation-growing withdrawals.
   When returns merely match inflation, it collapses to
   corpus = annual spend x years  (the "arithmetic of enough").
   ============================================================ */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const LIFE_TABLE = 90; // life expectancy assumed by the Part 4/5 tables

  let mode = "inr"; // 'inr' | 'usd'

  /* ---------- Core math ---------------------------------------------- */

  // Corpus needed today to fund `annualToday` spend for `years`,
  // with withdrawals growing at inflation g and the pot earning return r.
  // Withdrawals taken at the start of each year (slightly conservative).
  function requiredCorpus(annualToday, years, retPct, inflPct) {
    const r = retPct / 100;
    const g = inflPct / 100;
    const k = (1 + g) / (1 + r);
    if (Math.abs(k - 1) < 1e-9) return annualToday * years; // real return ~ 0
    return annualToday * (1 - Math.pow(k, years)) / (1 - k);
  }

  /* ---------- Money formatting -------------------------------------- */

  function trim(x) {
    if (x >= 100) return Math.round(x).toString();
    if (x >= 10) return x.toFixed(1);
    return x.toFixed(2);
  }

  function fmtINR(v) {
    if (v >= 1e7) return "₹" + trim(v / 1e7) + " Cr";
    if (v >= 1e5) return "₹" + trim(v / 1e5) + " L";
    return "₹" + Math.round(v).toLocaleString("en-IN");
  }

  // Readable convention (matches the article tables): Rs 1 lakh ~ $1,000.
  function fmtUSD(v) {
    const d = v / 100;
    if (d >= 1e6) return "$" + trim(d / 1e6) + "M";
    return "$" + Math.round(d).toLocaleString("en-US");
  }

  const money = (v) => (mode === "inr" ? fmtINR(v) : fmtUSD(v));

  /* ---------- Read the five variables ------------------------------- */

  function vars() {
    const age = +$("age").value;
    const life = +$("life").value;
    const ret = +$("ret").value;
    const infl = +$("infl").value;
    const monthly = +$("spend").value;
    const years = Math.max(1, life - age);
    const annual = monthly * 12;
    return { age, life, ret, infl, monthly, years, annual };
  }

  /* ---------- Part 1: the five variables ---------------------------- */

  function renderVarOutputs() {
    const v = vars();
    $("age-out").textContent = v.age;
    $("life-out").textContent = v.life;
    $("ret-out").textContent = v.ret.toFixed(1) + "%";
    $("infl-out").textContent = v.infl.toFixed(1) + "%";
    $("spend-out").textContent = money(v.monthly) + "/mo";
  }

  function renderPart1() {
    const v = vars();
    const corpus = requiredCorpus(v.annual, v.years, v.ret, v.infl);
    const real = ((1 + v.ret / 100) / (1 + v.infl / 100) - 1) * 100;
    $("years-val").textContent = v.years + " yrs";
    $("corpus-val").textContent = money(corpus);
    $("corpus-note").textContent =
      money(v.monthly) + "/mo, growing with inflation, for " + v.years + " years";
    $("real-val").textContent = (real >= 0 ? "+" : "") + real.toFixed(1) + "%";
    return corpus;
  }

  /* ---------- Part 2: why one number lies (uncertainty explorer) ---- */

  function unc() {
    return { r: +$("u-ret").value, g: +$("u-infl").value, y: +$("u-life").value };
  }
  const pmPct = (x) => "±" + x + "%";
  const pmYrs = (x) => "±" + x + (x === 1 ? " yr" : " yrs");

  // "nice" axis step (1 / 2 / 5 × 10^n) for ~4 divisions
  function niceStep(max) {
    const rough = Math.max(max, 1e-9) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const f = rough / mag;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  }

  // Draw the corpus band on a real ₹/$ axis (SVG into #range-svg).
  function drawBand(opt, base, con, annual) {
    const W = 640, padL = 10, padR = 10, plotW = W - padL - padR;
    const maxV = Math.max(con, annual * 40) * 1.08;
    const X = (v) => padL + (Math.min(100, (v / maxV) * 100) / 100) * plotW;
    const unitDiv = mode === "inr" ? 1e7 : 1e8;
    const step = niceStep(maxV / unitDiv);
    const fmtN = (n) => Math.round(n * 100) / 100;
    const bandTop = 44, bandH = 26, mid = bandTop + bandH / 2;
    let s = "";
    for (let tv = 0; tv <= maxV / unitDiv + 1e-9; tv += step) {
      const x = X(tv * unitDiv);
      s += '<line x1="' + x.toFixed(1) + '" y1="24" x2="' + x.toFixed(1) + '" y2="100" stroke="#2c313d" stroke-width="1"/>';
      const lab = tv < 1e-9 ? "0" : (mode === "inr" ? "₹" + fmtN(tv) + " Cr" : "$" + fmtN(tv) + "M");
      s += '<text x="' + x.toFixed(1) + '" y="116" fill="#7f8696" font-size="10" text-anchor="middle">' + lab + "</text>";
    }
    s += '<defs><linearGradient id="bandgrad" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0" stop-color="#6fcf97"/><stop offset="0.5" stop-color="#e5b769"/>' +
      '<stop offset="1" stop-color="#e07a5f"/></linearGradient></defs>';
    const bx = X(opt), bw = Math.max(2, X(con) - X(opt));
    s += '<rect x="' + bx.toFixed(1) + '" y="' + bandTop + '" width="' + bw.toFixed(1) +
      '" height="' + bandH + '" rx="' + (bandH / 2) + '" fill="url(#bandgrad)"/>';
    const xb = X(base);
    s += '<line x1="' + xb.toFixed(1) + '" y1="36" x2="' + xb.toFixed(1) + '" y2="' + (bandTop + bandH + 4) +
      '" stroke="#eef0f4" stroke-width="2"/>';
    const lxb = Math.min(W - 62, Math.max(62, xb));
    s += '<text x="' + lxb.toFixed(1) + '" y="30" fill="#eef0f4" font-size="11" font-weight="600" text-anchor="middle">Your Part 1 number</text>';
    if (X(con) - X(opt) > 34) {
      s += '<text x="' + (bx - 6).toFixed(1) + '" y="' + (mid + 3.5).toFixed(1) +
        '" fill="#b7bcc8" font-size="10" text-anchor="end">' + money(opt) + "</text>";
      s += '<text x="' + (X(con) + 6).toFixed(1) + '" y="' + (mid + 3.5).toFixed(1) +
        '" fill="#b7bcc8" font-size="10" text-anchor="start">' + money(con) + "</text>";
    }
    [25, 30, 40].forEach((m) => {
      const x = X(annual * m);
      s += '<line x1="' + x.toFixed(1) + '" y1="' + (bandTop + bandH + 2) + '" x2="' + x.toFixed(1) +
        '" y2="' + (bandTop + bandH + 12) + '" stroke="#c9a24f" stroke-width="1"/>';
      s += '<text x="' + x.toFixed(1) + '" y="' + (bandTop + bandH + 24) +
        '" fill="#c9a24f" font-size="10" text-anchor="middle">' + m + "×</text>";
    });
    $("range-svg").innerHTML = s;
  }

  function renderRange() {
    const v = vars();
    const u = unc();
    $("u-ret-out").textContent = pmPct(u.r);
    $("u-infl-out").textContent = pmPct(u.g);
    $("u-life-out").textContent = pmYrs(u.y);

    const base = requiredCorpus(v.annual, v.years, v.ret, v.infl);
    const optYears = Math.max(1, v.years - u.y);
    const conYears = v.years + u.y;
    const opt = requiredCorpus(v.annual, optYears, v.ret + u.r, Math.max(0, v.infl - u.g));
    const con = requiredCorpus(v.annual, conYears, Math.max(0, v.ret - u.r), v.infl + u.g);

    drawBand(opt, base, con, v.annual);

    $("range-opt").textContent = money(opt);
    $("range-base").textContent = money(base);
    $("range-con").textContent = money(con);

    const spread = con - opt;
    const ratio = opt > 0 ? con / opt : 1;
    if (spread < 1) {
      $("range-caption").innerHTML =
        "With zero uncertainty there is exactly one number — <strong>" + money(base) +
        "</strong>. But you can't really know these three. Admit some doubt above and watch the band open.";
    } else {
      $("range-caption").innerHTML =
        "All three are built from the five variables you set in Part 1 — same person, same spending. The prudent number is <strong>" +
        ratio.toFixed(1) + "×</strong> the optimistic one — a spread of <strong>" +
        money(spread) + "</strong>. A rule-of-thumb multiple picks one dot on this line and calls it certainty.";
    }

    // How much does each uncertainty alone widen the band?
    const cRet = requiredCorpus(v.annual, v.years, Math.max(0, v.ret - u.r), v.infl) -
                 requiredCorpus(v.annual, v.years, v.ret + u.r, v.infl);
    const cInfl = requiredCorpus(v.annual, v.years, v.ret, v.infl + u.g) -
                  requiredCorpus(v.annual, v.years, v.ret, Math.max(0, v.infl - u.g));
    const cLife = requiredCorpus(v.annual, conYears, v.ret, v.infl) -
                  requiredCorpus(v.annual, optYears, v.ret, v.infl);
    const cmax = Math.max(cRet, cInfl, cLife, 1);
    const setC = (bar, val, c) => {
      $(bar).style.width = (Math.max(0, c) / cmax * 100) + "%";
      $(val).textContent = money(Math.max(0, c));
    };
    setC("contrib-ret", "contrib-ret-v", cRet);
    setC("contrib-infl", "contrib-infl-v", cInfl);
    setC("contrib-life", "contrib-life-v", cLife);

    $("range-foot-opt").textContent =
      "Optimistic = returns up " + u.r + "%, inflation down " + u.g + "%, life expectancy down " + u.y + " years.";
    $("range-foot-con").textContent =
      "Prudent = returns down " + u.r + "%, inflation up " + u.g + "%, life expectancy up " + u.y + " years.";
  }

  /* ---------- Part 3: small errors stack (fragility explorer) ------- */

  // Draw a corpus down year by year. Returns { pts:[[age,bal]], runout }.
  function drawdown(C, monthly, retPct, inflPct, age0, capAge) {
    const r = retPct / 100, g = inflPct / 100, annual0 = monthly * 12;
    let bal = C;
    const pts = [[age0, bal]];
    let runout = null;
    for (let t = 0; t < capAge - age0; t++) {
      const w = annual0 * Math.pow(1 + g, t);      // this year's withdrawal
      if (bal < w - 1) { runout = age0 + t; pts.push([age0 + t, 0]); break; } // can't fund this year (₹1 tolerance)
      bal -= w;                                    // withdraw at start of year
      bal *= (1 + r);                              // remainder grows
      pts.push([age0 + t + 1, Math.max(0, bal)]);
    }
    if (runout === null) runout = capAge;
    return { pts, runout };
  }

  function drawChart(plan, reality, age0, finish, runout) {
    const W = 640, H = 280, padL = 46, padR = 16, padT = 16, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const xmax = finish;
    let ymax = 0;
    plan.pts.concat(reality.pts).forEach((p) => { if (p[0] <= xmax && p[1] > ymax) ymax = p[1]; });
    ymax = ymax * 1.06 || 1;
    const X = (a) => padL + (Math.min(a, xmax) - age0) / (xmax - age0) * plotW;
    const Y = (b) => padT + (1 - b / ymax) * plotH;
    const path = (pts) => pts.filter((p) => p[0] <= xmax + 1e-6)
      .map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
    const unit = mode === "inr" ? "₹ crore" : "$ million";
    const axisVal = (rup) => (mode === "inr" ? rup / 1e7 : rup / 1e8);
    const dp = axisVal(ymax) < 5 ? 1 : 0;
    let s = "";
    for (let i = 0; i <= 4; i++) {
      const gy = (ymax * i) / 4, yy = Y(gy);
      s += '<line x1="' + padL + '" y1="' + yy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + yy.toFixed(1) + '" stroke="#2c313d" stroke-width="1"/>';
      s += '<text x="' + (padL - 6) + '" y="' + (yy + 3).toFixed(1) + '" fill="#7f8696" font-size="10" text-anchor="end">' + axisVal(gy).toFixed(dp) + '</text>';
    }
    for (let a = age0; a <= xmax; a += 10) {
      s += '<text x="' + X(a).toFixed(1) + '" y="' + (H - 10) + '" fill="#7f8696" font-size="10" text-anchor="middle">' + a + '</text>';
    }
    if ((xmax - age0) % 10 !== 0) {
      s += '<text x="' + X(xmax).toFixed(1) + '" y="' + (H - 10) + '" fill="#7f8696" font-size="10" text-anchor="middle">' + xmax + '</text>';
    }
    s += '<text x="' + padL + '" y="11" fill="#7f8696" font-size="10">' + unit + '</text>';
    if (runout < xmax) {
      s += '<line x1="' + X(runout).toFixed(1) + '" y1="' + Y(0).toFixed(1) + '" x2="' + X(runout).toFixed(1) + '" y2="' + padT + '" stroke="#e07a5f" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>';
    }
    s += '<path d="' + path(plan.pts) + '" fill="none" stroke="#e5b769" stroke-width="2.5"/>';
    s += '<path d="' + path(reality.pts) + '" fill="none" stroke="#e07a5f" stroke-width="2.5"/>';
    if (runout < xmax) {
      const lx = X(runout), toEnd = lx > W - 130;
      s += '<circle cx="' + lx.toFixed(1) + '" cy="' + Y(0).toFixed(1) + '" r="4" fill="#e07a5f"/>';
      s += '<text x="' + (lx + (toEnd ? -8 : 8)).toFixed(1) + '" y="' + (Y(0) - 8).toFixed(1) +
        '" fill="#e07a5f" font-size="11" font-weight="700" text-anchor="' + (toEnd ? "end" : "start") + '">runs out at ' + runout + '</text>';
    }
    $("p3-chart").innerHTML = s;
  }

  function renderStress() {
    const v = vars();
    const sRet = +$("e-ret").value, sInfl = +$("e-infl").value, sSpend = +$("e-spend").value;
    $("e-ret-out").textContent = "−" + sRet + "%";
    $("e-infl-out").textContent = "+" + sInfl + "%";
    $("e-spend-out").textContent = "+" + sSpend + "%";
    const onRet = $("t-ret").checked, onInfl = $("t-infl").checked, onSpend = $("t-spend").checked;
    $("row-ret").classList.toggle("off", !onRet);
    $("row-infl").classList.toggle("off", !onInfl);
    $("row-spend").classList.toggle("off", !onSpend);
    const eRet = onRet ? sRet : 0, eInfl = onInfl ? sInfl : 0, eSpend = onSpend ? sSpend : 0;

    const C = requiredCorpus(v.annual, v.years, v.ret, v.infl);
    const finish = v.age + v.years; // = life expectancy, but never <= current age
    const cap = Math.max(finish + 20, 130);
    const plan = drawdown(C, v.monthly, v.ret, v.infl, v.age, finish);
    const reality = drawdown(C, v.monthly * (1 + eSpend / 100), v.ret - eRet, v.infl + eInfl, v.age, cap);
    const runout = Math.min(reality.runout, cap);
    const early = Math.max(0, finish - runout);

    $("p3-runout").textContent = "age " + runout;
    const rc = $("runout-card");
    if (early > 0) {
      rc.classList.remove("on-plan");
      $("p3-early").textContent = early + (early === 1 ? " year" : " years") + " early";
    } else {
      rc.classList.add("on-plan");
      $("p3-early").textContent = "as per plan";
    }

    drawChart(plan, reality, v.age, finish, runout);

    // Individual vs stacked shortfall (the "stacking" proof)
    const ro = (er, ei, es) =>
      Math.min(drawdown(C, v.monthly * (1 + es / 100), v.ret - er, v.infl + ei, v.age, cap).runout, cap);
    const ind = [];
    if (onRet && sRet > 0) ind.push({ n: "return", y: Math.max(0, finish - ro(sRet, 0, 0)) });
    if (onInfl && sInfl > 0) ind.push({ n: "inflation", y: Math.max(0, finish - ro(0, sInfl, 0)) });
    if (onSpend && sSpend > 0) ind.push({ n: "spending", y: Math.max(0, finish - ro(0, 0, sSpend)) });
    const worst = ind.reduce((m, p) => Math.max(m, p.y), 0);

    if (ind.length >= 2 && early > 0) {
      const parts = ind.map((p) => p.n + " −" + p.y + "y").join(", ");
      $("p3-stack").innerHTML = "Each is only a nudge off plan. On their own: " + parts +
        ". But reality rarely sends them one at a time — stacked, they take <strong>−" + early +
        " years</strong> off your runway, well past the worst single slip (−" + worst + "y).";
    } else if (ind.length === 1 && early > 0) {
      $("p3-stack").innerHTML = "Just this one nudge already costs <strong>−" + early + (early === 1 ? " year" : " years") +
        "</strong>. Toggle another on and watch them stack.";
    } else if (ind.length === 0) {
      $("p3-stack").textContent = "No slips active — your Part 1 corpus lasts to " + finish +
        ", exactly as planned. Toggle on 1 or more slips to see the impact.";
    } else {
      $("p3-stack").textContent = "Small enough that the corpus still lasts to " + finish + ". Nudge them up.";
    }

    $("stress-foot-slips").textContent = "Slips modelled: return −" + sRet + "%, inflation +" + sInfl +
      "%, spending +" + sSpend + "%" + (onRet && onInfl && onSpend ? "." : " (only the ticked ones apply).");
  }

  /* ---------- Part 4: arithmetic of enough (corpus -> spend) -------- */

  const CORPUS_ROWS = [1e7, 2e7, 5e7, 1e8, 1.5e8, 2e8, 3e8, 5e8, 1e9]; // 1..100 Cr
  const AGES = [25, 30, 35, 40, 45, 50, 55, 60];

  function nearestIndex(arr, val) {
    let best = 0, bd = Infinity;
    arr.forEach((a, i) => { const d = Math.abs(a - val); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  // highlight a table column only when the retire age falls within the
  // reference table's own age range (the article tables run 25–60)
  function hotAgeIndex(val) {
    return val >= AGES[0] && val <= AGES[AGES.length - 1] ? nearestIndex(AGES, val) : -1;
  }
  const plYr = (n) => n + (n === 1 ? " year" : " years");

  function renderEnoughLens() {
    const c = +$("e-corpus").value;
    const age = +$("e-age").value;
    const years = Math.max(1, LIFE_TABLE - age);
    $("e-corpus-out").textContent = money(c);
    $("e-age-out").textContent = age;
    const monthly = c / years / 12;
    $("e-monthly").textContent = money(monthly) + "/mo";
    $("e-note").textContent = "for " + plYr(years) + ", if returns only keep pace with inflation";
  }

  function renderEnoughTable() {
    const hotAge = hotAgeIndex(+$("e-age").value);
    const hotCorpus = nearestIndex(CORPUS_ROWS, +$("e-corpus").value);
    let html = "<tr><th>Corpus \\ Retire at</th>";
    AGES.forEach((a) => (html += "<th>" + a + "</th>"));
    html += "</tr>";
    CORPUS_ROWS.forEach((c, ri) => {
      html += "<tr" + (ri === hotCorpus ? ' class="hot-row"' : "") + "><td>" + money(c) + "</td>";
      AGES.forEach((a, ci) => {
        const monthly = c / (LIFE_TABLE - a) / 12;
        const hot = hotAge >= 0 && ri === hotCorpus && ci === hotAge ? ' class="hot"' : "";
        html += "<td" + hot + ">" + money(monthly) + "</td>";
      });
      html += "</tr>";
    });
    $("enough-table").innerHTML = html;
  }

  /* ---------- Part 5: lifestyle x time (spend -> corpus) ------------ */

  const SPEND_ROWS = [50000, 100000, 200000, 300000, 500000, 1000000]; // per month

  function renderLifestyleLens() {
    const m = +$("l-spend").value;
    const age = +$("l-age").value;
    const years = Math.max(1, LIFE_TABLE - age);
    $("l-spend-out").textContent = money(m) + "/mo";
    $("l-age-out").textContent = age;
    const corpus = m * 12 * years;
    $("l-corpus").textContent = money(corpus);
    $("l-note").textContent = "to fund that life for " + plYr(years) + " (returns matching inflation)";
  }

  function renderLifestyleTable() {
    const hotAge = hotAgeIndex(+$("l-age").value);
    const hotSpend = nearestIndex(SPEND_ROWS, +$("l-spend").value);
    let html = "<tr><th>Lifestyle \\ Retire at</th>";
    AGES.forEach((a) => (html += "<th>" + a + "</th>"));
    html += "</tr>";
    SPEND_ROWS.forEach((m, ri) => {
      html += "<tr" + (ri === hotSpend ? ' class="hot-row"' : "") + "><td>" + money(m) + "/mo</td>";
      AGES.forEach((a, ci) => {
        const corpus = m * 12 * (LIFE_TABLE - a);
        const hot = hotAge >= 0 && ri === hotSpend && ci === hotAge ? ' class="hot"' : "";
        html += "<td" + hot + ">" + money(corpus) + "</td>";
      });
      html += "</tr>";
    });
    $("lifestyle-table").innerHTML = html;
  }

  /* ---------- Part 6: FI != RE -------------------------------------- */

  let shock = "crash";

  function renderBuffer() {
    const v = vars();
    const corpus = requiredCorpus(v.annual, v.years, v.ret, v.infl);
    const runway = corpus / v.annual; // years at today's spend
    let fi, re;

    if (shock === "crash") {
      const after = corpus * 0.7;
      const lost = runway * 0.3;
      fi =
        "Your pot falls from " + money(corpus) + " to " + money(after) +
        ". But your salary still covers the bills — you don't sell into the fall. You wait, and let it recover.";
      re =
        "Your pot falls to " + money(after) + " and you're still drawing from it. Selling in a down market locks the loss in. Roughly " +
        lost.toFixed(0) + " years of runway gone.";
    } else if (shock === "expense") {
      const bill = v.annual * 2;
      const lost = 2;
      fi =
        "A " + money(bill) + " bill lands. You spread it across a few years of income, or work a little longer. The corpus is untouched.";
      re =
        "That same " + money(bill) + " comes straight out of the corpus — there's nowhere else for it to go. About " +
        lost + " years of runway, gone in one cheque.";
    } else {
      const newAnnual = v.annual * 1.15;
      const newCorpus = requiredCorpus(newAnnual, v.years, v.ret, v.infl);
      const gap = newCorpus - corpus;
      fi =
        "Costs jump 15%. You lean on raises, a side project, or trim for a year. Income flexes to meet it.";
      re =
        "Costs jump 15% — permanently. Every future withdrawal is bigger. You'd now need " +
        money(gap) + " more corpus you don't have. The only levers are cut, or sell.";
    }
    $("fi-desc").textContent = fi;
    $("re-desc").textContent = re;
  }

  /* ---------- Part 7: the decision gate ----------------------------- */

  const TESTS = [
    {
      t: "Time Coverage Test",
      q: "If I live 5–10 years longer than average, does my plan still hold?",
      items: [
        "I've modelled funding to age 90–95, not 80–85.",
        "My corpus survives even if returns are mediocre late in life.",
        "I'm mentally prepared for a 40–50 year funding horizon.",
      ],
      fail: "You're not retiring — you're front-loading risk.",
    },
    {
      t: "Inflation Reality Test",
      q: "Do I know my personal inflation rate — and assumed it's higher than official CPI?",
      items: [
        "I've split expenses into buckets (housing, food, healthcare, travel, discretionary).",
        "I've assumed healthcare inflates faster than CPI.",
        "I've assumed lifestyle upgrades don't magically stop post-retirement.",
      ],
      fail: "Your FIRE number is an illusion built on averages.",
    },
    {
      t: "Return Conservatism Test",
      q: "Does my plan still work if markets disappoint early?",
      items: [
        "I've assumed returns lower than long-term historical averages.",
        "I can survive 5–7 bad years right after quitting.",
        "I have enough low-volatility assets to fund early withdrawals.",
      ],
      fail: "You're one bad decade away from re-entering the workforce.",
    },
    {
      t: "Withdrawal Flexibility Test",
      q: "Can I cut spending if reality deviates from plan?",
      items: [
        "I know which of my expenses are truly optional.",
        "I can reduce withdrawals by 15–25% if needed.",
        "I'm emotionally okay downgrading lifestyle temporarily.",
      ],
      fail: "You're over-optimized and under-insured.",
    },
    {
      t: "Income Optionality Test",
      q: "Is my income really going to zero — or do I have optionality?",
      items: [
        "I can earn some money without stress if needed.",
        "I have skills, credibility, or assets that generate cash flow.",
        "I've avoided burning bridges permanently.",
      ],
      fail: "Your FIRE decision is binary — and binary decisions are fragile.",
    },
    {
      t: "Psychological Readiness Test",
      q: "Am I retiring from something, or to something?",
      items: [
        "I have structure for my time post-retirement.",
        "I know how I'll spend my time meaningfully.",
        "I'm not using FIRE to escape burnout or dissatisfaction.",
      ],
      fail: "Fix life design before fixing corpus size.",
    },
    {
      t: "Margin of Safety Test",
      q: "If I'm wrong on two variables at once, do I still survive?",
      items: [
        "I've stress-tested combined failures (e.g. longer life + lower returns).",
        "My corpus lasts even under pessimistic-but-plausible scenarios.",
        "I'm choosing conservatism consciously, not accidentally.",
      ],
      fail: "You are betting on luck — not planning.",
    },
  ];

  function buildGate() {
    $("gate-list").innerHTML = TESTS.map((test, i) => {
      const items = test.items
        .map(
          (it, j) =>
            '<label class="gate-item"><input type="checkbox" data-gate="1" id="g-' +
            i + "-" + j + '">' + "<span>" + it + "</span></label>"
        )
        .join("");
      return (
        '<details class="gate-test"' + (i === 0 ? " open" : "") + ">" +
        "<summary>" +
        '<span class="gate-test-idx">' + (i + 1) + "</span>" +
        '<span class="gate-test-title">' + test.t + "</span>" +
        '<span class="gate-test-badge" id="badge-' + i + '">0/3</span>' +
        "</summary>" +
        '<div class="gate-body">' +
        '<p class="gate-q">' + test.q + "</p>" +
        items +
        '<p class="gate-fail"><strong>If this fails:</strong> ' + test.fail + "</p>" +
        "</div></details>"
      );
    }).join("");

    $("gate-list").addEventListener("change", (e) => {
      if (e.target.matches('[data-gate]')) renderGate();
    });
  }

  function renderGate() {
    let total = 0;
    TESTS.forEach((test, i) => {
      let c = 0;
      test.items.forEach((_, j) => { if ($("g-" + i + "-" + j).checked) c++; });
      $("badge-" + i).textContent = c + "/3";
      total += c;
    });
    $("gate-num").textContent = total;
    $("gate-fill").style.width = (total / 21) * 100 + "%";

    let msg;
    if (total === 0) msg = "Work through the seven tests below. Be honest — the point is to find the gaps, not to score well.";
    else if (total <= 10) msg = "More gaps than green lights. This isn't a plan yet — it's a hope. Keep going.";
    else if (total <= 17) msg = "A workable base, but real gaps remain. Close them before you cross the line.";
    else if (total <= 20) msg = "Strong. A couple of honest gaps left to shore up.";
    else msg = "Every box ticked — and even so, this is a readiness check, not a green light.";
    $("gate-readout").textContent = msg;
  }

  /* ---------- Orchestration ----------------------------------------- */

  function renderAll() {
    renderVarOutputs();
    renderPart1();
    renderRange();
    renderStress();
    renderEnoughLens();
    renderEnoughTable();
    renderLifestyleLens();
    renderLifestyleTable();
    renderBuffer();
  }

  function init() {
    // Main five variables
    ["age", "life", "ret", "infl", "spend"].forEach((id) =>
      $(id).addEventListener("input", renderAll)
    );
    // Part 2 uncertainty sliders
    ["u-ret", "u-infl", "u-life"].forEach((id) =>
      $(id).addEventListener("input", renderRange)
    );
    // Part 3 error sliders + stack toggles
    ["e-ret", "e-infl", "e-spend"].forEach((id) =>
      $(id).addEventListener("input", renderStress)
    );
    ["t-ret", "t-infl", "t-spend"].forEach((id) =>
      $(id).addEventListener("change", renderStress)
    );
    // Lens 4
    ["e-corpus", "e-age"].forEach((id) =>
      $(id).addEventListener("input", () => { renderEnoughLens(); renderEnoughTable(); })
    );
    // Lens 5
    ["l-spend", "l-age"].forEach((id) =>
      $(id).addEventListener("input", () => { renderLifestyleLens(); renderLifestyleTable(); })
    );
    // Currency toggle
    document.querySelectorAll(".ccy-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        mode = btn.dataset.ccy;
        document.querySelectorAll(".ccy-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
        renderAll();
      })
    );
    // Shock picker
    document.querySelectorAll(".shock-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        shock = btn.dataset.shock;
        document.querySelectorAll(".shock-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
        renderBuffer();
      })
    );

    buildGate();
    renderAll();
    renderGate();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

/* ============================================================
   Scheduled unlock — soft, timezone-safe, no manual intervention.

   Each part reveals itself at a fixed UTC instant (derived from the
   IST publish schedule; India has no DST, so IST = UTC+5:30 always).
   Time is taken from GitHub Pages' own `Date` response header when
   available, falling back to the visitor's clock.

   Author preview (no code edits needed):
     ?unlock=all                 reveal everything now
     ?now=2026-09-15T07:00:00Z   simulate the clock at any instant
   ============================================================ */

(function () {
  "use strict";

  // section id -> { part label, unlock instant (UTC) }
  const SCHEDULE = [
    { id: "variables", part: "Part 1", iso: "2026-08-31T06:00:00Z", article: "https://zenca.global/p/fire-reframed-17-the-five-variables" },
    { id: "method",    part: "Part 1", iso: "2026-08-31T06:00:00Z", article: null },
    { id: "range",     part: "Part 2", iso: "2026-09-07T06:00:00Z", article: "https://zenca.global/p/fire-reframed-27-why-fire-numbers-lie" },
    { id: "stress",    part: "Part 3", iso: "2026-09-14T06:00:00Z", article: "https://zenca.global/p/fire-reframed-37-stress-testing-fire" },
    { id: "enough",    part: "Part 4", iso: "2026-09-21T06:00:00Z", article: "https://zenca.global/p/fire-reframed-47-arithmetic-of-enough" },
    { id: "lifestyle", part: "Part 5", iso: "2026-09-28T06:00:00Z", article: "https://zenca.global/p/fire-reframed-57-retirement-equation" },
    { id: "buffer",    part: "Part 6", iso: "2026-10-05T06:00:00Z", article: "https://zenca.global/p/fire-reframed-67-fi-is-easy-re-is-hard" },
    { id: "gate",      part: "Part 7", iso: "2026-10-12T06:00:00Z", article: "https://zenca.global/p/fire-reframed-77-the-decision-gate" },
  ];

  const LOCK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/>' +
    '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';

  const params = new URLSearchParams(location.search);
  // `?unlock=all` (author preview) or a baked-in flag used only by the
  // review copy of this page; the deployed GitHub files never set it.
  const unlockAll = params.get("unlock") === "all" || window.__FIRE_PREVIEW_ALL__ === true;

  // ---- Clock: skew-adjusted "now" -------------------------------
  let timeSkew = 0;              // serverTime - localTime (ms)
  let simBase = null;           // ?now= override
  const realAtLoad = Date.now();
  if (params.get("now")) {
    const s = Date.parse(params.get("now"));
    if (!isNaN(s)) simBase = s;
  }
  function now() {
    if (simBase !== null) return simBase + (Date.now() - realAtLoad);
    return Date.now() + timeSkew;
  }
  async function calibrate() {
    if (simBase !== null) return; // simulated clock: don't override
    try {
      const r = await fetch(location.href, { method: "HEAD", cache: "no-store" });
      const d = r.headers.get("date");
      if (d) { const s = Date.parse(d); if (!isNaN(s)) timeSkew = s - Date.now(); }
    } catch (e) { /* offline / file:// — fall back to local clock */ }
  }

  const istFmt = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
  const whenText = (iso) => istFmt.format(new Date(iso)).replace(/ /g, " ") + " IST";

  function pad(n) { return String(n).padStart(2, "0"); }

  function build() {
    SCHEDULE.forEach((s) => {
      const sec = document.getElementById(s.id);
      if (!sec) return;
      const head = sec.querySelector(".part-head");
      const unlockMs = Date.parse(s.iso);

      // badge next to the title
      const h2 = head.querySelector("h2");
      const badge = document.createElement("span");
      badge.className = "lock-badge";
      badge.innerHTML = LOCK_SVG + "<span>Locked</span>";
      h2.appendChild(badge);

      // teaser / countdown card
      const card = document.createElement("div");
      card.className = "lock-card";
      card.innerHTML =
        '<div class="lock-ring">' + LOCK_SVG + "</div>" +
        '<p class="lock-when">Unlocks with <strong>' + s.part +
        "</strong><br>" + whenText(s.iso) + "</p>" +
        '<div class="countdown" role="timer" aria-live="off">' +
        ['days', 'hrs', 'min', 'sec'].map((u) =>
          '<div class="cd-unit"><span class="cd-num" data-u="' + u + '">--</span>' +
          '<span class="cd-lab">' + u + "</span></div>").join("") +
        "</div>";
      head.insertAdjacentElement("afterend", card);

      // outbound "read the article" link — appended last, so it's hidden while
      // locked and reveals with the section (which unlocks when the article
      // itself goes live).
      if (s.article) {
        const link = document.createElement("a");
        link.className = "read-article";
        link.href = s.article;
        link.target = "_blank";
        link.rel = "noopener";
        link.innerHTML = 'Read this part on Zenca <span aria-hidden="true">&rarr;</span>';
        sec.appendChild(link);
      }

      // nav chip
      const navLink = document.querySelector('.hero-nav a[href="#' + s.id + '"]');

      sec._gate = { unlockMs, card, badge, sec, navLink, locked: null };
    });
  }

  function setLocked(g, locked) {
    if (g.locked === locked) return;
    g.locked = locked;
    g.sec.classList.toggle("is-locked", locked);
    g.card.style.display = locked ? "" : "none";
    g.badge.style.display = locked ? "" : "none";
    if (g.navLink) {
      g.navLink.classList.toggle("locked", locked);
      const existing = g.navLink.querySelector("svg");
      if (locked && !existing) g.navLink.insertAdjacentHTML("afterbegin", LOCK_SVG);
      if (!locked && existing) existing.remove();
    }
    if (!locked) {
      g.sec.classList.add("unlock-flash");
      setTimeout(() => g.sec.classList.remove("unlock-flash"), 1800);
    }
  }

  function tick() {
    const t = now();
    SCHEDULE.forEach((s) => {
      const sec = document.getElementById(s.id);
      const g = sec && sec._gate;
      if (!g) return;
      const locked = !unlockAll && t < g.unlockMs;
      setLocked(g, locked);
      if (locked) {
        let rem = Math.max(0, g.unlockMs - t);
        const d = Math.floor(rem / 86400000); rem -= d * 86400000;
        const h = Math.floor(rem / 3600000); rem -= h * 3600000;
        const m = Math.floor(rem / 60000); rem -= m * 60000;
        const sX = Math.floor(rem / 1000);
        const set = (u, v) => { const el = g.card.querySelector('[data-u="' + u + '"]'); if (el) el.textContent = v; };
        set("days", d); set("hrs", pad(h)); set("min", pad(m)); set("sec", pad(sX));
      }
    });
  }

  function start() {
    build();
    tick();
    calibrate().then(tick);
    setInterval(tick, 1000);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
