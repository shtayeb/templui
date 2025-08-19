(function () {
  'use strict';
  
  // Utility functions
  function getConfig(ratingElement) {
    return {
      value: parseFloat(ratingElement.getAttribute('data-tui-rating-initial-value')) || 0,
      precision: parseFloat(ratingElement.getAttribute('data-tui-rating-precision')) || 1,
      readonly: ratingElement.getAttribute('data-tui-rating-readonly') === 'true',
      name: ratingElement.getAttribute('data-tui-rating-name') || '',
      onlyInteger: ratingElement.getAttribute('data-tui-rating-onlyinteger') === 'true'
    };
  }
  
  function getCurrentValue(ratingElement) {
    return parseFloat(ratingElement.getAttribute('data-tui-rating-current')) || 
           parseFloat(ratingElement.getAttribute('data-tui-rating-initial-value')) || 0;
  }
  
  function setCurrentValue(ratingElement, value) {
    ratingElement.setAttribute('data-tui-rating-current', value);
    const hiddenInput = ratingElement.querySelector('[data-tui-rating-input]');
    if (hiddenInput) {
      hiddenInput.value = value.toFixed(2);
      hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  
  function updateItemStyles(ratingElement, displayValue) {
    const currentValue = getCurrentValue(ratingElement);
    const valueToCompare = displayValue > 0 ? displayValue : currentValue;
    
    ratingElement.querySelectorAll('[data-tui-rating-item]').forEach(item => {
      const itemValue = parseInt(item.getAttribute('data-tui-rating-value'), 10);
      if (isNaN(itemValue)) return;
      
      const foreground = item.querySelector('[data-tui-rating-item-foreground]');
      if (!foreground) return;
      
      const filled = itemValue <= Math.floor(valueToCompare);
      const partial = !filled && itemValue - 1 < valueToCompare && valueToCompare < itemValue;
      const percentage = partial ? (valueToCompare - Math.floor(valueToCompare)) * 100 : 0;
      
      foreground.style.width = filled ? '100%' : partial ? `${percentage}%` : '0%';
    });
  }
  
  function getMaxValue(ratingElement) {
    let max = 0;
    ratingElement.querySelectorAll('[data-tui-rating-item]').forEach(item => {
      const value = parseInt(item.getAttribute('data-tui-rating-value'), 10);
      if (!isNaN(value) && value > max) max = value;
    });
    return Math.max(1, max);
  }
  
  // Event handlers
  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-tui-rating-item]');
    if (!item) return;
    
    const ratingElement = item.closest('[data-tui-rating-component]');
    if (!ratingElement) return;
    
    const config = getConfig(ratingElement);
    if (config.readonly) return;
    
    const itemValue = parseInt(item.getAttribute('data-tui-rating-value'), 10);
    if (isNaN(itemValue)) return;
    
    const currentValue = getCurrentValue(ratingElement);
    const maxValue = getMaxValue(ratingElement);
    
    let newValue = itemValue;
    if (config.onlyInteger) {
      newValue = Math.round(newValue);
    } else {
      if (currentValue === newValue && newValue % 1 === 0) {
        newValue = Math.max(0, newValue - config.precision);
      } else {
        newValue = Math.round(newValue / config.precision) * config.precision;
      }
    }
    
    newValue = Math.max(0, Math.min(maxValue, newValue));
    setCurrentValue(ratingElement, newValue);
    updateItemStyles(ratingElement, 0);
    
    ratingElement.dispatchEvent(
      new CustomEvent('rating-change', {
        bubbles: true,
        detail: { name: config.name, value: newValue, maxValue }
      })
    );
  });
  
  document.addEventListener('mouseover', (e) => {
    const item = e.target.closest('[data-tui-rating-item]');
    if (!item) return;
    
    const ratingElement = item.closest('[data-tui-rating-component]');
    if (!ratingElement || getConfig(ratingElement).readonly) return;
    
    const previewValue = parseInt(item.getAttribute('data-tui-rating-value'), 10);
    if (!isNaN(previewValue)) {
      updateItemStyles(ratingElement, previewValue);
    }
  });
  
  document.addEventListener('mouseout', (e) => {
    const ratingElement = e.target.closest('[data-tui-rating-component]');
    if (!ratingElement || getConfig(ratingElement).readonly) return;
    
    // Check if we're leaving the rating component entirely
    if (!ratingElement.contains(e.relatedTarget)) {
      updateItemStyles(ratingElement, 0);
    }
  });
  
  // Form reset
  document.addEventListener('reset', (e) => {
    if (!e.target.matches('form')) return;
    
    e.target.querySelectorAll('[data-tui-rating-component]').forEach(ratingElement => {
      const config = getConfig(ratingElement);
      setCurrentValue(ratingElement, config.value);
      updateItemStyles(ratingElement, 0);
    });
  });
  
  // MutationObserver for initial setup and dynamic changes
  new MutationObserver(() => {
    document.querySelectorAll('[data-tui-rating-component]').forEach(ratingElement => {
      // Initialize current value if not set
      if (!ratingElement.hasAttribute('data-tui-rating-current')) {
        const config = getConfig(ratingElement);
        const maxValue = getMaxValue(ratingElement);
        const value = Math.max(0, Math.min(maxValue, config.value));
        setCurrentValue(ratingElement, Math.round(value / config.precision) * config.precision);
      }
      
      // Update styles
      updateItemStyles(ratingElement, 0);
      
      // Set cursor styles
      const config = getConfig(ratingElement);
      if (config.readonly) {
        ratingElement.style.cursor = 'default';
        ratingElement.querySelectorAll('[data-tui-rating-item]').forEach(item => {
          item.style.cursor = 'default';
        });
      }
    });
  }).observe(document.body, { childList: true, subtree: true });
})();