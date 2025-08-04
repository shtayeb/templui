(function () {
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

  function updateHourSelection(hourList, selectedHour, use12Hours) {
    hourList.querySelectorAll('[data-tui-timepicker-hour]').forEach(button => {
      const hour = parseInt(button.getAttribute('data-tui-timepicker-hour'));
      let isSelected = false;
      
      if (selectedHour !== null) {
        if (use12Hours) {
          // In 12-hour mode, check both AM and PM versions
          isSelected = (hour === selectedHour) || 
                      (hour === 0 && selectedHour === 12) || 
                      (hour === selectedHour - 12 && selectedHour > 12);
        } else {
          isSelected = hour === selectedHour;
        }
      }
      
      button.setAttribute('data-tui-timepicker-selected', isSelected ? 'true' : 'false');
    });
  }

  function updateMinuteSelection(minuteList, selectedMinute) {
    minuteList.querySelectorAll('[data-tui-timepicker-minute]').forEach(button => {
      const minute = parseInt(button.getAttribute('data-tui-timepicker-minute'));
      button.setAttribute('data-tui-timepicker-selected', minute === selectedMinute ? 'true' : 'false');
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

  function updateTimeDisplay(triggerButton, hour, minute, use12Hours, placeholder) {
    const displaySpan = triggerButton.querySelector("[data-tui-timepicker-display]");
    if (!displaySpan) return;

    if (hour !== null && minute !== null) {
      const formattedTime = formatTime(hour, minute, use12Hours);
      displaySpan.textContent = formattedTime;
      displaySpan.classList.remove("text-muted-foreground");
    } else {
      displaySpan.textContent = placeholder;
      displaySpan.classList.add("text-muted-foreground");
    }
  }

  function updateHiddenInput(popup, hour, minute) {
    const hiddenInput = popup.querySelector("[data-tui-timepicker-hidden-input]");
    if (!hiddenInput) return;

    if (hour !== null && minute !== null) {
      hiddenInput.value = formatTimeValue(hour, minute);
    } else {
      hiddenInput.value = "";
    }
  }

  function initTimePicker(triggerButton) {
    if (!triggerButton || triggerButton.hasAttribute("data-tui-timepicker-initialized")) return;
    triggerButton.setAttribute("data-tui-timepicker-initialized", "true");

    const timePickerID = triggerButton.id;
    const popupId = timePickerID + "-content";
    
    const use12Hours = triggerButton.getAttribute("data-tui-timepicker-use12hours") === "true";
    const amLabel = triggerButton.getAttribute("data-tui-timepicker-am-label") || "AM";
    const pmLabel = triggerButton.getAttribute("data-tui-timepicker-pm-label") || "PM";
    const placeholder = triggerButton.getAttribute("data-tui-timepicker-placeholder") || "Select time";

    let currentHour = null;
    let currentMinute = null;

    // Find popup and its elements
    const popupContent = document.getElementById(popupId);
    if (!popupContent) {
      console.error("TimePicker init error: Missing popup content.", { timePickerID, popupId });
      return;
    }

    const popup = popupContent.querySelector("[data-tui-timepicker-popup]");
    const hourList = popup?.querySelector("[data-tui-timepicker-hour-list]");
    const minuteList = popup?.querySelector("[data-tui-timepicker-minute-list]");
    const doneButton = popup?.querySelector("[data-tui-timepicker-done]");

    if (!popup || !hourList || !minuteList || !doneButton) {
      console.error("TimePicker init error: Missing required elements.", {
        timePickerID, popup, hourList, minuteList, doneButton
      });
      return;
    }

    // Initialize with existing value if any
    const initialValue = popup.getAttribute("data-tui-timepicker-value");
    if (initialValue) {
      const parsed = parseTimeString(initialValue);
      if (parsed) {
        currentHour = parsed.hour;
        currentMinute = parsed.minute;
      }
    }

    function refreshDisplay() {
      updateTimeDisplay(triggerButton, currentHour, currentMinute, use12Hours, placeholder);
      updateHiddenInput(popup, currentHour, currentMinute);
      updateHourSelection(hourList, currentHour, use12Hours);
      updateMinuteSelection(minuteList, currentMinute);
      if (use12Hours) {
        updatePeriodButtons(popup, currentHour);
      }
    }

    // Hour selection
    hourList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tui-timepicker-hour]");
      if (!button) return;
      
      let selectedHour = parseInt(button.getAttribute("data-tui-timepicker-hour"), 10);
      
      // Handle 12-hour format conversion
      if (use12Hours) {
        // Determine if we should be in AM or PM based on current selection
        const isPM = currentHour !== null && currentHour >= 12;
        
        if (selectedHour === 0) {
          // This is the "12" button
          selectedHour = isPM ? 12 : 0; // 12 PM or 12 AM
        } else {
          // This is 1-11
          selectedHour = isPM ? selectedHour + 12 : selectedHour;
        }
      }
      
      currentHour = selectedHour;
      // Don't auto-set minute to 0, let user choose
      refreshDisplay();
    });

    // Minute selection
    minuteList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tui-timepicker-minute]");
      if (!button) return;
      
      currentMinute = parseInt(button.getAttribute("data-tui-timepicker-minute"), 10);
      // Don't auto-set hour, let user choose
      refreshDisplay();
    });

    // Period selection (AM/PM)
    if (use12Hours) {
      popup.addEventListener("click", (event) => {
        const periodButton = event.target.closest("[data-tui-timepicker-period]");
        if (!periodButton) return;
        
        const period = periodButton.getAttribute("data-tui-timepicker-period");
        // Only change period if hour is already selected
        if (currentHour === null) return;
        
        if (period === "AM") {
          if (currentHour >= 12) {
            currentHour = currentHour === 12 ? 0 : currentHour - 12;
          }
        } else if (period === "PM") {
          if (currentHour < 12) {
            currentHour = currentHour === 0 ? 12 : currentHour + 12;
          }
        }
        
        refreshDisplay();
      });
    }

    // Done button
    doneButton.addEventListener("click", () => {
      // Find and click the popover trigger to close it
      const popoverTrigger = triggerButton.closest("[data-tui-popover]")?.querySelector("[data-tui-popover-trigger]");
      if (popoverTrigger instanceof HTMLElement) {
        popoverTrigger.click();
      } else {
        triggerButton.click(); // Fallback
      }
    });

    // Initial display
    refreshDisplay();

    // Form reset support
    const form = triggerButton.closest("form");
    if (form) {
      form.addEventListener("reset", () => {
        currentHour = null;
        currentMinute = null;
        refreshDisplay();
      });
    }

    // Store cleanup function
    triggerButton._timePickerCleanup = () => {
      // Event listeners are automatically cleaned up when elements are removed
    };
  }

  function init(root = document) {
    if (root instanceof Element && root.matches('[data-tui-timepicker="true"]')) {
      initTimePicker(root);
    }
    root
      .querySelectorAll('[data-tui-timepicker="true"]:not([data-tui-timepicker-initialized])')
      .forEach((triggerButton) => {
        initTimePicker(triggerButton);
      });
  }

  window.templUI = window.templUI || {};
  window.templUI.timePicker = { init: init };

  document.addEventListener("DOMContentLoaded", () => init());
})();