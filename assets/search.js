/* PICO-67 search — filters the shelf, or bounces other pages back to it. */
(function () {
  var form = document.querySelector(".search");
  var input = document.getElementById("site-search");
  if (!form || !input) return;

  var grid = document.getElementById("grid");
  var cards = grid ? Array.prototype.slice.call(grid.querySelectorAll(".card")) : [];
  var count = document.getElementById("result-count");
  var empty = document.getElementById("no-results");
  var emptyQ = document.getElementById("no-results-q");
  var clear = document.getElementById("clear-search");
  var total = cards.length;

  var pad = function (n) { return (n < 10 ? "0" : "") + n; };

  function apply(q) {
    var needle = q.trim().toLowerCase();
    if (!total) return;

    var shown = 0;
    cards.forEach(function (card) {
      var hit = !needle || card.getAttribute("data-search").indexOf(needle) !== -1;
      card.classList.toggle("is-hidden", !hit);
      if (hit) shown++;
    });

    if (count) {
      count.textContent = needle
        ? pad(shown) + " / " + pad(total) + (shown === 1 ? " match" : " matches")
        : pad(total) + " carts";
    }
    if (empty) {
      empty.hidden = shown !== 0;
      if (emptyQ) emptyQ.textContent = "\u201C" + q.trim() + "\u201D";
    }

    try {
      history.replaceState(null, "", needle
        ? location.pathname + "?q=" + encodeURIComponent(needle)
        : location.pathname);
    } catch (e) { /* file:// or sandboxed */ }
  }

  /* index page: live filtering. everything else: send the query to the shelf. */
  if (total) {
    input.addEventListener("input", function () { apply(input.value); });
    form.addEventListener("submit", function (e) { e.preventDefault(); apply(input.value); });
    if (clear) clear.addEventListener("click", function () { input.value = ""; apply(""); });
    form.classList.add("is-live");
  } else {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = encodeURIComponent(input.value.trim());
      location.href = form.getAttribute("data-index") + (q ? "?q=" + q : "");
    });
  }

  /* "/" focuses the box, Esc clears it */
  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); input.focus(); input.select(); }
    if (e.key === "Escape" && document.activeElement === input) { input.value = ""; apply(""); input.blur(); }
  });

  /* deep link: index.html?q=turkey */
  var initial = new URLSearchParams(location.search).get("q") || "";
  if (initial) {
    input.value = initial;
    apply(initial);
    if (total && grid.scrollIntoView) grid.scrollIntoView();
  }
})();
