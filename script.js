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

  /* ---------- Part 2: why one number lies --------------------------- */

  function renderRange() {
    const v = vars();
    const opt = requiredCorpus(v.annual, Math.max(1, v.years - 5), v.ret + 2, Math.max(0, v.infl - 1));
    const base = requiredCorpus(v.annual, v.years, v.ret, v.infl);
    const con = requiredCorpus(v.annual, v.years + 5, Math.max(0, v.ret - 2), v.infl + 1);

    const m25 = v.annual * 25, m30 = v.annual * 30, m40 = v.annual * 40;
    const maxV = Math.max(con, m40) * 1.08;
    const pos = (x) => Math.min(100, (x / maxV) * 100);

    const fill = $("band-fill");
    fill.style.left = pos(opt) + "%";
    fill.style.width = Math.max(1, pos(con) - pos(opt)) + "%";
    $("mark-base").style.left = pos(base) + "%";
    document.querySelectorAll(".band-tick").forEach((t) => {
      const mult = +t.dataset.mult;
      t.style.left = pos(v.annual * mult) + "%";
    });

    $("range-opt").textContent = money(opt);
    $("range-base").textContent = money(base);
    $("range-con").textContent = money(con);

    const spread = con - opt;
    const ratio = con / opt;
    $("range-caption").innerHTML =
      "Same person, same spending. The prudent number is <strong>" +
      ratio.toFixed(1) + "×</strong> the optimistic one — a spread of <strong>" +
      money(spread) + "</strong>. A rule-of-thumb multiple picks one dot on this line and calls it certainty.";
  }

  /* ---------- Part 3: small errors stack ---------------------------- */

  function renderTornado() {
    const v = vars();
    const base = requiredCorpus(v.annual, v.years, v.ret, v.infl);

    const factors = [
      { label: "Return 1% lower", c: requiredCorpus(v.annual, v.years, v.ret - 1, v.infl) },
      { label: "Inflation 1% higher", c: requiredCorpus(v.annual, v.years, v.ret, v.infl + 1) },
      { label: "Live 5 years longer", c: requiredCorpus(v.annual, v.years + 5, v.ret, v.infl) },
      { label: "Spend 10% more", c: requiredCorpus(v.annual * 1.1, v.years, v.ret, v.infl) },
    ];
    factors.forEach((f) => (f.delta = f.c - base));
    const maxDelta = Math.max(...factors.map((f) => f.delta), 1);

    $("tornado").innerHTML = factors
      .map((f) => {
        const pct = (f.delta / base) * 100;
        const w = (f.delta / maxDelta) * 100;
        return (
          '<div class="tor-row">' +
          '<span class="tor-label">' + f.label + "</span>" +
          '<span class="tor-track"><span class="tor-bar" style="width:' + w + '%"></span></span>' +
          '<span class="tor-delta">+' + money(f.delta) + " · +" + pct.toFixed(0) + "%</span>" +
          "</div>"
        );
      })
      .join("");

    const all = requiredCorpus(v.annual * 1.1, v.years + 5, v.ret - 1, v.infl + 1);
    const allDelta = all - base;
    const allPct = (allDelta / base) * 100;
    $("stack-val").textContent = money(all);
    $("stack-delta").innerHTML =
      "+" + money(allDelta) + " over your base — <strong>+" + allPct.toFixed(0) +
      "%</strong> more corpus, from four small, plausible slips.";
  }

  /* ---------- Part 4: arithmetic of enough (corpus -> spend) -------- */

  const CORPUS_ROWS = [1e7, 2e7, 5e7, 1e8, 1.5e8, 2e8, 3e8, 5e8, 1e9]; // 1..100 Cr
  const AGES = [25, 30, 35, 40, 45, 50, 55, 60];

  function nearestIndex(arr, val) {
    let best = 0, bd = Infinity;
    arr.forEach((a, i) => { const d = Math.abs(a - val); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  function renderEnoughLens() {
    const c = +$("e-corpus").value;
    const age = +$("e-age").value;
    const years = LIFE_TABLE - age;
    $("e-corpus-out").textContent = money(c);
    $("e-age-out").textContent = age;
    const monthly = c / years / 12;
    $("e-monthly").textContent = money(monthly) + "/mo";
    $("e-note").textContent = "for " + years + " years, if returns only keep pace with inflation";
  }

  function renderEnoughTable() {
    const hotAge = nearestIndex(AGES, +$("e-age").value);
    const hotCorpus = nearestIndex(CORPUS_ROWS, +$("e-corpus").value);
    let html = "<tr><th>Corpus \\ Retire at</th>";
    AGES.forEach((a) => (html += "<th>" + a + "</th>"));
    html += "</tr>";
    CORPUS_ROWS.forEach((c, ri) => {
      html += "<tr" + (ri === hotCorpus ? ' class="hot-row"' : "") + "><td>" + money(c) + "</td>";
      AGES.forEach((a, ci) => {
        const monthly = c / (LIFE_TABLE - a) / 12;
        const hot = ri === hotCorpus && ci === hotAge ? ' class="hot"' : "";
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
    const years = LIFE_TABLE - age;
    $("l-spend-out").textContent = money(m) + "/mo";
    $("l-age-out").textContent = age;
    const corpus = m * 12 * years;
    $("l-corpus").textContent = money(corpus);
    $("l-note").textContent = "to fund that life for " + years + " years (returns matching inflation)";
  }

  function renderLifestyleTable() {
    const hotAge = nearestIndex(AGES, +$("l-age").value);
    const hotSpend = nearestIndex(SPEND_ROWS, +$("l-spend").value);
    let html = "<tr><th>Lifestyle \\ Retire at</th>";
    AGES.forEach((a) => (html += "<th>" + a + "</th>"));
    html += "</tr>";
    SPEND_ROWS.forEach((m, ri) => {
      html += "<tr" + (ri === hotSpend ? ' class="hot-row"' : "") + "><td>" + money(m) + "/mo</td>";
      AGES.forEach((a, ci) => {
        const corpus = m * 12 * (LIFE_TABLE - a);
        const hot = ri === hotSpend && ci === hotAge ? ' class="hot"' : "";
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
    renderTornado();
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
