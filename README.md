# PICO-67

A small neobrutalist arcade shelf for your PICO-8 carts. Everything is static HTML —
no server-side code, no frameworks, no build step required to *view* it.

```
pico-67/
├── games.json              <- single source of truth for every cart
├── build.js                <- generates the pages from games.json
├── index.html              <- the shelf (game grid)          [generated]
├── 404.html                                                     [generated]
├── games/
│   └── <game-slug>.html    one page per game, iframe centred     [generated]
├── assets/
│   ├── style.css           <- neobrutalism + PICO-8 palette
│   ├── search.js           <- the top-right search box
│   ├── thumbs.js           <- hover-to-play GIF thumbnails
│   ├── leaves.js           <- falling pixel-art leaves (background)
│   └── favicon.svg
├── html/                   <- your PICO-8 web shells (input)
├── carts/                  <- your .p8.png cartridges (download links)
└── imgs/                   <- your thumbnail GIFs (input)
```

## Play it

Double-click `index.html`, or serve the folder:

```bash
npm run serve        # builds, then serves on http://localhost:8080
# or: python -m http.server 8080
```

## Add a game

1. Export from PICO-8 into `html/<my_game>/<my_game>.html` (+ its `.js`) and `carts/<my_game>.p8.png`.
2. Add an entry to `games.json`:

```json
{
  "name": "My Game",
  "cart": "my_game.p8.png",
  "html": "my_game.html",
  "date": "November 3, 2026",
  "desc": "What the game is.",

  "color": "#ff004d",              // optional accent (PICO-8 hex looks best)
  "tags": ["arcade", "2p"],       // optional chips on the game page (also searchable)
  "thumbnail": "my_game.gif",     // optional image in imgs/ -> card art + page capture
  "isMouseOnly": true,             // optional -> red "Mouse Required" flag
  "developersChoice": true         // optional -> yellow tag + animated crazy border
}
```

3. Rebuild:

```bash
node build.js
```

Pages are written into `games/` using a slug of the game name, and the `<iframe>`
points at `html/<folder>/<name>.html` (the folder is auto-detected from the shell
file name). Games are listed newest-first by `date`.

`build.js` also warns about mismatches: a `carts/` or `imgs/` name in `games.json` that
doesn't exist on disk (it auto-corrects common `_`/`-` mix-ups, e.g. `vile_vignettes.p8.png`
-> `vile-vignettes.p8.png`), and any `html/` folder, cart file or image that `games.json`
never mentions. If a cart can't be found, the download button is simply left off that page;
if a thumbnail can't be found, the card falls back to its big slot number.

## Thumbnails (hover to play)

`"thumbnail": "my_game.gif"` points at a file in `imgs/` and shows up twice:

- as the art on the shelf card (with the slot number in a yellow tab and a
  *▶ hover to play* cue in the corner);
- in a **Capture** panel on the game page (square, `imgs/<file>` captioned underneath).

`assets/thumbs.js` freezes GIFs: on load it paints frame one into a `<canvas>` that sits on
top of the (hidden) `<img>`, so nothing animates on its own. Hovering the card re-arms the
`src` (so the clip restarts from frame one) and reveals the `<img>`; leaving freezes it again
on wherever it stopped. Touch devices (`(hover: none)`) and `prefers-reduced-motion` skip the
freeze and just show the animated image. Images are `loading="lazy"` + `decoding="async"`, and
rendered with `image-rendering: pixelated`.

## Search (top right)

The search box lives in the header on every page.

- On the shelf it filters the cards live (name, description, cart file, date, any `tags`,
  and the words *mouse* / *developer's choice* when those flags are set), updates the
  `11 carts` chip to `02 / 11 matches`, and shows a "No carts match" panel when nothing fits.
- On a game page, hitting **Enter** jumps to `index.html?q=<your text>` and filters there.
- Deep-linkable: `index.html?q=turkey` pre-fills and filters on load.
- Shortcuts: `/` focuses the box, `Esc` clears it.
- No dependencies — it reads `data-search` attributes baked into each card by `build.js`.

## Mouse-only carts (`"isMouseOnly": true`)

Flagged in PICO-8 red (`#ff004d`):

- a red **Mouse Required** badge on the shelf card;
- a red chip in the breadcrumb row of the game page;
- a red warning strip between the console and the buttons (pixel-mouse icon);
- the console label reads "Boots with the mouse" and the Controls panel swaps the Z/X key
  list for `Mouse` / `LMB`;
- *mouse / pointer / only* join its search haystack, so searching **mouse** lists only those.

## Developer's Choice (`"developersChoice": true`)

- a yellow **★ Developer's Choice** tag on the card, stacked above the Mouse Required and
  PICO-8 badges (same shape as the red one, in `#ffec27`);
- a matching yellow chip in the breadcrumb row of its page;
- a **crazy border**: a ring of the whole PICO-8 palette that *spins* around the card — a
  `repeating-conic-gradient` of red / orange / yellow / green / blue / pink spokes whose angle
  is animated with a registered `@property --pico-angle` (6s per turn, speeding up to 2.4s on
  hover), and a wider version counter-spinning the other way around the console (9s). Both are
  wrapped in thick `#000` borders with hard offset shadows so they stay neobrutalist. In
  browsers without `@property` the ring simply stays static.
- *developer's choice / favorite / featured* are searchable.

## Design notes

- **Neobrutalism:** flat PICO-8 colour fills, 4–6px solid `#000` borders, hard offset
  shadows (no blur), chunky uppercase monospace type, rotated cards that straighten on hover.
- **Palette:** the stock PICO-8 16-colour palette as CSS variables (`--c0`…`--c14`) plus
  `--accent` per page.
- **The screen:** the `.console` box is horizontally centred and sized by
  `min(820px, 96vw, calc(100vh - 300px))`, so the cart is fully visible on the first screen.
- **Fall theming:** `assets/leaves.js` paints 7–16 hand-drawn 8×8 sprites (three leaf
  shapes + an acorn) on a fixed `#leaves` canvas behind the page, nearest-neighbour upscaled,
  each drifting with its own speed, sway, flutter and alpha. A warm autumn wash sits under
  the halftone dots and a fall-colour bunting strip runs under the header.
- `prefers-reduced-motion: reduce` freezes the leaves, stops the spinning rings and drops
  hover transitions.
