(function () {
  'use strict';
  
  // Utility functions
  function parseISODate(isoStr) {
    if (!isoStr) return null;
    const parts = isoStr.split("-");
    if (parts.length !== 3) return null;
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(Date.UTC(year, month, day));
    
    if (date.getUTCFullYear() === year && 
        date.getUTCMonth() === month && 
        date.getUTCDate() === day) {
      return date;
    }
    return null;
  }
  
  function getMonthNames(locale) {
    try {
      return Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(locale, {
          month: "long",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2000, i, 1)))
      );
    } catch {
      return ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"];
    }
  }
  
  function getDayNames(locale, startOfWeek) {
    try {
      return Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
          new Date(Date.UTC(2000, 0, i + 2 + startOfWeek))
        )
      );
    } catch {
      return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    }
  }
  
  // Get calendar state from DOM
  function getState(container) {
    return {
      currentMonth: parseInt(container.dataset.tuiCalendarCurrentMonth) || new Date().getMonth(),
      currentYear: parseInt(container.dataset.tuiCalendarCurrentYear) || new Date().getFullYear(),
      selectedDate: container.dataset.tuiCalendarSelectedDate ? parseISODate(container.dataset.tuiCalendarSelectedDate) : null,
      locale: container.getAttribute("data-tui-calendar-locale-tag") || "en-US",
      startOfWeek: parseInt(container.getAttribute("data-tui-calendar-start-of-week")) || 1
    };
  }
  
  function setState(container, month, year, selectedDate = null) {
    container.dataset.tuiCalendarCurrentMonth = month;
    container.dataset.tuiCalendarCurrentYear = year;
    if (selectedDate) {
      container.dataset.tuiCalendarSelectedDate = selectedDate.toISOString().split("T")[0];
    } else {
      delete container.dataset.tuiCalendarSelectedDate;
    }
  }
  
  function findHiddenInput(container) {
    // Check wrapper first
    const wrapper = container.closest("[data-tui-calendar-wrapper]");
    let hiddenInput = wrapper?.querySelector("[data-tui-calendar-hidden-input]");
    
    // For datepicker integration
    if (!hiddenInput && container.id) {
      const parentId = container.id.replace("-calendar-instance", "");
      hiddenInput = document.getElementById(parentId + "-hidden");
    }
    
    return hiddenInput;
  }
  
  function renderCalendar(container) {
    const state = getState(container);
    const monthDisplay = container.querySelector("[data-tui-calendar-month-display]");
    const weekdaysContainer = container.querySelector("[data-tui-calendar-weekdays]");
    const daysContainer = container.querySelector("[data-tui-calendar-days]");
    
    if (!monthDisplay || !weekdaysContainer || !daysContainer) return;
    
    // Update month display
    const monthNames = getMonthNames(state.locale);
    monthDisplay.textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
    
    // Render weekdays if empty
    if (!weekdaysContainer.children.length) {
      const dayNames = getDayNames(state.locale, state.startOfWeek);
      weekdaysContainer.innerHTML = dayNames
        .map(day => `<div class="text-center text-xs text-muted-foreground font-medium">${day}</div>`)
        .join("");
    }
    
    // Render days
    daysContainer.innerHTML = "";
    
    const firstDay = new Date(Date.UTC(state.currentYear, state.currentMonth, 1));
    const startOffset = (((firstDay.getUTCDay() - state.startOfWeek) % 7) + 7) % 7;
    const daysInMonth = new Date(Date.UTC(state.currentYear, state.currentMonth + 1, 0)).getUTCDate();
    
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    
    // Add empty cells for offset
    for (let i = 0; i < startOffset; i++) {
      daysContainer.innerHTML += '<div class="h-8 w-8"></div>';
    }
    
    // Add day buttons
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(Date.UTC(state.currentYear, state.currentMonth, day));
      const isSelected = state.selectedDate && currentDate.getTime() === state.selectedDate.getTime();
      const isToday = currentDate.getTime() === todayUTC.getTime();
      
      let classes = "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring";
      
      if (isSelected) {
        classes += " bg-primary text-primary-foreground hover:bg-primary/90";
      } else if (isToday) {
        classes += " bg-accent text-accent-foreground";
      } else {
        classes += " hover:bg-accent hover:text-accent-foreground";
      }
      
      daysContainer.innerHTML += `<button type="button" class="${classes}" data-tui-calendar-day="${day}">${day}</button>`;
    }
  }
  
  // Event delegation for calendar navigation and selection
  document.addEventListener("click", (e) => {
    // Previous month
    const prevBtn = e.target.closest("[data-tui-calendar-prev]");
    if (prevBtn) {
      const container = prevBtn.closest("[data-tui-calendar-container]");
      if (!container) return;
      
      const state = getState(container);
      let month = state.currentMonth - 1;
      let year = state.currentYear;
      
      if (month < 0) {
        month = 11;
        year--;
      }
      
      setState(container, month, year, state.selectedDate);
      renderCalendar(container);
      return;
    }
    
    // Next month
    const nextBtn = e.target.closest("[data-tui-calendar-next]");
    if (nextBtn) {
      const container = nextBtn.closest("[data-tui-calendar-container]");
      if (!container) return;
      
      const state = getState(container);
      let month = state.currentMonth + 1;
      let year = state.currentYear;
      
      if (month > 11) {
        month = 0;
        year++;
      }
      
      setState(container, month, year, state.selectedDate);
      renderCalendar(container);
      return;
    }
    
    // Day selection
    if (e.target.matches("[data-tui-calendar-day]")) {
      const container = e.target.closest("[data-tui-calendar-container]");
      if (!container) return;
      
      const state = getState(container);
      const day = parseInt(e.target.dataset.tuiCalendarDay);
      const selectedDate = new Date(Date.UTC(state.currentYear, state.currentMonth, day));
      
      setState(container, state.currentMonth, state.currentYear, selectedDate);
      
      // Update hidden input
      const hiddenInput = findHiddenInput(container);
      if (hiddenInput) {
        hiddenInput.value = selectedDate.toISOString().split("T")[0];
        hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      
      // Dispatch custom event
      container.dispatchEvent(
        new CustomEvent("calendar-date-selected", {
          bubbles: true,
          detail: { date: selectedDate }
        })
      );
      
      renderCalendar(container);
    }
  });
  
  // Form reset handling
  document.addEventListener("reset", (e) => {
    if (!e.target.matches("form")) return;
    
    e.target.querySelectorAll("[data-tui-calendar-container]").forEach(container => {
      const hiddenInput = findHiddenInput(container);
      if (hiddenInput) {
        hiddenInput.value = "";
      }
      
      const today = new Date();
      setState(container, today.getMonth(), today.getFullYear(), null);
      renderCalendar(container);
    });
  });
  
  // MutationObserver for initial rendering
  new MutationObserver(() => {
    document.querySelectorAll('[data-tui-calendar-container]:not([data-rendered])').forEach(container => {
      container.setAttribute('data-rendered', 'true');
      
      // Set initial state from attributes
      const initialMonth = parseInt(container.getAttribute("data-tui-calendar-initial-month"));
      const initialYear = parseInt(container.getAttribute("data-tui-calendar-initial-year"));
      const selectedDate = container.getAttribute("data-tui-calendar-selected-date");
      
      setState(
        container,
        !isNaN(initialMonth) ? initialMonth : new Date().getMonth(),
        !isNaN(initialYear) ? initialYear : new Date().getFullYear(),
        selectedDate ? parseISODate(selectedDate) : null
      );
      
      renderCalendar(container);
    });
  }).observe(document.body, { childList: true, subtree: true });
})();