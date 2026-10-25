#!/usr/bin/env node
/*
 * PICO-67 site builder
 * ---------------------------------------------------------
 * Reads games.json and writes:
 *   index.html            -> game grid
 *   games/<slug>.html     -> one page per game (iframe'd cart)
 *   404.html
 *
 * Optional per-game fields in games.json:
 *   "color" : accent colour (any CSS colour, use PICO-8 hex for best results)
 *   "tags"  : ["racing", "arcade"]
 *   "thumb" : path to a thumbnail, relative to this file (e.g. "thumbs/foo.png")
 *
 * Usage:  node build.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PAGES_DIR = "games";

/* PICO-8 palette, used as the per-game accent rotation */
const PALETTE = [
  "#29adff", // blue
  "#ff004d", // red
  "#ffec27", // yellow
  "#008751", // green
  "#ff77a8", // pink
  "#ffa300", // orange
  "#83769c", // purple
  "#ffccaa", // peach
];

const readGames = () => {
  const raw = fs.readFileSync(path.join(ROOT, "games.json"), "utf8");
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) throw new Error("games.json must contain an array of games");
  return list;
};

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/* Resolve the folder that holds <name>.html inside html/ */
function resolveHtmlDir(htmlFile) {
  const base = path.basename(htmlFile);
  const dir = path.join(ROOT, "html", base.replace(/\.html?$/i, ""));
  if (fs.existsSync(path.join(dir, base))) return base.replace(/\.html?$/i, "");
  // fall back: search html/ for the file
  try {
    for (const entry of fs.readdirSync(path.join(ROOT, "html"))) {
      if (fs.existsSync(path.join(ROOT, "html", entry, base))) return entry;
    }
  } catch (_) {}
  return base.replace(/\.html?$/i, "");
}

/* Match a file that actually exists on disk (games.json may use _ where the file uses -) */
function resolveIn(dir, name) {
  if (!name) return null;
  const base = path.basename(name);
  const full = path.join(ROOT, dir);
  if (fs.existsSync(path.join(full, base))) return base;
  const stem = (f) => path.basename(f, path.extname(f)).replace(/[-_]/g, "").toLowerCase();
  try {
    const files = fs.readdirSync(full);
    const lower = new Map(files.map((f) => [f.toLowerCase(), f]));
    for (const v of [base.replace(/_/g, "-"), base.replace(/-/g, "_")]) {
      const hit = lower.get(v.toLowerCase());
      if (hit) return hit;
    }
    const want = stem(base);
    const fuzzy = files.find((f) => stem(f) === want);
    if (fuzzy) return fuzzy;
  } catch (_) {}
  return null;
}

const resolveCart = (cart) => resolveIn("carts", cart);
const resolveThumb = (thumb) => resolveIn("imgs", thumb);

/* ---------------- shared chrome ---------------- */

const logoMark = `<span class="logo-mark" aria-hidden="true">
  <i class="on"></i><i></i><i class="on"></i>
  <i></i><i class="on"></i><i></i>
  <i class="on"></i><i></i><i class="on"></i>
</span>`;

const searchForm = (prefix) => `<form class="search" role="search" action="${prefix}index.html" data-index="${prefix}index.html">
      <span class="search-mark" aria-hidden="true"></span>
      <input id="site-search" name="q" type="search" placeholder="Search carts" autocomplete="off" spellcheck="false" aria-label="Search games">
      <kbd class="search-key" aria-hidden="true">/</kbd>
    </form>`;

function header(prefix, rightSlot) {
  return `<header class="site-header">
  <a class="logo" href="${prefix}index.html" aria-label="PICO-67 home">
    ${logoMark}
    <span class="logo-text">PICO-<span class="logo-num">67</span></span>
  </a>
  <nav class="header-nav">${rightSlot}${searchForm(prefix)}</nav>
</header>`;
}

function footer(prefix, count) {
  return `<footer class="site-footer">
  <span>PICO-67 // ${count} cartridges in the vault</span>
  <span>Built from <a href="${prefix}games.json">games.json</a> &mdash; powered by PICO-8</span>
</footer>`;
}

/* mouse-only carts get a red flag everywhere */
const isMouseOnly = (g) => g.isMouseOnly === true;

/* staff-pick carts get the yellow tag + the crazy animated border */
const isChoice = (g) => g.developersChoice === true;

const mouseIcon = `<svg class="alert-icon" width="26" height="30" viewBox="0 0 6 7" shape-rendering="crispEdges" aria-hidden="true">
        <rect x="2" y="0" width="2" height="1" fill="#fff1e8"></rect>
        <rect x="1" y="1" width="4" height="1" fill="#fff1e8"></rect>
        <rect x="0" y="2" width="6" height="3" fill="#fff1e8"></rect>
        <rect x="1" y="5" width="4" height="1" fill="#fff1e8"></rect>
        <rect x="2" y="6" width="2" height="1" fill="#fff1e8"></rect>
        <rect x="2" y="2" width="1" height="2" fill="#ff004d"></rect>
      </svg>`;

/* ---------------- index page ---------------- */

function card(g, i, prefix) {
  const accent = g.color || PALETTE[i % PALETTE.length];
  const num = String(i + 1).padStart(2, "0");
  const thumb = g.thumbFile
    ? `<span class="thumb-frame" data-thumb>
          <img src="${prefix}imgs/${encodeURIComponent(g.thumbFile)}" alt="${esc(g.name)} screenshot" loading="lazy" decoding="async">
          <span class="thumb-cue">&#9654; hover to play</span>
        </span>
        <span class="card-num-badge">${num}</span>`
    : `<span class="card-num" aria-hidden="true">${num}</span>`;

  const haystack = [g.name, g.desc, g.dir, g.cart, g.date,
    ...(Array.isArray(g.tags) ? g.tags : []),
    isMouseOnly(g) ? "mouse only mouse required pointer" : "",
    isChoice(g) ? "developer's choice developers choice favorite featured pick" : ""]
    .join(" ").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  return `    <a class="card${isChoice(g) ? " is-choice" : ""}" data-search="${esc(haystack)}" style="--accent:${accent}" href="${prefix}${PAGES_DIR}/${g.slug}.html">
      <div class="card-thumb${g.thumbFile ? " has-thumb" : ""}">
        ${thumb}
        <span class="card-badges">
          ${isChoice(g) ? `<span class="card-badge badge-yellow">&#9733; Developer's Choice</span>` : ""}
          ${isMouseOnly(g) ? `<span class="card-badge badge-red">Mouse Required</span>` : ""}
          <span class="card-badge">PICO-8</span>
        </span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${esc(g.name)}</h3>
        <p class="card-desc">${esc(g.desc)}</p>
        <div class="card-foot">
          <span class="card-date">${esc(g.date)}</span>
          <span class="card-play">Play &#9654;</span>
        </div>
      </div>
    </a>`;
}

function buildIndex(games) {
  const prefix = "";
  const newest = games.reduce((a, g) => (Date.parse(g.date) > Date.parse(a.date) ? g : a), games[0]);

  const swatches = ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8",
    "#ff004d", "#ffa300", "#ffec27", "#29adff", "#83769c", "#ff77a8", "#ffccaa"]
    .map((c) => `<i style="background:${c}"></i>`)
    .join("\n      ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PICO-67 // PICO-8 game vault</title>
<meta name="description" content="PICO-67 — a shelf of PICO-8 cartridges, playable in the browser.">
<link rel="icon" href="assets/favicon.svg">
<link rel="stylesheet" href="assets/style.css">
</head>
<body class="page-home">
<canvas id="leaves" aria-hidden="true"></canvas>
${header(prefix, `<span class="chip chip-pink">${String(games.length).padStart(2, "0")} carts</span>`)}

<main class="wrap">
  <section class="hero">
    <div class="hero-main">
      <h1>PICO-8 games,<br><mark>no cartridge blowin' required</mark></h1>
      <p>Every cart on this site boots straight in your browser. Pick one below, hit the screen, and the PICO-8 shell takes it from there.</p>
      <a class="btn" href="#games">&#9654; Start playing</a>
    </div>
    <div class="hero-side">
      <div class="stat-row">
        <div>
          <div class="stat-num">${String(games.length).padStart(2, "0")}</div>
          <div class="stat-lbl">Cartridges</div>
        </div>
        <div>
          <div class="stat-num">64</div>
          <div class="stat-lbl">x 64 px</div>
        </div>
      </div>
      <div class="stat-lbl">Latest drop</div>
      <a class="chip chip-green" href="${prefix}${PAGES_DIR}/${newest.slug}.html">${esc(newest.name)}</a>
      <div class="pal-strip" aria-hidden="true">
      ${swatches}
      </div>
    </div>
  </section>

  <div class="section-head" id="games">
    <h2>The shelf</h2>
    <span class="rule"></span>
    <span class="chip" id="result-count">${String(games.length).padStart(2, "0")} carts</span>
  </div>

  <section class="game-grid" id="grid">
${games.map((g, i) => card(g, i, prefix)).join("\n")}
  </section>

  <div class="panel no-results" id="no-results" hidden>
    <h2>No carts match</h2>
    <p>Nothing on the shelf answers to <strong id="no-results-q"></strong>. Try a shorter word, or clear the box.</p>
    <p><a class="btn" href="index.html" id="clear-search">&#8630; Show everything</a></p>
  </div>
</main>

${footer(prefix, games.length)}
<script src="assets/leaves.js" defer></script>
<script src="assets/thumbs.js" defer></script>
<script src="assets/search.js" defer></script>
</body>
</html>
`;
}

/* ---------------- game page ---------------- */

function buildGame(g, i, games) {
  const prefix = "../";
  const accent = g.color || PALETTE[i % PALETTE.length];
  const page = (g) => `${prefix}${PAGES_DIR}/${g.slug}.html`;
  const prev = games[(i - 1 + games.length) % games.length];
  const next = games[(i + 1) % games.length];
  const shellPath = `html/${g.dir}/${g.html}`;
  const cartPath = g.cartFile ? `carts/${g.cartFile}` : null;
  const tags = Array.isArray(g.tags) && g.tags.length
    ? `<div class="tags">${g.tags.map((t) => `<span class="chip chip-blue">${esc(t)}</span>`).join("")}</div>`
    : "";
  const mouseOnly = isMouseOnly(g);
  const choice = isChoice(g);
  const choiceChip = choice ? `<span class="chip chip-choice">&#9733; Developer's Choice</span>` : "";
  const mouseChip = mouseOnly ? `<span class="chip chip-red chip-warn">&#9679; Mouse Required</span>` : "";
  const mouseAlert = mouseOnly
    ? `  <div class="alert">
    ${mouseIcon}
    <span><strong>Mouse required.</strong> This cart reads the pointer, so it needs a mouse or trackpad &mdash; keyboard and gamepad will not drive it.</span>
  </div>
`
    : "";
  const controls = mouseOnly
    ? `<li><kbd>Mouse</kbd> aim &amp; move</li>
        <li><kbd>LMB</kbd> click / select</li>
        <li><kbd>Esc</kbd> pause</li>
        <li><kbd>Ctrl+R</kbd> restart</li>`
    : `<li><kbd>&#8592;&#8593;&#8595;&#8594;</kbd> move</li>
        <li><kbd>Z</kbd> &#9675; button</li>
        <li><kbd>X</kbd> &#10005; button</li>
        <li><kbd>Esc</kbd> pause</li>
        <li><kbd>Ctrl+R</kbd> restart</li>`;
  const consoleHint = mouseOnly ? "Boots with the mouse" : "Click screen to boot";
  const shot = g.thumbFile
    ? `    <div class="panel panel-shot">
      <h2>Capture</h2>
      <span class="thumb-frame thumb-frame-lg" data-thumb>
        <img src="${prefix}imgs/${encodeURIComponent(g.thumbFile)}" alt="${esc(g.name)} gameplay capture" loading="lazy" decoding="async">
        <span class="thumb-cue">&#9654; hover to play</span>
      </span>
      <p class="shot-note">${esc(g.thumbFile)} &mdash; holds on frame one until you hover it.</p>
    </div>
`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(g.name)} // PICO-67</title>
<meta name="description" content="${esc(g.desc)}">
<link rel="icon" href="${prefix}assets/favicon.svg">
<link rel="stylesheet" href="${prefix}assets/style.css">
<style>:root { --accent: ${accent}; }</style>
</head>
<body class="page-game">
<canvas id="leaves" aria-hidden="true"></canvas>
${header(prefix, `<a class="chip chip-dark" href="${prefix}index.html">&#9664; All games</a>
    <span class="chip">Cart ${String(i + 1).padStart(2, "0")} / ${String(games.length).padStart(2, "0")}</span>`)}

<main class="wrap">
  <div class="crumbs">
    <a class="chip" href="${prefix}index.html">&#9664; Back to shelf</a>
    ${choiceChip}
    ${mouseChip}
    <span class="chip chip-dark">${esc(g.date)}</span>
    <span class="chip chip-dark">PICO-8 cart</span>
  </div>

  <h1 class="game-title">${esc(g.name)}</h1>
  <div class="game-sub">${esc(g.cart)} &mdash; released ${esc(g.date)}</div>

  <!-- the game, dead centre -->
  <section class="console${choice ? " is-choice" : ""}">
    <div class="console-bar">
      <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="console-file">${esc(shellPath)}</span>
      <span class="console-hint">${consoleHint}</span>
    </div>
    <div class="screen">
      <iframe src="${prefix}${shellPath}"
              title="${esc(g.name)}"
              loading="lazy"
              allow="autoplay; fullscreen; gamepad; keyboard-map; xr-spatial-tracking"></iframe>
    </div>
  </section>

${mouseAlert}  <div class="game-actions">
    <a class="btn" href="${prefix}${shellPath}" target="_blank" rel="noopener">&#9974; Open fullscreen</a>
    ${cartPath ? `<a class="btn btn-ghost" href="${prefix}${cartPath}" download>&#11015; Download .p8.png</a>` : ""}
    <a class="btn btn-ghost" href="${prefix}index.html">&#9664; Shelf</a>
  </div>

  <section class="info-grid${g.thumbFile ? " has-shot" : ""}">
${shot}    <div class="panel">
      <h2>About this cart</h2>
      <p>${esc(g.desc)}</p>
      ${tags}
      <p style="margin-top:16px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;color:var(--c5)">
        Data pulled straight from games.json &mdash; edit it and rerun <code>node build.js</code>.
      </p>
    </div>
    <div class="panel">
      <h2>Controls</h2>
      <ul class="keylist">
        ${controls}
      </ul>
    </div>
  </section>

  ${games.length > 1 ? `<nav class="pager">
    <a class="prev" href="${page(prev)}">
      <span class="pager-lbl">&#9664; Previous cart</span>
      <span class="pager-name">${esc(prev.name)}</span>
    </a>
    <a class="next" href="${page(next)}">
      <span class="pager-lbl">Next cart &#9654;</span>
      <span class="pager-name">${esc(next.name)}</span>
    </a>
  </nav>` : ""}
</main>

${footer(prefix, games.length)}
<script src="${prefix}assets/leaves.js" defer></script>
<script src="${prefix}assets/thumbs.js" defer></script>
<script src="${prefix}assets/search.js" defer></script>
</body>
</html>
`;
}

/* ---------------- 404 ---------------- */

function build404(count) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 // PICO-67</title>
<link rel="icon" href="assets/favicon.svg">
<link rel="stylesheet" href="assets/style.css">
</head>
<body class="page-404">
<canvas id="leaves" aria-hidden="true"></canvas>
${header("", "")}
<main class="wrap">
  <div class="oops panel">
    <div class="big">404</div>
    <h2>Cart not found</h2>
    <p>No cartridge in that slot. The shelf has ${count} of them &mdash; go find one.</p>
    <p><a class="btn" href="index.html">&#9654; Back to the shelf</a></p>
  </div>
</main>
${footer("", count)}
<script src="assets/leaves.js" defer></script>
<script src="assets/search.js" defer></script>
</body>
</html>
`;
}

/* ---------------- main ---------------- */

function main() {
  const games = readGames();
  /* newest release first */
  games.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  const seen = new Set();

  games.forEach((g, i) => {
    if (!g.name || !g.html) throw new Error(`game #${i} is missing "name" or "html"`);
    g.slug = slugify(g.name);
    if (seen.has(g.slug)) throw new Error(`duplicate slug: ${g.slug}`);
    seen.add(g.slug);
    g.dir = resolveHtmlDir(g.html);
    g.cartFile = resolveCart(g.cart);
    g.thumbFile = resolveThumb(g.thumbnail || g.thumb);
    if ((g.thumbnail || g.thumb) && !g.thumbFile) console.warn(`  ! no thumbnail for ${g.name} (games.json says imgs/${g.thumbnail || g.thumb})`);

    const shell = path.join(ROOT, "html", g.dir, path.basename(g.html));
    if (!fs.existsSync(shell)) console.warn(`  ! no shell found for ${g.name} (looked in html/${g.dir}/)`);
    if (g.cart && !g.cartFile) console.warn(`  ! no cart image for ${g.name} (games.json says carts/${g.cart})`);
  });

  /* things sitting in the folders that games.json never mentions */
  const listedDirs = new Set(games.map((g) => g.dir));
  const listedCarts = new Set(games.map((g) => g.cartFile).filter(Boolean));
  const listedThumbs = new Set(games.map((g) => g.thumbFile).filter(Boolean));
  try {
    for (const d of fs.readdirSync(path.join(ROOT, "html")))
      if (!listedDirs.has(d)) console.warn(`  ! html/${d}/ is not listed in games.json`);
  } catch (_) {}
  try {
    for (const f of fs.readdirSync(path.join(ROOT, "carts")))
      if (!listedCarts.has(f)) console.warn(`  ! carts/${f} is not listed in games.json`);
  } catch (_) {}
  try {
    for (const f of fs.readdirSync(path.join(ROOT, "imgs")))
      if (!listedThumbs.has(f)) console.warn(`  ! imgs/${f} is not listed in games.json`);
  } catch (_) {}

  fs.mkdirSync(path.join(ROOT, PAGES_DIR), { recursive: true });

  fs.writeFileSync(path.join(ROOT, "index.html"), buildIndex(games), "utf8");
  console.log(`  wrote index.html`);

  games.forEach((g, i) => {
    fs.writeFileSync(path.join(ROOT, PAGES_DIR, `${g.slug}.html`), buildGame(g, i, games), "utf8");
    console.log(`  wrote ${PAGES_DIR}/${g.slug}.html  -> html/${g.dir}/${path.basename(g.html)}`);
  });

  fs.writeFileSync(path.join(ROOT, "404.html"), build404(games.length), "utf8");
  console.log(`  wrote 404.html`);
  console.log(`\n  ${games.length} game pages built from games.json`);
}

main();
