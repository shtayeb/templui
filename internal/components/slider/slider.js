(function () {
  function initSlider(sliderInput) {
    if (sliderInput.hasAttribute("data-tui-slider-initialized")) return;

    sliderInput.setAttribute("data-tui-slider-initialized", "true");

    const sliderId = sliderInput.id;
    if (!sliderId) return;

    const valueElements = document.querySelectorAll(
      `[data-tui-slider-value][data-tui-slider-value-for="${sliderId}"]`
    );

    function updateValues() {
      valueElements.forEach((el) => {
        el.textContent = sliderInput.value;
      });
    }

    updateValues();
    sliderInput.addEventListener("input", updateValues);
  }

  function init(root = document) {
    if (
      root instanceof Element &&
      root.matches('input[type="range"][data-tui-slider-input]')
    ) {
      initSlider(root);
    }
    for (const slider of root.querySelectorAll(
      'input[type="range"][data-tui-slider-input]:not([data-tui-slider-initialized])'
    )) {
      initSlider(slider);
    }
  }

  window.templUI = window.templUI || {};
  window.templUI.slider = { init: init };

  document.addEventListener("DOMContentLoaded", () => init());
})();
