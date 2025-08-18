(function () {
  'use strict';
  
  // Utility functions
  function parseTime(str) {
    const match = str?.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const [_, hour, minute] = match.map(Number);
    return (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) ? { hour, minute } : null;
  }
  
  function formatTime(hour, minute, use12Hours) {
    if (hour === null || minute === null) return null;
    const pad = n => n.toString().padStart(2, '0');
    
    if (use12Hours) {
      const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${pad(h)}:${pad(minute)} ${hour >= 12 ? 'PM' : 'AM'}`;
    }
    return `${pad(hour)}:${pad(minute)}`;
  }
  
  function isValidTime(hour, minute, minTime, maxTime) {
    if (!minTime && !maxTime) return true;
    const timeInMinutes = hour * 60 + minute;
    
    if (minTime) {
      const minInMinutes = minTime.hour * 60 + minTime.minute;
      if (timeInMinutes < minInMinutes) return false;
    }
    
    if (maxTime) {
      const maxInMinutes = maxTime.hour * 60 + maxTime.minute;
      if (timeInMinutes > maxInMinutes) return false;
    }
    
    return true;
  }
  
  // DOM helpers
  function findTrigger(element) {
    const popup = element.closest('[data-tui-timepicker-popup]');
    if (!popup) return null;
    
    const popupId = popup.closest('[id]')?.id;
    if (!popupId) return null;
    
    return document.getElementById(popupId.replace('-content', ''));
  }
  
  function getElements(trigger) {
    const popupId = trigger.id + '-content';
    const popup = document.getElementById(popupId)?.querySelector('[data-tui-timepicker-popup]');
    if (!popup) return null;
    
    return {
      popup,
      hourList: popup.querySelector('[data-tui-timepicker-hour-list]'),
      minuteList: popup.querySelector('[data-tui-timepicker-minute-list]'),
      hiddenInput: document.getElementById(trigger.id + '-hidden') || 
                   trigger.parentElement?.querySelector('[data-tui-timepicker-hidden-input]')
    };
  }
  
  // State management
  function getState(trigger) {
    return {
      hour: trigger.dataset.tuiTimepickerCurrentHour ? parseInt(trigger.dataset.tuiTimepickerCurrentHour) : null,
      minute: trigger.dataset.tuiTimepickerCurrentMinute ? parseInt(trigger.dataset.tuiTimepickerCurrentMinute) : null,
      use12Hours: trigger.getAttribute('data-tui-timepicker-use12hours') === 'true',
      step: parseInt(trigger.getAttribute('data-tui-timepicker-step') || '1'),
      minTime: parseTime(trigger.getAttribute('data-tui-timepicker-min-time')),
      maxTime: parseTime(trigger.getAttribute('data-tui-timepicker-max-time')),
      placeholder: trigger.getAttribute('data-tui-timepicker-placeholder') || 'Select time'
    };
  }
  
  function setState(trigger, hour, minute) {
    if (hour !== null) {
      trigger.dataset.tuiTimepickerCurrentHour = hour;
    } else {
      delete trigger.dataset.tuiTimepickerCurrentHour;
    }
    
    if (minute !== null) {
      trigger.dataset.tuiTimepickerCurrentMinute = minute;
    } else {
      delete trigger.dataset.tuiTimepickerCurrentMinute;
    }
    
    updateDisplay(trigger);
  }
  
  // Display updates
  function updateDisplay(trigger) {
    const state = getState(trigger);
    const elements = getElements(trigger);
    
    // Update trigger display
    const display = trigger.querySelector('[data-tui-timepicker-display]');
    if (display) {
      const formatted = formatTime(state.hour, state.minute, state.use12Hours);
      display.textContent = formatted || state.placeholder;
      display.classList.toggle('text-muted-foreground', !formatted);
    }
    
    // Update hidden input
    if (elements?.hiddenInput) {
      elements.hiddenInput.value = (state.hour !== null && state.minute !== null) ? 
        formatTime(state.hour, state.minute, false) : '';
    }
    
    // Update selections if popup is visible
    if (elements?.hourList && elements?.minuteList) {
      updateSelections(elements, state);
    }
  }
  
  function updateSelections(elements, state) {
    // Update hour buttons
    elements.hourList.querySelectorAll('[data-tui-timepicker-hour]').forEach(btn => {
      const hour = parseInt(btn.getAttribute('data-tui-timepicker-hour'));
      let isSelected = false;
      
      if (state.hour !== null) {
        if (state.use12Hours) {
          isSelected = (hour === state.hour) || 
                      (hour === 0 && state.hour === 12) || 
                      (hour === state.hour - 12 && state.hour > 12);
        } else {
          isSelected = hour === state.hour;
        }
      }
      
      btn.setAttribute('data-tui-timepicker-selected', isSelected);
      
      // Check validity
      let valid = false;
      for (let m = 0; m < 60; m++) {
        if (isValidTime(hour, m, state.minTime, state.maxTime)) {
          valid = true;
          break;
        }
      }
      
      btn.disabled = !valid;
      btn.classList.toggle('opacity-50', !valid);
      btn.classList.toggle('cursor-not-allowed', !valid);
    });
    
    // Update minute buttons
    elements.minuteList.querySelectorAll('[data-tui-timepicker-minute]').forEach(btn => {
      const minute = parseInt(btn.getAttribute('data-tui-timepicker-minute'));
      const isSelected = minute === state.minute;
      const valid = state.hour === null || isValidTime(state.hour, minute, state.minTime, state.maxTime);
      
      btn.setAttribute('data-tui-timepicker-selected', isSelected);
      btn.disabled = !valid;
      btn.classList.toggle('opacity-50', !valid);
      btn.classList.toggle('cursor-not-allowed', !valid);
    });
    
    // Update AM/PM buttons
    const amBtn = elements.popup.querySelector('[data-tui-timepicker-period="AM"]');
    const pmBtn = elements.popup.querySelector('[data-tui-timepicker-period="PM"]');
    
    if (amBtn && pmBtn) {
      const isAM = state.hour === null || state.hour < 12;
      amBtn.setAttribute('data-tui-timepicker-active', isAM);
      pmBtn.setAttribute('data-tui-timepicker-active', !isAM);
    }
  }
  
  // Event handlers
  document.addEventListener('click', (e) => {
    const target = e.target;
    
    // Hour selection
    if (target.matches('[data-tui-timepicker-hour]') && !target.disabled) {
      const trigger = findTrigger(target);
      if (!trigger) return;
      
      const state = getState(trigger);
      let hour = parseInt(target.getAttribute('data-tui-timepicker-hour'));
      
      if (state.use12Hours) {
        const isPM = state.hour !== null && state.hour >= 12;
        hour = hour === 0 ? (isPM ? 12 : 0) : (isPM ? hour + 12 : hour);
      }
      
      if (!isValidTime(hour, state.minute, state.minTime, state.maxTime)) {
        // Find first valid minute
        for (let m = 0; m < 60; m += state.step) {
          if (isValidTime(hour, m, state.minTime, state.maxTime)) {
            setState(trigger, hour, m);
            return;
          }
        }
      } else {
        setState(trigger, hour, state.minute);
      }
      return;
    }
    
    // Minute selection
    if (target.matches('[data-tui-timepicker-minute]') && !target.disabled) {
      const trigger = findTrigger(target);
      if (!trigger) return;
      
      const state = getState(trigger);
      const minute = parseInt(target.getAttribute('data-tui-timepicker-minute'));
      
      if (state.hour === null || isValidTime(state.hour, minute, state.minTime, state.maxTime)) {
        setState(trigger, state.hour, minute);
      }
      return;
    }
    
    // AM/PM selection
    if (target.matches('[data-tui-timepicker-period]')) {
      const trigger = findTrigger(target);
      if (!trigger) return;
      
      const state = getState(trigger);
      if (state.hour === null) return;
      
      const period = target.getAttribute('data-tui-timepicker-period');
      let newHour = state.hour;
      
      if (period === 'AM' && state.hour >= 12) {
        newHour = state.hour === 12 ? 0 : state.hour - 12;
      } else if (period === 'PM' && state.hour < 12) {
        newHour = state.hour === 0 ? 12 : state.hour + 12;
      }
      
      if (newHour !== state.hour) {
        if (!isValidTime(newHour, state.minute, state.minTime, state.maxTime)) {
          // Find first valid minute
          for (let m = 0; m < 60; m += state.step) {
            if (isValidTime(newHour, m, state.minTime, state.maxTime)) {
              setState(trigger, newHour, m);
              return;
            }
          }
        } else {
          setState(trigger, newHour, state.minute);
        }
      }
      return;
    }
    
    // Done button
    if (target.matches('[data-tui-timepicker-done]')) {
      const trigger = findTrigger(target);
      if (trigger && window.closePopover) {
        window.closePopover(trigger.id + '-content');
      }
      return;
    }
  });
  
  // Form reset
  document.addEventListener('reset', (e) => {
    if (!e.target.matches('form')) return;
    
    e.target.querySelectorAll('[data-tui-timepicker="true"]').forEach(trigger => {
      setState(trigger, null, null);
      const elements = getElements(trigger);
      if (elements?.hiddenInput) {
        elements.hiddenInput.value = '';
      }
    });
  });
  
  // MutationObserver for initial rendering
  new MutationObserver(() => {
    document.querySelectorAll('[data-tui-timepicker="true"]:not([data-rendered])').forEach(trigger => {
      trigger.setAttribute('data-rendered', 'true');
      
      // Read initial value from hidden input
      const elements = getElements(trigger);
      const initialValue = elements?.hiddenInput?.value || 
                          elements?.popup?.getAttribute('data-tui-timepicker-value');
      
      if (initialValue) {
        const parsed = parseTime(initialValue);
        if (parsed) {
          setState(trigger, parsed.hour, parsed.minute);
        }
      }
      
      updateDisplay(trigger);
    });
  }).observe(document.body, { childList: true, subtree: true });
})();