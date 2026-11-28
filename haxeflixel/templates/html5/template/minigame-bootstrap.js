(function () {
  window.addEventListener("touchmove", function (event) {
    event.preventDefault();
  }, { capture: false, passive: false });

  if (typeof window.devicePixelRatio !== "undefined" && window.devicePixelRatio > 2) {
    var viewport = document.getElementById("viewport");
    if (viewport) {
      viewport.setAttribute(
        "content",
        "width=device-width, initial-scale=" + (2 / window.devicePixelRatio) + ", user-scalable=no"
      );
    }
  }

  var container = document.getElementById("content");
  var focusGameCanvas = function () {
    var canvas = container && container.querySelector("canvas");
    if (!canvas) return false;
    canvas.setAttribute("tabindex", "0");
    canvas.style.outline = "none";
    if (!canvas.__axemFocusBound) {
      canvas.__axemFocusBound = true;
      canvas.addEventListener("pointerdown", function () { canvas.focus(); });
      canvas.addEventListener("touchstart", function () { canvas.focus(); }, { passive: true });
    }
    canvas.focus();
    return true;
  };
  var observer = new MutationObserver(function () {
    if (focusGameCanvas()) observer.disconnect();
  });
  if (container) observer.observe(container, { childList: true, subtree: true });

  lime.embed("index", "content", 480, 270);
  focusGameCanvas();
}());
