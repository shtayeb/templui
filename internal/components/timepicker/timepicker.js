(function () {
  'use strict';
  
  // Utility functions
  function parseTimeString(timeString) {
    if (!timeString || typeof timeString !== "string") return null;
    const parts = timeString.match(/^(\d{1,2}):(\d{2})$/);
    if (!parts) return null;
    const hour = parseInt(parts[1], 10);
    const minute = parseInt(parts[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  }

  function formatTime(hour, minute, use12Hours) {
    if (use12Hours) {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${period}`;
    }
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  function formatTimeValue(hour, minute) {
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  function isTimeInRange(hour, minute, minTime, maxTime) {
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
  
  function isHourValid(hour, currentMinute, minTime, maxTime) {
    if (!minTime && !maxTime) return true;
    
    // Check if any minute in this hour would be valid
    for (let minute = 0; minute < 60; minute++) {
      if (isTimeInRange(hour, minute, minTime, maxTime)) {
        return true;
      }
    }
    return false;
  }
  
  function findHiddenInput(trigger) {
    const timePickerID = trigger.id;
    const hiddenInputId = timePickerID + "-hidden";
    let hiddenInput = document.getElementById(hiddenInputId);
    
    if (!hiddenInput) {
      const parent = trigger.parentElement;
      if (parent) {
        hiddenInput = parent.querySelector("[data-tui-timepicker-hidden-input]");
      }
    }
    
    return hiddenInput;
  }
  
  function findPopupElements(trigger) {
    const timePickerID = trigger.id;
    const popupId = timePickerID + "-content";
    const popupContent = document.getElementById(popupId);
    
    if (!popupContent) return null;
    
    const popup = popupContent.querySelector("[data-tui-timepicker-popup]");
    if (!popup) return null;
    
    return {
      popup,
      hourList: popup.querySelector("[data-tui-timepicker-hour-list]"),
      minuteList: popup.querySelector("[data-tui-timepicker-minute-list]")
    };
  }
  
  function getTimeFromTrigger(trigger) {
    const hour = trigger.dataset.tuiTimepickerCurrentHour;
    const minute = trigger.dataset.tuiTimepickerCurrentMinute;
    
    return {
      hour: hour !== undefined ? parseInt(hour, 10) : null,
      minute: minute !== undefined ? parseInt(minute, 10) : null
    };
  }
  
  function setTimeOnTrigger(trigger, hour, minute) {
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
  }
  
  function updateDisplay(trigger) {
    const displaySpan = trigger.querySelector("[data-tui-timepicker-display]");
    if (!displaySpan) return;
    
    const { hour, minute } = getTimeFromTrigger(trigger);
    const use12Hours = trigger.getAttribute("data-tui-timepicker-use12hours") === "true";
    const placeholder = trigger.getAttribute("data-tui-timepicker-placeholder") || "Select time";
    
    if (hour !== null && minute !== null) {
      const formattedTime = formatTime(hour, minute, use12Hours);
      displaySpan.textContent = formattedTime;
      displaySpan.classList.remove("text-muted-foreground");
    } else {
      displaySpan.textContent = placeholder;
      displaySpan.classList.add("text-muted-foreground");
    }
    
    // Update hidden input
    const hiddenInput = findHiddenInput(trigger);
    if (hiddenInput) {
      if (hour !== null && minute !== null) {
        hiddenInput.value = formatTimeValue(hour, minute);
      } else {
        hiddenInput.value = "";
      }
    }
    
    // Update popup selections if visible
    const elements = findPopupElements(trigger);
    if (elements && elements.hourList && elements.minuteList) {
      const minTimeString = trigger.getAttribute("data-tui-timepicker-min-time") || "";
      const maxTimeString = trigger.getAttribute("data-tui-timepicker-max-time") || "";
      const minTime = minTimeString ? parseTimeString(minTimeString) : null;
      const maxTime = maxTimeString ? parseTimeString(maxTimeString) : null;
      
      updateHourSelection(elements.hourList, hour, use12Hours, minute, minTime, maxTime);
      updateMinuteSelection(elements.minuteList, minute, hour, minTime, maxTime);
      
      if (use12Hours) {
        updatePeriodButtons(elements.popup, hour);
      }
    }
  }
  
  function updateHourSelection(hourList, selectedHour, use12Hours, currentMinute, minTime, maxTime) {
    hourList.querySelectorAll('[data-tui-timepicker-hour]').forEach(button => {
      const hour = parseInt(button.getAttribute('data-tui-timepicker-hour'));
      let isSelected = false;
      
      if (selectedHour !== null) {
        if (use12Hours) {
          isSelected = (hour === selectedHour) || 
                      (hour === 0 && selectedHour === 12) || 
                      (hour === selectedHour - 12 && selectedHour > 12);
        } else {
          isSelected = hour === selectedHour;
        }
      }
      
      const actualHour = use12Hours && hour === 0 ? (selectedHour >= 12 ? 12 : 0) : hour;
      const isValid = isHourValid(actualHour, currentMinute, minTime, maxTime);
      
      button.setAttribute('data-tui-timepicker-selected', isSelected ? 'true' : 'false');
      button.disabled = !isValid;
      if (!isValid) {
        button.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        button.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    });
  }

  function updateMinuteSelection(minuteList, selectedMinute, currentHour, minTime, maxTime) {
    minuteList.querySelectorAll('[data-tui-timepicker-minute]').forEach(button => {
      const minute = parseInt(button.getAttribute('data-tui-timepicker-minute'));
      const isSelected = minute === selectedMinute;
      
      const isValid = currentHour === null || isTimeInRange(currentHour, minute, minTime, maxTime);
      
      button.setAttribute('data-tui-timepicker-selected', isSelected ? 'true' : 'false');
      button.disabled = !isValid;
      if (!isValid) {
        button.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        button.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    });
  }

  function updatePeriodButtons(popup, hour) {
    const amButton = popup.querySelector('[data-tui-timepicker-period="AM"]');
    const pmButton = popup.querySelector('[data-tui-timepicker-period="PM"]');
    
    if (!amButton || !pmButton) return;

    const isAM = hour === null || hour < 12;
    
    amButton.setAttribute('data-tui-timepicker-active', isAM ? 'true' : 'false');
    pmButton.setAttribute('data-tui-timepicker-active', !isAM ? 'true' : 'false');
  }
  
  function findTriggerFromElement(element) {
    // Find the closest timepicker trigger
    const popup = element.closest('[data-tui-timepicker-popup]');
    if (!popup) return null;
    
    // Get popup ID and derive trigger ID
    const popupContainer = popup.closest('[id]');
    if (!popupContainer) return null;
    
    const popupId = popupContainer.id;
    const triggerId = popupId.replace('-content', '');
    
    return document.getElementById(triggerId);
  }
  
  // Event delegation for all clicks
  document.addEventListener('click', (e) => {
    // Hour selection
    const hourBtn = e.target.closest('[data-tui-timepicker-hour]');
    if (hourBtn && !hourBtn.disabled) {
      const trigger = findTriggerFromElement(hourBtn);
      if (!trigger) return;
      
      let selectedHour = parseInt(hourBtn.getAttribute('data-tui-timepicker-hour'), 10);
      const use12Hours = trigger.getAttribute("data-tui-timepicker-use12hours") === "true";
      const { hour: currentHour, minute: currentMinute } = getTimeFromTrigger(trigger);
      
      // Handle 12-hour format conversion
      if (use12Hours) {
        const isPM = currentHour !== null && currentHour >= 12;
        
        if (selectedHour === 0) {
          selectedHour = isPM ? 12 : 0;
        } else {
          selectedHour = isPM ? selectedHour + 12 : selectedHour;
        }
      }
      
      // Validate and set
      const minTimeString = trigger.getAttribute("data-tui-timepicker-min-time") || "";
      const maxTimeString = trigger.getAttribute("data-tui-timepicker-max-time") || "";
      const minTime = minTimeString ? parseTimeString(minTimeString) : null;
      const maxTime = maxTimeString ? parseTimeString(maxTimeString) : null;
      
      if (!isHourValid(selectedHour, currentMinute, minTime, maxTime)) {
        return;
      }
      
      // Find valid minute if current is invalid
      let validMinute = currentMinute;
      if (currentMinute !== null && !isTimeInRange(selectedHour, currentMinute, minTime, maxTime)) {
        const step = parseInt(trigger.getAttribute("data-tui-timepicker-step") || "1", 10);
        validMinute = null;
        for (let m = 0; m < 60; m += step) {
          if (isTimeInRange(selectedHour, m, minTime, maxTime)) {
            validMinute = m;
            break;
          }
        }
      }
      
      setTimeOnTrigger(trigger, selectedHour, validMinute);
      updateDisplay(trigger);
      return;
    }
    
    // Minute selection
    const minuteBtn = e.target.closest('[data-tui-timepicker-minute]');
    if (minuteBtn && !minuteBtn.disabled) {
      const trigger = findTriggerFromElement(minuteBtn);
      if (!trigger) return;
      
      const selectedMinute = parseInt(minuteBtn.getAttribute('data-tui-timepicker-minute'), 10);
      const { hour: currentHour } = getTimeFromTrigger(trigger);
      
      // Validate if hour is selected
      if (currentHour !== null) {
        const minTimeString = trigger.getAttribute("data-tui-timepicker-min-time") || "";
        const maxTimeString = trigger.getAttribute("data-tui-timepicker-max-time") || "";
        const minTime = minTimeString ? parseTimeString(minTimeString) : null;
        const maxTime = maxTimeString ? parseTimeString(maxTimeString) : null;
        
        if (!isTimeInRange(currentHour, selectedMinute, minTime, maxTime)) {
          return;
        }
      }
      
      setTimeOnTrigger(trigger, currentHour, selectedMinute);
      updateDisplay(trigger);
      return;
    }
    
    // Period (AM/PM) selection
    const periodBtn = e.target.closest('[data-tui-timepicker-period]');
    if (periodBtn) {
      const trigger = findTriggerFromElement(periodBtn);
      if (!trigger) return;
      
      const period = periodBtn.getAttribute('data-tui-timepicker-period');
      const { hour: currentHour, minute: currentMinute } = getTimeFromTrigger(trigger);
      
      if (currentHour === null) return;
      
      let newHour = currentHour;
      if (period === "AM") {
        if (currentHour >= 12) {
          newHour = currentHour === 12 ? 0 : currentHour - 12;
        }
      } else if (period === "PM") {
        if (currentHour < 12) {
          newHour = currentHour === 0 ? 12 : currentHour + 12;
        }
      }
      
      // Validate
      const minTimeString = trigger.getAttribute("data-tui-timepicker-min-time") || "";
      const maxTimeString = trigger.getAttribute("data-tui-timepicker-max-time") || "";
      const minTime = minTimeString ? parseTimeString(minTimeString) : null;
      const maxTime = maxTimeString ? parseTimeString(maxTimeString) : null;
      
      if (!isHourValid(newHour, currentMinute, minTime, maxTime)) {
        return;
      }
      
      // Find valid minute if needed
      let validMinute = currentMinute;
      if (currentMinute !== null && !isTimeInRange(newHour, currentMinute, minTime, maxTime)) {
        const step = parseInt(trigger.getAttribute("data-tui-timepicker-step") || "1", 10);
        validMinute = null;
        for (let m = 0; m < 60; m += step) {
          if (isTimeInRange(newHour, m, minTime, maxTime)) {
            validMinute = m;
            break;
          }
        }
      }
      
      setTimeOnTrigger(trigger, newHour, validMinute);
      updateDisplay(trigger);
      return;
    }
    
    // Done button
    const doneBtn = e.target.closest('[data-tui-timepicker-done]');
    if (doneBtn) {
      const trigger = findTriggerFromElement(doneBtn);
      if (!trigger) return;
      
      // Use the global closePopover function instead of clicking
      const popoverId = trigger.id + '-content';
      if (window.closePopover) {
        window.closePopover(popoverId);
      }
      return;
    }
  });
  
  // Form reset handling
  document.addEventListener('reset', (e) => {
    if (!e.target.matches('form')) return;
    
    const form = e.target;
    // Find all timepickers in this form
    form.querySelectorAll('[data-tui-timepicker="true"]').forEach(trigger => {
      setTimeOnTrigger(trigger, null, null);
      
      const hiddenInput = findHiddenInput(trigger);
      if (hiddenInput) {
        hiddenInput.value = "";
      }
      
      updateDisplay(trigger);
    });
  });
  
  // Initialize timepickers
  function initTimepickers() {
    document.querySelectorAll('[data-tui-timepicker="true"]').forEach(trigger => {
      // Skip if already has state markers
      if (trigger.hasAttribute('data-tui-timepicker-state-initialized')) {
        return;
      }
      
      // Mark as initialized to prevent re-processing
      trigger.setAttribute('data-tui-timepicker-state-initialized', 'true');
      
      // Read initial value from hidden input
      const hiddenInput = findHiddenInput(trigger);
      const popup = findPopupElements(trigger)?.popup;
      
      const initialValue = hiddenInput?.value || popup?.getAttribute("data-tui-timepicker-value");
      if (initialValue) {
        const parsed = parseTimeString(initialValue);
        if (parsed) {
          setTimeOnTrigger(trigger, parsed.hour, parsed.minute);
        }
      }
      
      updateDisplay(trigger);
    });
  }
  
  // Initial setup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimepickers);
  } else {
    initTimepickers();
  }
  
  // Watch for dynamically added timepickers with debouncing
  let mutationTimeout;
  new MutationObserver(() => {
    clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(() => {
      initTimepickers();
    }, 10);
  }).observe(document.body, {
    childList: true,
    subtree: true
  });
})();