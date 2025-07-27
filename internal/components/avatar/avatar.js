(function () {
  function initAvatar(avatar) {
    if (!avatar || avatar.hasAttribute("data-initialized")) return;
    avatar.setAttribute("data-initialized", "true");
    
    const image = avatar.querySelector("[data-tui-avatar-image]");
    const fallback = avatar.querySelector("[data-tui-avatar-fallback]");

    if (image && fallback) {
      image.style.display = "none";
      fallback.style.display = "none";

      const showFallback = () => {
        image.style.display = "none";
        fallback.style.display = "";
      };

      const showImage = () => {
        image.style.display = "";
        fallback.style.display = "none";
      };

      if (image.complete) {
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? showImage()
          : showFallback();
      } else {
        image.addEventListener("load", showImage, { once: true });
        image.addEventListener("error", showFallback, { once: true });

        setTimeout(() => {
          if (
            image.complete &&
            !(image.naturalWidth > 0 && image.naturalHeight > 0)
          ) {
            showFallback();
          }
        }, 50);
      }
    } else if (fallback) {
      fallback.style.display = "";
    } else if (image) {
      image.style.display = "";
    }
  }

  function init(root = document) {
    if (root instanceof Element && root.matches("[data-tui-avatar]")) {
      initAvatar(root);
    }
    for (const avatar of root.querySelectorAll("[data-tui-avatar]:not([data-initialized])")) {
      initAvatar(avatar);
    }
  }

  window.templUI = window.templUI || {};
  window.templUI.avatar = { init: init };

  document.addEventListener("DOMContentLoaded", () => init());
})();
