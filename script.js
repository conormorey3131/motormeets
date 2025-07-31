document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const typeFilter = document.getElementById('type-filter');
    const locationFilter = document.getElementById('location-filter');
    const monthFilter = document.getElementById('month-filter');
    const weekFilter = document.getElementById('week-filter');
    const calendarView = document.getElementById('calendar-view');
    const events = document.querySelectorAll('.event');
    
    // Get today's date without time for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initialize week filter
    function populateWeekFilter() {
        // Clear existing options except the first one
        while (weekFilter.options.length > 1) {
            weekFilter.remove(1);
        }
        
        // Get all event dates
        const eventDates = Array.from(events).map(event => 
            new Date(event.getAttribute('data-date'))
        ).filter(date => date >= today);
        
        // Sort dates
        eventDates.sort((a, b) => a - b);
        
        // Group by week
        const weeks = {};
        eventDates.forEach(date => {
            // Get the Monday of the week
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date);
            monday.setDate(diff);
            
            const weekKey = monday.toISOString().slice(0, 10);
            if (!weeks[weekKey]) {
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const mondayStr = `${monday.getDate()} ${monthNames[monday.getMonth()]}`;
                const sundayStr = `${sunday.getDate()} ${monthNames[sunday.getMonth()]}`;
                
                weeks[weekKey] = `${mondayStr} - ${sundayStr}`;
            }
        });
        
        // Add week options
        Object.entries(weeks).forEach(([key, label]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = label;
            weekFilter.appendChild(option);
        });
    }

    // Filter events based on selected criteria
    function filterEvents() {
        const selectedType = typeFilter.value.toLowerCase();
        const selectedLocation = locationFilter.value.toLowerCase();
        const selectedMonth = monthFilter.value.toLowerCase();
        const selectedWeek = weekFilter.value;
        
        // Filter events in calendar view
        events.forEach(event => {
            const eventType = event.getAttribute('data-type').toLowerCase();
            const eventLocation = event.getAttribute('data-location').toLowerCase();
            const eventMonth = event.getAttribute('data-month').toLowerCase();
            const eventDate = new Date(event.getAttribute('data-date'));
            
            // Check if the event is in the future
            const isUpcoming = eventDate >= today;
            
            // Check if event is in selected week
            let weekMatch = true;
            if (selectedWeek !== 'all') {
                const selectedWeekDate = new Date(selectedWeek);
                const day = eventDate.getDay();
                const diff = eventDate.getDate() - day + (day === 0 ? -6 : 1);
                const eventMonday = new Date(eventDate);
                eventMonday.setDate(diff);
                
                weekMatch = eventMonday.toISOString().slice(0, 10) === selectedWeek;
            }
            
            const typeMatch = selectedType === 'all' || eventType === selectedType;
            const locationMatch = selectedLocation === 'all' || eventLocation === selectedLocation;
            const monthMatch = selectedMonth === 'all' || eventMonth === selectedMonth;
            
            if (isUpcoming && typeMatch && locationMatch && monthMatch && weekMatch) {
                event.style.display = 'flex';
                event.classList.add('visible');
            } else {
                event.style.display = 'none';
                event.classList.remove('visible');
            }
        });
    }
    
    // Attach event listeners
    typeFilter.addEventListener('change', filterEvents);
    locationFilter.addEventListener('change', filterEvents);
    monthFilter.addEventListener('change', filterEvents);
    weekFilter.addEventListener('change', filterEvents);
    
    // Reset Filters and Refresh Page
    window.resetFilters = function () {
        typeFilter.value = 'all';
        locationFilter.value = 'all';
        monthFilter.value = 'all';
        weekFilter.value = 'all';
        filterEvents();
    };
    
    // Initialize
    populateWeekFilter();
    filterEvents();
    
    // Add visible class to all visible events initially
    events.forEach(event => {
        if (event.style.display !== 'none') {
            event.classList.add('visible');
        }
    });
});

const FB_LINK = "https://www.facebook.com/profile.php?id=61555336797338";

// After the DOM loads, set the href for all <a> elements that match.
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".lc-link").forEach(anchor => {
        anchor.href = FB_LINK;
    });
});