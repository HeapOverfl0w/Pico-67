/* PICO-67 — falling pixel-art leaves (PICO-8 palette, no dependencies).
   Sprites are 8x8 hand-drawn matrices, upscaled with nearest-neighbour,
   so they look like PICO-8 sprites rather than smooth vector art. */
(function () {
  var canvas = document.getElementById("leaves");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  /* 1 = outline, 2 = leaf fill, 3 = vein / highlight, 4 = secondary fill */
  var SPRITES = [
    [ /* simple leaf */
      "....111.",
      "...1221.",
      "..122221",
      "..122321",
      ".1223321",
      ".1122311",
      "....111.",
      ".....1.."
    ],
    [ /* maple */
      "1..11..1",
      ".112211.",
      ".122221.",
      "11223211",
      ".122321.",
      "..1221..",
      "...11...",
      "...1...."
    ],
    [ /* oak */
      "...11...",
      "..1221..",
      ".122221.",
      "12223221",
      ".122221.",
      "..1221..",
      "...11...",
      "...1...."
    ],
    [ /* acorn */
      ".111111.",
      ".122221.",
      "..1221..",
      ".144441.",
      ".143441.",
      "..1441..",
      "...11...",
      "........"
    ]
  ];

  var FALL = ["#ff004d", "#ffa300", "#ffec27", "#ab5236", "#ffccaa", "#ff77a8"];
  var OUTLINE = "#5f574f";
  var VEIN = "#fff1e8";

  /* pre-render one 8x8 image per (sprite, colour) pair */
  var cache = {};
  function spriteImage(si, color) {
    var key = si + color;
    if (cache[key]) return cache[key];
    var c = document.createElement("canvas");
    c.width = c.height = 8;
    var g = c.getContext("2d");
    SPRITES[si].forEach(function (row, y) {
      for (var x = 0; x < 8; x++) {
        var ch = row[x];
        if (ch === ".") continue;
        g.fillStyle = ch === "1" ? OUTLINE : ch === "3" ? VEIN : ch === "4" ? "#ab5236" : color;
        g.fillRect(x, y, 1, 1);
      }
    });
    cache[key] = c;
    return c;
  }

  var W = 0, H = 0, leaves = [];

  function seed() {
    var n = Math.max(7, Math.min(16, Math.round((W * H) / 58000)));
    leaves = [];
    for (var i = 0; i < n; i++) {
      var isAcorn = i % 5 === 4;
      leaves.push({
        s: isAcorn ? 3 : i % 3,
        color: FALL[i % FALL.length],
        scale: 3 + (i % 4),
        x: Math.random() * W,
        y: Math.random() * H,
        vy: 16 + Math.random() * 26,
        sway: 10 + Math.random() * 24,
        swaySpeed: 0.25 + Math.random() * 0.5,
        spin: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        alpha: isAcorn ? 0.7 : 0.45 + Math.random() * 0.4
      });
    }
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    seed();
    draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < leaves.length; i++) {
      var L = leaves[i];
      var img = spriteImage(L.s, L.color);
      var flip = Math.cos(t * L.spin + L.phase);
      if (Math.abs(flip) < 0.18) flip = flip < 0 ? -0.18 : 0.18;
      var sx = L.scale * flip;
      var sy = L.scale;
      var x = L.x + Math.sin(t * L.swaySpeed + L.phase) * L.sway;
      ctx.globalAlpha = L.alpha;
      ctx.setTransform(sx, 0, 0, sy, x, L.y);
      ctx.drawImage(img, 0, 0, 8, 8, 0, 0, 8, 8);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var last = 0;
  function tick(now) {
    var t = now / 1000;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    for (var i = 0; i < leaves.length; i++) {
      var L = leaves[i];
      L.y += L.vy * dt;
      if (L.y > H + 40) { L.y = -40; L.x = Math.random() * W; }
    }
    draw(t);
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  if (!reduce) requestAnimationFrame(tick);
})();
