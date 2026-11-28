(function () {
  window.addEventListener("touchmove", function (event) {
    event.preventDefault();
  }, { capture: false, passive: false });

  if (typeof window.devicePixelRatio !== "undefined" && window.devicePixelRatio > 2) {
    var viewport = document.getElementById("viewport");
    if (viewport) {
      viewport.setAttribute("content",
        "width=device-width, initial-scale=" + (2 / window.devicePixelRatio) + ", user-scalable=no");
    }
  }

  lime.embed("index", "openfl-content", 480, 270, { parameters: {} });
}());
