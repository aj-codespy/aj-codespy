// Draws every image on the profile README as a sheet from the hire-aj.space drawing set.
//
//   GITHUB_TOKEN=... node scripts/build.mjs [outDir=dist]
//
// The GitHub Action runs this every day and publishes dist/ to the `output` branch, which the
// README reads from. Edit the content below and push; the Action redraws everything.
// Without a token only the static sheets are drawn (header, sections, experience, wins, buttons).
//
// Each image comes in a light (whiteprint) and dark (blueprint) version. Fonts are embedded,
// because GitHub serves README images through a proxy that blocks web fonts.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER = process.env.GH_USER || "aj-codespy";
const W = 840;

const THEMES = {
  light: {
    paper: "#f6f4ef", node: "#fbfaf7", ink: "#10204a", ink2: "#33415f", muted: "#5d6883",
    line: "rgba(16,32,74,.2)", line2: "rgba(16,32,74,.1)", grid: "rgba(16,32,74,.055)",
    accent: "#c2410c", accentSoft: "rgba(194,65,12,.1)", onInk: "#f6f4ef",
  },
  dark: {
    paper: "#0d1e42", node: "#10244e", ink: "#eef2fb", ink2: "#c6cfe4", muted: "#94a2c3",
    line: "rgba(238,242,251,.24)", line2: "rgba(238,242,251,.12)", grid: "rgba(238,242,251,.06)",
    accent: "#ff8a4c", accentSoft: "rgba(255,138,76,.14)", onInk: "#0d1e42",
  },
};

// ───────────────────────── Type ─────────────────────────

const FONTS = {
  D: { file: "archivo-650", stack: "Archivo, 'Helvetica Neue', Arial, sans-serif" },
  T: { file: "geist-400", stack: "Geist, 'Helvetica Neue', Arial, sans-serif" },
  TM: { file: "geist-500", stack: "Geist, 'Helvetica Neue', Arial, sans-serif" },
  M: { file: "jbmono-400", stack: "'JetBrains Mono', ui-monospace, Menlo, monospace" },
  MM: { file: "jbmono-500", stack: "'JetBrains Mono', ui-monospace, Menlo, monospace" },
};
const read = (p) => readFileSync(join(ROOT, p));
const METRICS = JSON.parse(read("assets/fonts/metrics.json"));
const fontData = {};
const fontFace = (k) =>
  (fontData[k] ??= `@font-face{font-family:f${k};src:url(data:font/woff2;base64,${read(`assets/fonts/${FONTS[k].file}.woff2`).toString("base64")}) format('woff2')}`) +
  `.${k}{font-family:f${k},${FONTS[k].stack}}`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Width of a string in px. `ls` is letter-spacing in em. */
function measure(str, f, size, ls = 0) {
  const m = METRICS[FONTS[f].file];
  let w = 0;
  for (const ch of str) w += (m[ch] ?? 0.55) + ls;
  return w * size;
}

function wrap(str, f, size, width) {
  const lines = [];
  let cur = "";
  for (const word of str.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measure(next, f, size) > width) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** One line of text. Mono labels pass `ls` and `upper`. */
function text(x, y, str, f, size, fill, o = {}) {
  const s = o.upper ? String(str).toUpperCase() : str;
  const a = [`x="${r(x)}"`, `y="${r(y)}"`, `class="${f}"`, `font-size="${size}"`, `fill="${fill}"`];
  if (o.ls) a.push(`letter-spacing="${o.ls}em"`);
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`);
  if (o.attrs) a.push(o.attrs);
  return `<text ${a.join(" ")}>${esc(s)}</text>`;
}
const label = (x, y, str, fill, o = {}) => text(x, y, str, "MM", o.size ?? 12, fill, { ls: 0.08, upper: true, ...o });
const r = (n) => Math.round(n * 10) / 10;

// ───────────────────────── Sheet chrome ─────────────────────────

function doc(w, h, body, css = "") {
  const used = [...new Set([...body.matchAll(/class="(D|T|TM|M|MM)"/g)].map((m) => m[1]))];
  const style = used.map(fontFace).join("") + css;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><style>${style}</style>${body}</svg>\n`;
}

/** Corner marks around a box, like the crops on the portfolio portrait. */
function crops(x, y, w, h, color, len = 12, off = 6) {
  const p = [
    [x - off, y - off, 1, 1], [x + w + off, y - off, -1, 1],
    [x - off, y + h + off, 1, -1], [x + w + off, y + h + off, -1, -1],
  ];
  return p
    .map(([cx, cy, dx, dy]) => `<path d="M${cx} ${cy + dy * len}V${cy}H${cx + dx * len}" stroke="${color}" stroke-width="1.5"/>`)
    .join("");
}

function sheet(w, h, t) {
  return (
    `<defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 .5H.5V24" stroke="${t.grid}"/></pattern></defs>` +
    `<rect width="${w}" height="${h}" fill="${t.paper}"/><rect width="${w}" height="${h}" fill="url(#grid)"/>` +
    `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" stroke="${t.line}"/>` +
    crops(14, 14, w - 28, h - 28, t.ink, 10, 0)
  );
}

const reduced = `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

// ───────────────────────── Content ─────────────────────────

const HERO = {
  kicker: "Ayush Jha · AI engineer · Pune",
  title: ["I build AI systems", "like it’s my own", "company."],
  lead: "I’m on the AI team at Voiceqube, building multi-agent LLM systems end to end: the agents, the FastAPI services around them and the data underneath. Then I stay for what happens after launch.",
  proof: [
    ["getPlaced", "an AI resume tool I built alone, used by 5,000+ people"],
    ["Aligned Automation", "agents that took over 80% of data validation"],
  ],
  block: [
    ["Drawn by", "Ayush Jha"],
    ["Discipline", "AI engineering"],
    ["Currently", "SDE, AI · Voiceqube", true],
    ["Based in", "Pune, India"],
    ["Education", "B.E. AI & DS · 2027"],
  ],
};

const SECTIONS = {
  about: ["01", "About", "The person behind the drawings."],
  experience: ["02", "Experience", "Revision history."],
  stack: ["03", "Stack", "Tools I work with."],
  wins: ["04", "Awards", "Nine wins, built under pressure."],
  activity: ["05", "Activity", "Contribution record."],
  contact: ["06", "Contact", "Let’s build something."],
};

const EXPERIENCE = [
  {
    rev: "E", when: "Now", role: "SDE, AI", org: "Voiceqube", current: true,
    summary: "Software engineer on the AI team, building production AI systems.",
    tags: ["Python", "LLMs", "AI agents"],
  },
  {
    rev: "D", when: "Jan – Apr 2026", role: "AI Engineering Intern", org: "Aligned Automation",
    summary: "Built an agentic validation engine on LangGraph: a supervisor routes data to specialist validators and sends failures to a fixer agent, in a loop, until the data is clean.",
    points: [["80%", "of validation automated"], ["−30%", "data quality issues"], ["100 GB+", "NASCAR data processed"], ["+40%", "pipeline efficiency"]],
  },
  {
    rev: "C", when: "2026", role: "Founder, solo engineer", org: "getPlaced",
    summary: "Designed, built and launched an AI resume builder end to end: Next.js, FastAPI, an LLM agent pipeline and Firebase.",
    points: [["5,000+", "users"]],
  },
  {
    rev: "B", when: "2024 – 2025", role: "Hackathons", org: "9 competition wins",
    summary: "36-hour builds: generative-AI agent pipelines, predictive models and data dashboards, shipped under pressure and pitched to judges.",
    tags: ["GenAI", "ML", "Data"],
  },
  {
    rev: "A", when: "Aug – Nov 2024", role: "ML Intern", org: "RHV Group",
    summary: "Built recommendation models and cleaner sales data pipelines, and presented the findings to clients in Power BI.",
    points: [["+15%", "user engagement"], ["+20%", "analytical accuracy"], ["−25%", "data prep time"], ["3", "client projects won"]],
  },
];

const WINS = [
  ["1st", "Databot AI Hackathon", "IIIT Kottayam"],
  ["1st", "Datathon", "SBUP College"],
  ["2nd", "Mindspark 2025", "COEP Pune"],
  ["Win", "Startup Ideathon 2025", "JSPM Tathwade"],
  ["Win", "Quizatron", "MMCOE Dexterity 2025"],
  ["Win", "IIT Goa Datathon", "IIT Goa"],
  ["Win", "CodeVerse 2024", "MMCOE"],
  ["Win", "Datathon", "PICT Pune"],
  ["Win", "Dashboard Competition 2024", "COEP Pune"],
];

const BUTTONS = [
  ["portfolio", "hire-aj.space ↗", true],
  ["email", "Email me"],
  ["linkedin", "LinkedIn ↗"],
  ["x", "X ↗"],
  ["call", "Book a call ↗"],
  ["resume", "Résumé ↗"],
];

// ───────────────────────── Static sheets ─────────────────────────

function header(t) {
  const H = 540;
  const L = 44, LW = 424;
  let b = sheet(W, H, t);

  // Left: the hero copy, vertically centred.
  const titleSize = Math.min(48, Math.floor(LW / Math.max(...HERO.title.map((l) => measure(l, "D", 1, -0.03)))));
  const lead = wrap(HERO.lead, "T", 16, LW);
  const proof = HERO.proof.map(([k, v]) => [k, wrap(v, "T", 14.5, LW - 160)]);
  const proofH = proof.reduce((s, [, v]) => s + 24 + v.length * 21, 0);
  const contentH = 18 + 22 + HERO.title.length * titleSize * 1.04 + 20 + lead.length * 25 + 22 + proofH + 40;
  let y = (H - contentH) / 2 + 12;

  b += label(L, y, HERO.kicker, t.muted);
  y += 22;
  for (const line of HERO.title) {
    y += titleSize * 1.04;
    b += text(L, y, line, "D", titleSize, t.ink, { ls: -0.03 });
  }
  y += 20;
  for (const line of lead) {
    y += 25;
    b += text(L, y, line, "T", 16, t.ink2);
  }
  y += 22;
  for (const [k, v] of proof) {
    b += `<path d="M${L} ${y + 0.5}H${L + LW}" stroke="${t.line}"/>`;
    b += text(L, y + 24, k, "TM", 14.5, t.ink);
    v.forEach((line, i) => (b += text(L + 160, y + 24 + i * 21, line, "T", 14.5, t.muted)));
    y += 24 + v.length * 21;
  }
  b += `<path d="M${L} ${y + 8.5}H${L + LW}" stroke="${t.line}"/>`;
  b += label(L, y + 40, "hire-aj.space ↗", t.accent);

  // Right: the portrait and its title block.
  const px = 516, py = 46, pw = 256, ph = 286;
  const photo = read("assets/photo.webp").toString("base64");
  b += `<rect x="${px + 0.5}" y="${py + 0.5}" width="${pw - 1}" height="${ph}" fill="${t.node}" stroke="${t.line2}"/>`;
  b += `<clipPath id="pc"><rect x="${px}" y="${py}" width="${pw}" height="${ph}"/></clipPath>`;
  b += `<image clip-path="url(#pc)" href="data:image/webp;base64,${photo}" x="${px + 16}" y="${py + 16}" width="${pw - 32}" height="${(pw - 32) * 1.25}" preserveAspectRatio="xMidYMin slice"/>`;
  b += crops(px, py, pw, ph + 1, t.ink, 14, 7);
  const dx = px + pw + 24;
  b += `<path d="M${dx + 0.5} ${py}V${py + ph}M${dx - 4} ${py + 0.5}H${dx + 5}M${dx - 4} ${py + ph - 0.5}H${dx + 5}" stroke="${t.line}"/>`;
  b += `<path d="M${dx - 4} ${py + 0.5}H${dx + 5}M${dx - 4} ${py + ph - 0.5}H${dx + 5}" stroke="${t.ink}"/>`;
  const cy = py + ph / 2;
  b += `<g transform="rotate(-90 ${dx} ${cy})"><rect x="${dx - 46}" y="${cy - 9}" width="92" height="18" fill="${t.paper}"/>${label(dx, cy + 4, "Scale 1 : 1", t.muted, { size: 11, anchor: "middle" })}</g>`;

  const ty = py + ph + 1, rh = 28, kw = 90;
  const rows = HERO.block.length + 1;
  b += `<rect x="${px + 0.5}" y="${ty + 0.5}" width="${pw - 1}" height="${rows * rh}" fill="${t.paper}" stroke="${t.ink}"/>`;
  HERO.block.forEach(([k, v, live], i) => {
    const yy = ty + i * rh;
    if (i) b += `<path d="M${px + 1} ${yy + 0.5}H${px + pw - 1}" stroke="${t.line}"/>`;
    b += label(px + 11, yy + 18.5, k, t.muted, { size: 10.5 });
    let vx = px + kw + 11;
    if (live) {
      b += `<circle class="pulse" cx="${vx + 3.5}" cy="${yy + 14}" r="3.5" fill="${t.accent}"/>`;
      vx += 13;
    }
    b += text(vx, yy + 18.5, v, "TM", 13.5, t.ink);
  });
  b += `<path d="M${px + kw + 0.5} ${ty + 1}V${ty + (rows - 1) * rh}" stroke="${t.line}"/>`;
  const sy = ty + (rows - 1) * rh;
  b += `<path d="M${px + 1} ${sy + 0.5}H${px + pw - 1}M${px + pw / 2 + 0.5} ${sy}V${sy + rh}" stroke="${t.line}"/>`;
  b += label(px + 11, sy + 18.5, "Sheet", t.muted, { size: 10.5 }) + text(px + 66, sy + 18.5, "00 of 06", "M", 12.5, t.ink);
  b += label(px + pw / 2 + 11, sy + 18.5, "Rev", t.muted, { size: 10.5 }) + text(px + pw / 2 + 50, sy + 18.5, REV, "M", 12.5, t.ink);

  return doc(W, H, b, `.pulse{animation:p 2.4s ease-in-out infinite}@keyframes p{50%{opacity:.25}}${reduced}`);
}

function sectionHead([n, name, title], t) {
  const H = 92;
  let b = label(2, 22, `${n}  ${name}`, t.accent, { size: 12.5 });
  b += label(W - 2, 22, `Sheet ${n} of 06`, t.muted, { size: 11, anchor: "end" });
  b += text(0, 62, title, "D", 31, t.ink, { ls: -0.025 });
  b += `<path d="M0 82.5H${W}" stroke="${t.line}"/><path d="M.5 77V88M${W - 0.5} 77V88" stroke="${t.ink}"/>`;
  return doc(W, H, b);
}

function experience(t) {
  const X = { rev: 30, when: 68, desc: 190, pts: 556 };
  const descW = X.pts - X.desc - 30, ptsW = W - X.pts - 28;
  const rows = EXPERIENCE.map((e) => {
    const sum = wrap(e.summary, "T", 14, descW);
    const pts = (e.points ?? []).map(([m, k]) => [m, wrap(k, "T", 13.5, ptsW - 86)]);
    const left = 24 + 20 + sum.length * 21 + 4;
    const right = e.points ? pts.reduce((s, [, k]) => s + 4 + k.length * 19, 0) + 2 : 24;
    return { e, sum, pts, h: Math.max(left, right) + 22 };
  });
  const top = 64;
  const H = top + rows.reduce((s, x) => s + x.h, 0) + 20;
  let b = sheet(W, H, t);
  b += label(X.rev - 2, 48, "Rev", t.muted, { size: 11 });
  b += label(X.when, 48, "Date", t.muted, { size: 11 });
  b += label(X.desc, 48, "Change", t.muted, { size: 11 });
  b += label(X.pts, 48, "Measured", t.muted, { size: 11 });
  b += `<path d="M28 ${top - 0.5}H${W - 28}" stroke="${t.ink}"/>`;

  let y = top;
  rows.forEach(({ e, sum, pts, h }, i) => {
    if (i) b += `<path d="M28 ${y + 0.5}H${W - 28}" stroke="${t.line2}"/>`;
    const c = e.current ? t.accent : t.ink;
    b += `<circle cx="${X.rev + 11}" cy="${y + 30}" r="12.5" stroke="${c}" ${e.current ? `fill="${t.accentSoft}"` : ""}/>`;
    b += text(X.rev + 11, y + 35, e.rev, "MM", 13, c, { anchor: "middle" });
    b += text(X.when, y + 35, e.when, "M", 12.5, e.current ? t.accent : t.muted);
    b += text(X.desc, y + 36, e.role, "TM", 16.5, t.ink);
    b += label(X.desc + measure(e.role, "TM", 16.5) + 10, y + 35, `· ${e.org}`, t.accent, { size: 11.5 });
    sum.forEach((line, j) => (b += text(X.desc, y + 60 + j * 21, line, "T", 14, t.ink2)));
    let py = y + 36;
    if (e.points) {
      for (const [m, k] of pts) {
        b += text(X.pts, py, m, "D", 16, t.accent, { ls: -0.02 });
        k.forEach((line, j) => (b += text(X.pts + 86, py + j * 19, line, "T", 13.5, t.ink2)));
        py += 4 + k.length * 19;
      }
    } else {
      b += label(X.pts, py - 1, e.tags.join(" · "), t.muted, { size: 11 });
    }
    y += h;
  });
  return doc(W, H, b);
}

function wins(t) {
  const cols = 3, cw = (W - 56) / cols, ch = 76, top = 28;
  const H = top + Math.ceil(WINS.length / cols) * ch + 28;
  let b = sheet(W, H, t);
  WINS.forEach(([place, event, where], i) => {
    const x = 28 + (i % cols) * cw, y = top + Math.floor(i / cols) * ch;
    if (i % cols) b += `<path d="M${x + 0.5} ${y + 14}V${y + ch - 14}" stroke="${t.line2}"/>`;
    if (i >= cols) b += `<path d="M${x + 12} ${y + 0.5}H${x + cw - 12}" stroke="${t.line2}"/>`;
    const top3 = place !== "Win";
    b += text(x + 18, y + 47, place, "D", top3 ? 26 : 19, top3 ? t.accent : t.ink, { ls: -0.03 });
    const ex = x + 80;
    b += text(ex, y + 34, event, "TM", measure(event, "TM", 14.5) > cw - 96 ? 13 : 14.5, t.ink);
    b += label(ex, y + 54, where, t.muted, { size: 10.5 });
  });
  return doc(W, H, b);
}

function button(lbl, primary, t) {
  const size = 15, h = 46;
  const w = Math.ceil(measure(lbl, "TM", size) + 44);
  const fill = primary ? t.ink : t.paper;
  let b = `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="3" fill="${fill}" stroke="${t.ink}"/>`;
  b += text(w / 2, h / 2 + 5.2, lbl, "TM", size, primary ? t.onInk : t.ink, { anchor: "middle" });
  return doc(w, h, b);
}

// ───────────────────────── Live stats ─────────────────────────

async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `bearer ${process.env.GITHUB_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
}

async function fetchStats() {
  const base = await gql(
    `query($login:String!){user(login:$login){createdAt followers{totalCount} pullRequests{totalCount}
      repositories(ownerAffiliations:OWNER,privacy:PUBLIC){totalCount} contributionsCollection{contributionYears}}}`,
    { login: USER },
  );
  const u = base.user;
  const now = new Date();
  const years = u.contributionsCollection.contributionYears.sort();
  const parts = years.map((y) => {
    const to = y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`;
    return `y${y}:contributionsCollection(from:"${y}-01-01T00:00:00Z",to:"${to}"){totalCommitContributions
      contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}`;
  });
  const cal = (await gql(`query($login:String!){user(login:$login){${parts.join(" ")}}}`, { login: USER })).user;

  const days = [];
  let total = 0, commits = 0;
  for (const y of years) {
    const c = cal[`y${y}`];
    total += c.contributionCalendar.totalContributions;
    commits += c.totalCommitContributions;
    for (const w of c.contributionCalendar.weeks) for (const d of w.contributionDays) days.push([d.date, d.contributionCount]);
  }
  days.sort((a, b) => a[0].localeCompare(b[0]));

  // Longest run anywhere, and the run ending today (or yesterday, so a quiet morning doesn't reset it).
  let longest = { n: 0 }, run = { n: 0 };
  for (const [date, n] of days) {
    if (n > 0) {
      run = run.n ? { ...run, n: run.n + 1, end: date } : { n: 1, start: date, end: date };
      if (run.n > longest.n) longest = { ...run };
    } else run = { n: 0 };
  }
  let i = days.length - 1;
  if (days[i][1] === 0) i--;
  const current = { n: 0, end: days[i][0] };
  for (; i >= 0 && days[i][1] > 0; i--) (current.n++, (current.start = days[i][0]));

  return {
    created: u.createdAt, followers: u.followers.totalCount, prs: u.pullRequests.totalCount,
    repos: u.repositories.totalCount, total, commits, days, longest, current, today: days[days.length - 1][0],
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (iso, year = false) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${MONTHS[+m - 1]} ${+d}${year ? ` ${y}` : ""}`;
};
const range = (s) => (s.n ? (s.start === s.end ? fmt(s.start, true) : `${fmt(s.start)} – ${fmt(s.end, true)}`) : "Start one today");
const num = (n) => n.toLocaleString("en-US");

function caption(H, fig, title, s, t) {
  return (
    label(28, H - 22, `Fig. ${fig}`, t.accent, { size: 11 }) +
    text(28 + measure(`FIG. ${fig}`, "MM", 11, 0.08) + 12, H - 22, title, "T", 13, t.muted) +
    label(W - 28, H - 22, `Updated ${s.today}`, t.muted, { size: 10.5, anchor: "end" })
  );
}

function streak(s, t) {
  const H = 222, cw = (W - 56) / 3, cy = 96;
  let b = sheet(W, H, t);
  b += `<path d="M${28 + cw + 0.5} 40V${H - 58}M${28 + 2 * cw + 0.5} 40V${H - 58}" stroke="${t.line}"/>`;
  b += `<path d="M28 ${H - 44.5}H${W - 28}" stroke="${t.line2}"/>`;
  const side = (x, k, v, sub) =>
    label(x, cy - 34, k, t.muted, { size: 11, anchor: "middle" }) +
    text(x, cy + 16, v, "D", 38, t.ink, { anchor: "middle", ls: -0.03 }) +
    label(x, cy + 44, sub, t.muted, { size: 10.5, anchor: "middle" });
  b += side(28 + cw / 2, "Total contributions", num(s.total), `${fmt(s.created, true)} – today`);
  b += side(28 + 2.5 * cw, "Longest streak", `${s.longest.n} days`, range(s.longest));

  // The current streak sits in a detail callout, the bubble a drawing uses to point at one part.
  const mx = W / 2;
  b += `<circle cx="${mx}" cy="${cy}" r="50" stroke="${t.accent}" stroke-width="1.5" fill="${t.accentSoft}"/>`;
  b += `<circle class="ring" cx="${mx}" cy="${cy}" r="58" stroke="${t.accent}" stroke-dasharray="3 5" opacity=".7"/>`;
  b += `<path d="M${mx} ${cy - 66}V${cy - 56}M${mx} ${cy + 56}V${cy + 66}M${mx - 66} ${cy}H${mx - 56}M${mx + 56} ${cy}H${mx + 66}" stroke="${t.accent}"/>`;
  b += text(mx, cy + 8, s.current.n, "D", 40, t.accent, { anchor: "middle", ls: -0.03 });
  b += label(mx, cy + 26, s.current.n === 1 ? "day" : "days", t.accent, { size: 10.5, anchor: "middle" });
  b += label(mx - 86, cy - 4, "Current", t.muted, { size: 11, anchor: "end" });
  b += label(mx - 86, cy + 12, "streak", t.muted, { size: 11, anchor: "end" });
  b += label(mx + 86, cy + 4, range(s.current), t.muted, { size: 10.5 });
  b += caption(H, 1, "Contribution streaks, redrawn every day.", s, t);
  return doc(W, H, b, `.ring{transform-origin:${mx}px ${cy}px;animation:spin 24s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}${reduced}`);
}

function activity(s, t) {
  const N = 60, H = 330;
  const days = s.days.slice(-N);
  const x0 = 64, x1 = W - 36, y0 = 72, y1 = H - 86;
  const max = Math.max(4, ...days.map((d) => d[1]));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const X = (i) => x0 + (i / (N - 1)) * (x1 - x0);
  const Y = (v) => y1 - (v / top) * (y1 - y0);
  const sum = days.reduce((a, d) => a + d[1], 0);

  let b = sheet(W, H, t);
  b += `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="${t.accent}" stroke-opacity=".4"/></pattern></defs>`;
  b += label(28, 44, `Contributions · last ${N} days`, t.muted, { size: 11 });
  b += label(W - 28, 44, `${num(sum)} in ${N} days`, t.accent, { size: 11, anchor: "end" });
  for (let k = 0; k <= 4; k++) {
    const yy = Math.round(Y(k * step)) + 0.5;
    b += `<path d="M${x0} ${yy}H${x1}" stroke="${k ? t.line2 : t.line}" ${k ? 'stroke-dasharray="2 4"' : ""}/>`;
    b += text(x0 - 12, yy + 4, k * step, "M", 11, t.muted, { anchor: "end" });
  }
  days.forEach(([d], i) => {
    if ((N - 1 - i) % 10) return;
    const xx = Math.round(X(i)) + 0.5;
    b += `<path d="M${xx} ${y1}V${y1 + 6}" stroke="${t.line}"/>`;
    b += label(xx, y1 + 22, fmt(d), t.muted, { size: 10.5, anchor: "middle" });
  });
  const pts = days.map((d, i) => `${r(X(i))} ${r(Y(d[1]))}`);
  b += `<path d="M${pts.join("L")}L${x1} ${y1}L${x0} ${y1}Z" fill="url(#hatch)"/>`;
  b += `<path class="draw" pathLength="1" d="M${pts.join("L")}" stroke="${t.ink}" stroke-width="1.75" stroke-linejoin="round"/>`;
  days.forEach(([, n], i) => n && (b += `<circle cx="${r(X(i))}" cy="${r(Y(n))}" r="2.6" fill="${t.paper}" stroke="${t.accent}" stroke-width="1.5"/>`));

  // A leader line to the busiest day.
  const bi = days.reduce((m, d, i) => (d[1] > days[m][1] ? i : m), 0);
  if (days[bi][1]) {
    const bx = X(bi), by = Y(days[bi][1]);
    const left = bx > W - 200;
    const tx = left ? bx - 40 : bx + 40, ty = Math.max(y0 - 10, by - 22);
    b += `<path d="M${r(bx)} ${r(by)}L${r(tx)} ${r(ty)}H${r(left ? tx - 8 : tx + 8)}" stroke="${t.accent}"/>`;
    b += label(left ? tx - 12 : tx + 12, ty + 4, `${days[bi][1]} on ${fmt(days[bi][0])}`, t.accent, { size: 11, anchor: left ? "end" : "start" });
  }
  b += caption(H, 2, "Daily contributions, hatched like a section cut.", s, t);
  return doc(W, H, b, `.draw{stroke-dasharray:1;animation:d 2.2s ease-out backwards}@keyframes d{from{stroke-dashoffset:1}}${reduced}`);
}

function trophies(s, t) {
  const since = new Date(s.created).getUTCFullYear();
  const items = [
    [num(s.total), "Contributions", "all time"],
    [num(s.commits), "Commits", "public repos"],
    [num(s.prs), "Pull requests", "opened"],
    [num(s.repos), "Repositories", "public"],
    [`${s.longest.n}d`, "Best streak", "in a row"],
    [String(since), "Building since", `${new Date().getUTCFullYear() - since}+ years`],
  ];
  const H = 252, cw = (W - 56) / items.length, cy = 94;
  const tilt = [-7, 4, -3, 6, -5, 3];
  let b = sheet(W, H, t);
  items.forEach(([v, k, sub], i) => {
    const cx = 28 + cw * (i + 0.5);
    const size = v.length > 4 ? 21 : 26;
    b += `<g transform="rotate(${tilt[i]} ${cx} ${cy})" opacity=".92">`;
    b += `<circle cx="${cx}" cy="${cy}" r="48" stroke="${t.accent}" stroke-width="2"/>`;
    b += `<circle cx="${cx}" cy="${cy}" r="41" stroke="${t.accent}" stroke-width=".75"/>`;
    b += `<path d="M${cx - 26} ${cy - 16.5}H${cx + 26}M${cx - 26} ${cy + 18.5}H${cx + 26}" stroke="${t.accent}" stroke-width=".75"/>`;
    b += label(cx, cy - 23, "No.", t.accent, { size: 8.5, anchor: "middle" });
    b += text(cx, cy + size * 0.36, v, "D", size, t.accent, { anchor: "middle", ls: -0.03 });
    b += label(cx, cy + 31, "aj", t.accent, { size: 8.5, anchor: "middle" });
    b += `</g>`;
    b += text(cx, cy + 78, k, "TM", 14, t.ink, { anchor: "middle" });
    b += label(cx, cy + 97, sub, t.muted, { size: 10.5, anchor: "middle" });
  });
  b += caption(H, 3, "Inspection stamps, pulled from the GitHub API.", s, t);
  return doc(W, H, b);
}

// ───────────────────────── Main ─────────────────────────

const now = new Date();
const REV = `${now.getUTCFullYear()}.${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
const out = join(ROOT, process.argv[2] ?? "dist");
mkdirSync(out, { recursive: true });
const write = (name, fn) => {
  for (const [k, t] of Object.entries(THEMES)) writeFileSync(join(out, `${name}-${k}.svg`), fn(t));
  console.log(`drew ${name}`);
};

write("header", header);
for (const [k, v] of Object.entries(SECTIONS)) write(`head-${k}`, (t) => sectionHead(v, t));
write("experience", experience);
write("wins", wins);
for (const [k, lbl, primary] of BUTTONS) write(`btn-${k}`, (t) => button(lbl, primary, t));

if (process.env.GITHUB_TOKEN) {
  const s = await fetchStats();
  console.log(`total ${s.total} · current streak ${s.current.n} · longest ${s.longest.n}`);
  write("streak", (t) => streak(s, t));
  write("activity", (t) => activity(s, t));
  write("trophies", (t) => trophies(s, t));
} else {
  console.warn("No GITHUB_TOKEN, so the live stats were skipped.");
}
