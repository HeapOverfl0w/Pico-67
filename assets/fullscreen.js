/* Game pages: the "&#9974; Fullscreen" action runs the PICO-8 shell's own fullscreen
 * toggle -- the exact same call the shell's little on-screen fullscreen button makes:
 *
 *      p8_give_focus(); p8_request_fullscreen();
 *
 * The cart shell sits in an iframe, so we reach into it (same origin, and the iframe is
 * allow="fullscreen") and call it there. That keeps the shell in charge of its own
 * fullscreen layout -- it detects document.fullscreenElement, drops the button column and
 * resizes the canvas to the whole screen, which a plain "open the shell in a new tab"
 * link never does.
 *
 * The link's href still points at the cart shell: if the shell function is missing or the
 * browser refuses fullscreen (iOS Safari, a cross-origin embed), the click is left alone
 * and behaves like the old link -- a new tab.
 */
(function () {
  "use strict";

  var FULL = "\u26f6"; // ⛶
  var LABEL_OFF = FULL + " Fullscreen";
  var LABEL_ON = FULL + " Exit fullscreen";

  var frame = document.querySelector(".screen iframe");
  var buttons = [].slice.call(document.querySelectorAll("[data-p8-fullscreen]"));
  if (!frame || !buttons.length) return;

  /* is anything -- this page, or the cart inside the iframe -- in fullscreen? */
  function docFullscreen(doc) {
    if (!doc) return false;
    return !!(
      doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement ||
      doc.msFullscreenElement || doc.webkitIsFullScreen || doc.mozFullScreen
    );
  }
  function isFullscreen() {
    var inner = false;
    try { inner = docFullscreen(frame.contentDocument); } catch (e) {}
    return docFullscreen(document) || inner;
  }

  function paint() {
    var on = isFullscreen();
    buttons.forEach(function (b) {
      b.textContent = on ? LABEL_ON : LABEL_OFF;
      b.title = on ? "Leave fullscreen (Esc)" : "Play full screen";
    });
  }

  /* hand the keyboard back to the cart, then toggle fullscreen inside the iframe */
  function askShell() {
    try {
      var w = frame.contentWindow;
      if (!w || typeof w.p8_request_fullscreen !== "function") return false;
      if (typeof w.p8_give_focus === "function") w.p8_give_focus();
      w.p8_request_fullscreen(); // toggles -- exits fullscreen if the cart is already in it
      return true;
    } catch (e) {
      return false;
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      var wasFullscreen = isFullscreen();
      if (!askShell()) return; // no shell function: let the link open a tab

      event.preventDefault();
      if (wasFullscreen) return; // we just asked it to leave; nothing to verify

      /* requestFullscreen gives us no promise here, so check a moment later and
         fall back to the new tab if the browser never went fullscreen */
      var tries = 0;
      (function check() {
        if (isFullscreen()) { paint(); return; }
        if (++tries >= 4) { window.open(button.href, "_blank", "noopener"); return; }
        setTimeout(check, 120);
      })();
    });
  });

  /* the fullscreen element lives in the iframe's document, so listen on both sides */
  ["fullscreenchange", "webkitfullscreenchange", "fullscreenerror", "webkitfullscreenerror"].forEach(function (type) {
    document.addEventListener(type, paint, true);
    try { frame.contentDocument.addEventListener(type, paint, true); } catch (e) {}
  });
  frame.addEventListener("load", function () {
    ["fullscreenchange", "webkitfullscreenchange"].forEach(function (type) {
      try { frame.contentDocument.addEventListener(type, paint, true); } catch (e) {}
    });
    paint();
  });

  paint();
})();
