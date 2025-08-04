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

  function createTimeButton(value, label, isSelected) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `w-full px-2 py-1 text-sm rounded hover:bg-muted transition-colors text-left ${
      isSelected ? "bg-primary text-primary-foreground" : ""
    }`;
    button.textContent = label;
    button.setAttribute("data-tui-timepicker-time-value", value.toString());
    return button;
  }

  function populateHours(container, use12Hours, selectedHour) {
    container.innerHTML = "";
    
    if (use12Hours) {
      // 12-hour format: 12, 1, 2, ..., 11
      for (let displayHour = 12; displayHour <= 12; displayHour++) {
        const value = 0; // 12 AM = 0 hours
        const label = "12";
        const isSelected = selectedHour === 0 || selectedHour === 12;
        const button = createTimeButton(value, label, isSelected);
        container.appendChild(button);
        break;
      }
      for (let displayHour = 1; displayHour <= 11; displayHour++) {
        const value = displayHour;
        const label = displayHour.toString().padStart(2, "0");
        const isSelected = selectedHour === displayHour || selectedHour === (displayHour + 12);
        const button = createTimeButton(value, label, isSelected);
        container.appendChild(button);
      }
    } else {
      // 24-hour format: 00, 01, 02, ..., 23
      for (let hour = 0; hour < 24; hour++) {
        const label = hour.toString().padStart(2, "0");
        const isSelected = selectedHour === hour;
        const button = createTimeButton(hour, label, isSelected);
        container.appendChild(button);
      }
    }
  }

  function populateMinutes(container, selectedMinute) {
    container.innerHTML = "";
    for (let minute = 0; minute < 60; minute++) {
      const label = minute.toString().padStart(2, "0");
      const isSelected = selectedMinute === minute;
      const button = createTimeButton(minute, label, isSelected);
      container.appendChild(button);
    }
  }

  function updatePeriodButtons(popup, hour, amLabel, pmLabel) {
    const amButton = popup.querySelector('[data-tui-timepicker-period="AM"]');
    const pmButton = popup.querySelector('[data-tui-timepicker-period="PM"]');
    
    if (!amButton || !pmButton) return;

    const isAM = hour < 12;
    
    amButton.textContent = amLabel;
    pmButton.textContent = pmLabel;
    
    amButton.className = `px-3 py-1 text-sm rounded-md border hover:bg-muted transition-colors ${
      isAM ? "bg-primary text-primary-foreground" : ""
    }`;
    pmButton.className = `px-3 py-1 text-sm rounded-md border hover:bg-muted transition-colors ${
      !isAM ? "bg-primary text-primary-foreground" : ""
    }`;
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
      populateHours(hourList, use12Hours, currentHour);
      populateMinutes(minuteList, currentMinute);
      if (use12Hours && currentHour !== null) {
        updatePeriodButtons(popup, currentHour, amLabel, pmLabel);
      }
    }

    // Hour selection
    hourList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tui-timepicker-time-value]");
      if (!button) return;
      
      let selectedHour = parseInt(button.getAttribute("data-tui-timepicker-time-value"), 10);
      
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
      if (currentMinute === null) currentMinute = 0;
      refreshDisplay();
    });

    // Minute selection
    minuteList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tui-timepicker-time-value]");
      if (!button) return;
      
      currentMinute = parseInt(button.getAttribute("data-tui-timepicker-time-value"), 10);
      if (currentHour === null) currentHour = use12Hours ? 12 : 0;
      refreshDisplay();
    });

    // Period selection (AM/PM)
    if (use12Hours) {
      popup.addEventListener("click", (event) => {
        const periodButton = event.target.closest("[data-tui-timepicker-period]");
        if (!periodButton) return;
        
        const period = periodButton.getAttribute("data-tui-timepicker-period");
        if (currentHour === null) currentHour = 12;
        if (currentMinute === null) currentMinute = 0;
        
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