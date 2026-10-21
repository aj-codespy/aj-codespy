// Draws every image on the profile README as a sheet from the hire-aj.space drawing set.
//
//   GITHUB_TOKEN=... node scripts/build.mjs [outDir=dist]
//
// The GitHub Action runs this every day and publishes dist/ to the `output` branch, which the
// README reads from. Edit the content below and push; the Action redraws everything.
// Without a token only the static sheets are drawn (header, sections, experience, buttons).
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
};

const SECTIONS = {
  experience: ["01", "Experience", "Where I’ve worked."],
  stack: ["02", "Stack", "Tools I work with."],
  activity: ["03", "Activity", "Contribution record."],
  contact: ["04", "Contact", "Let’s build something."],
};
const SHEETS = String(Object.keys(SECTIONS).length).padStart(2, "0");

// Newest first: [position, company, when].
const EXPERIENCE = [
  ["SDE, AI", "Voiceqube", "Now"],
  ["AI Engineering Intern", "Aligned Automation", "Jan – Apr 2026"],
  ["Founder & solo engineer", "getPlaced", "2026"],
  ["ML Intern", "RHV Group", "Aug – Nov 2024"],
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
  const L = 44, pw = 220, ph = 246, px = W - 74 - pw;
  const LW = px - L - 40;

  // Left: the hero copy, vertically centred; the sheet is as tall as the taller column.
  const titleSize = Math.min(48, Math.floor(LW / Math.max(...HERO.title.map((l) => measure(l, "D", 1, -0.03)))));
  const lead = wrap(HERO.lead, "T", 16, LW);
  const contentH = 18 + 22 + HERO.title.length * titleSize * 1.04 + 20 + lead.length * 25 + 22 + 40;
  const H = Math.ceil(Math.max(contentH + 64, ph + 92));
  let b = sheet(W, H, t);
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
  b += `<path d="M${L} ${y + 8.5}H${L + LW}" stroke="${t.line}"/>`;
  b += label(L, y + 40, "hire-aj.space ↗", t.accent);

  // Right: the portrait.
  const py = Math.round((H - ph) / 2);
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

  return doc(W, H, b);
}

function sectionHead([n, name, title], t) {
  const H = 92;
  let b = label(2, 22, `${n}  ${name}`, t.accent, { size: 12.5 });
  b += label(W - 2, 22, `Sheet ${n} of ${SHEETS}`, t.muted, { size: 11, anchor: "end" });
  b += text(0, 62, title, "D", 31, t.ink, { ls: -0.025 });
  b += `<path d="M0 82.5H${W}" stroke="${t.line}"/><path d="M.5 77V88M${W - 0.5} 77V88" stroke="${t.ink}"/>`;
  return doc(W, H, b);
}

function experience(t) {
  const X = { rev: 30, role: 76, org: 420 }, top = 64, rh = 54;
  const H = top + EXPERIENCE.length * rh + 26;
  let b = sheet(W, H, t);
  b += label(X.rev - 2, 48, "Rev", t.muted, { size: 11 });
  b += label(X.role, 48, "Position", t.muted, { size: 11 });
  b += label(X.org, 48, "Company", t.muted, { size: 11 });
  b += label(W - 28, 48, "When", t.muted, { size: 11, anchor: "end" });
  b += `<path d="M28 ${top - 0.5}H${W - 28}M${X.org - 20.5} ${top}V${top + EXPERIENCE.length * rh}" stroke="${t.line}"/>`;
  b += `<path d="M28 ${top - 0.5}H${W - 28}" stroke="${t.ink}"/>`;
  EXPERIENCE.forEach(([role, org, when], i) => {
    const y = top + i * rh, mid = y + rh / 2;
    const now = when === "Now";
    const c = now ? t.accent : t.ink;
    if (i) b += `<path d="M28 ${y + 0.5}H${W - 28}" stroke="${t.line2}"/>`;
    b += `<circle cx="${X.rev + 11}" cy="${mid}" r="12.5" stroke="${c}"${now ? ` fill="${t.accentSoft}"` : ""}/>`;
    b += text(X.rev + 11, mid + 4.5, String.fromCharCode(64 + EXPERIENCE.length - i), "MM", 13, c, { anchor: "middle" });
    b += text(X.role, mid + 6, role, "TM", 17, t.ink);
    b += text(X.org, mid + 6, org, "D", 17, t.ink, { ls: -0.01 });
    if (now) b += `<circle class="pulse" cx="${W - 28 - measure("NOW", "MM", 12, 0.08) - 12}" cy="${mid}" r="3.5" fill="${t.accent}"/>`;
    b += label(W - 28, mid + 4.5, when, now ? t.accent : t.muted, { anchor: "end" });
  });
  return doc(W, H, b, `.pulse{animation:p 2.4s ease-in-out infinite}@keyframes p{50%{opacity:.25}}${reduced}`);
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

const num = (n) => n.toLocaleString("en-US");

function caption(H, fig, title, s, t) {
  return (
    label(28, H - 22, `Fig. ${fig}`, t.accent, { size: 11 }) +
    text(28 + measure(`FIG. ${fig}`, "MM", 11, 0.08) + 12, H - 22, title, "T", 13, t.muted) +
    label(W - 28, H - 22, `Updated ${s.today}`, t.muted, { size: 10.5, anchor: "end" })
  );
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
  const H = 188, cw = (W - 56) / items.length, cy = 66;
  const tilt = [-7, 4, -3, 6, -5, 3];
  let b = sheet(W, H, t);
  items.forEach(([v, k, sub], i) => {
    const cx = 28 + cw * (i + 0.5);
    const size = v.length > 4 ? 15 : 19;
    b += `<g transform="rotate(${tilt[i]} ${cx} ${cy})" opacity=".92">`;
    b += `<circle cx="${cx}" cy="${cy}" r="34" stroke="${t.accent}" stroke-width="1.75"/>`;
    b += `<circle cx="${cx}" cy="${cy}" r="29" stroke="${t.accent}" stroke-width=".75"/>`;
    b += `<path d="M${cx - 19} ${cy - 12}H${cx + 19}M${cx - 19} ${cy + 13}H${cx + 19}" stroke="${t.accent}" stroke-width=".75"/>`;
    b += label(cx, cy - 16.5, "No.", t.accent, { size: 7.5, anchor: "middle" });
    b += text(cx, cy + size * 0.36, v, "D", size, t.accent, { anchor: "middle", ls: -0.03 });
    b += label(cx, cy + 23, "aj", t.accent, { size: 7.5, anchor: "middle" });
    b += `</g>`;
    b += text(cx, cy + 56, k, "TM", 13, t.ink, { anchor: "middle" });
    b += label(cx, cy + 72, sub, t.muted, { size: 10, anchor: "middle" });
  });
  b += caption(H, 1, "Inspection stamps, pulled from the GitHub API.", s, t);
  return doc(W, H, b);
}

// ───────────────────────── Main ─────────────────────────

const out =join(ROOT, process.argv[2] ?? "dist");
mkdirSync(out, { recursive: true });
const write = (name, fn) => {
  for (const [k, t] of Object.entries(THEMES)) writeFileSync(join(out, `${name}-${k}.svg`), fn(t));
  console.log(`drew ${name}`);
};

write("header", header);
for (const [k, v] of Object.entries(SECTIONS)) write(`head-${k}`, (t) => sectionHead(v, t));
write("experience", experience);
for (const [k, lbl, primary] of BUTTONS) write(`btn-${k}`, (t) => button(lbl, primary, t));

if (process.env.GITHUB_TOKEN) {
  const s = await fetchStats();
  console.log(`total ${s.total} · current streak ${s.current.n} · longest ${s.longest.n}`);
  write("trophies", (t) => trophies(s, t));
} else {
  console.warn("No GITHUB_TOKEN, so the live stats were skipped.");
}
