document.addEventListener('DOMContentLoaded', function () {
    const typeFilter = document.getElementById('type-filter');
    const locationFilter = document.getElementById('location-filter');
    const monthFilter = document.getElementById('month-filter');
    const events = document.querySelectorAll('.event');
    
    // Get today's date without time for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function filterEvents() {
      const selectedType = typeFilter.value.toLowerCase();
      const selectedLocation = locationFilter.value.toLowerCase();
      const selectedMonth = monthFilter.value.toLowerCase();

      events.forEach(event => {
        const eventType = event.getAttribute('data-type').toLowerCase();
        const eventLocation = event.getAttribute('data-location').toLowerCase();
        const eventMonth = event.getAttribute('data-month').toLowerCase();
        const eventDate = new Date(event.getAttribute('data-date'));

        // Check if the event is in the future
        const isUpcoming = eventDate >= today;

        const typeMatch = selectedType === 'all' || eventType === selectedType;
        const locationMatch = selectedLocation === 'all' || eventLocation === selectedLocation;
        const monthMatch = selectedMonth === 'all' || eventMonth === selectedMonth;

        if (isUpcoming && typeMatch && locationMatch && monthMatch) {
          event.style.display = 'flex';
        } else {
          event.style.display = 'none';
        }
      });
    }

    // Attach event listeners to filters
    typeFilter.addEventListener('change', filterEvents);
    locationFilter.addEventListener('change', filterEvents);
    monthFilter.addEventListener('change', filterEvents);

    // Reset Filters and Refresh Page
    window.resetFilters = function () {
      typeFilter.value = 'all';
      locationFilter.value = 'all';
      monthFilter.value = 'all';
      filterEvents();
    };

    // Initial filter to hide past events
    filterEvents();
  });

  const L = "https://www.facebook.com/profile.php?id=61555336797338";

  // After the DOM loads, set the href for all <a> elements that match.
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".lc-link").forEach(anchor => {
      anchor.href = L;
    });
  });