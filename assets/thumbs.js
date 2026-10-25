/* PICO-67 thumbnails — GIFs hold on their first frame until you hover them.
   The first frame is painted into a <canvas>; the animated <img> is swapped in on
   hover (restarting it from frame one) and frozen again on mouse-out. */
(function () {
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var boxes = document.querySelectorAll("[data-thumb]");

  Array.prototype.forEach.call(boxes, function (box) {
    var img = box.querySelector("img");
    if (!img) return;

    /* touch screens have no hover, so let the GIF animate; reduced-motion users get a still */
    if (!canHover && !reduce) {
      box.classList.add("no-freeze");
      return;
    }

    var src = img.getAttribute("src");
    var still = document.createElement("canvas");
    still.className = "thumb-still";
    box.appendChild(still);

    function freeze() {
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      still.width = w;
      still.height = h;
      still.getContext("2d").drawImage(img, 0, 0, w, h);
      box.classList.add("is-paused");
    }

    function play() {
      if (!box.classList.contains("is-paused")) return;   /* already running */
      box.classList.add("is-loading");

      var reveal = function () {
        clearTimeout(guard);
        box.classList.remove("is-paused", "is-loading");
      };
      var guard = setTimeout(reveal, 150);               /* cached loads may skip the event */
      var onReveal = function () { img.removeEventListener("load", onReveal); reveal(); };
      img.addEventListener("load", onReveal);

      /* re-setting the src attribute re-arms the GIF so it starts at frame one */
      img.setAttribute("src", src);
    }

    if (img.complete && img.naturalWidth) freeze();
    else img.addEventListener("load", freeze);
    img.addEventListener("error", function () { box.classList.add("thumb-missing"); });

    if (reduce) { box.classList.add("is-still"); return; }   /* stays on frame one */

    /* cards are whole-link <a> tags, so react to the pointer anywhere on the card */
    var host = box.closest ? (box.closest("a") || box) : box;
    host.addEventListener("mouseenter", play);
    host.addEventListener("mouseleave", freeze);
  });
})();
