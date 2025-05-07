document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const typeFilter = document.getElementById('type-filter');
    const locationFilter = document.getElementById('location-filter');
    const monthFilter = document.getElementById('month-filter');
    const weekFilter = document.getElementById('week-filter');
    const viewToggle = document.getElementById('view-toggle');
    const calendarView = document.getElementById('calendar-view');
    const mapView = document.getElementById('map-view');
    const events = document.querySelectorAll('.event');
    
    // Get today's date without time for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Map variables
    let map;
    let markers = [];
    let markerLayer;
    
    // County coordinates for Ireland (approximate centers)
    const countyCoordinates = {
        'antrim': [54.7214, -6.2051],
        'armagh': [54.3503, -6.6528],
        'carlow': [52.8408, -6.9261],
        'cavan': [53.9897, -7.3633],
        'clare': [52.9019, -9.0018],
        'cork': [51.8986, -8.4706],
        'derry': [54.9966, -7.3086],
        'donegal': [54.6538, -8.1096],
        'down': [54.3352, -5.7190],
        'dublin': [53.3498, -6.2603],
        'fermanagh': [54.3438, -7.6310],
        'galway': [53.2707, -9.0568],
        'kerry': [52.1543, -9.5671],
        'kildare': [53.1589, -6.9096],
        'kilkenny': [52.6541, -7.2448],
        'laois': [53.0324, -7.3599],
        'leitrim': [54.1244, -8.0014],
        'leitirm': [54.1244, -8.0014], // Handle misspelling in data
        'limerick': [52.6638, -8.6267],
        'longford': [53.7276, -7.7940],
        'louth': [53.9508, -6.5392],
        'mayo': [53.8546, -9.3018],
        'meath': [53.6055, -6.6564],
        'monaghan': [54.2492, -6.9683],
        'offaly': [53.2390, -7.7129],
        'roscommon': [53.6276, -8.1892],
        'sligo': [54.2766, -8.4761],
        'tipperary': [52.4738, -8.1619],
        'tyrone': [54.5973, -7.3100],
        'waterford': [52.2593, -7.1101],
        'westmeath': [53.5345, -7.4653],
        'wexford': [52.3369, -6.4633],
        'wicklow': [52.9808, -6.0446],
        // Default for unknown locations
        'default': [53.4129, -8.2439] // Center of Ireland
    };
    
    // Event type colors (matching CSS)
    const eventColors = {
        'rally': '#1e7a41',
        'show': '#007bff',
        'run': '#ffc107',
        'trackday': '#e83e8c',
        'ids': '#17a2b8',
        'dr': '#6c757d',
        'sd': '#6610f2',
        'bee': '#fd7e14'
    };

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
        
        // Update map markers if map is initialized
        if (map && markerLayer) {
            updateMapMarkers();
        }
    }
    
    // Initialize Leaflet map - this is now handled by the direct script in index.html
    function initMap() {
        console.log("Map initialization is now handled by the direct script in index.html");
        
        // If map already exists (created by the direct script), just update markers
        if (window.map) {
            console.log("Using existing map from direct initialization");
            map = window.map;
            
            // Force map to update its size
            map.invalidateSize(true);
            console.log("Map size invalidated for existing map");
            
            // Update markers based on current filters
            updateMapMarkers();
        }
    }
    
    // Update map markers based on filtered events
    function updateMapMarkers() {
        // Clear existing markers
        markerLayer.clearLayers();
        markers = [];
        
        // Add markers for visible events
        document.querySelectorAll('.event.visible').forEach(event => {
            const eventType = event.getAttribute('data-type').toLowerCase();
            const eventLocation = event.getAttribute('data-location').toLowerCase();
            const eventTitle = event.querySelector('h3').textContent;
            const eventDate = event.querySelector('.event-date').textContent;
            const eventDesc = event.querySelector('p:nth-of-type(2)').textContent;
            
            // Skip events with no location
            if (!eventLocation || eventLocation === '') return;
            
            // Get coordinates for the county
            let coords = countyCoordinates[eventLocation.toLowerCase()];
            if (!coords) {
                // Try to extract county from location string
                const locationParts = eventLocation.split(',');
                for (const part of locationParts) {
                    const trimmed = part.trim().toLowerCase();
                    if (countyCoordinates[trimmed]) {
                        coords = countyCoordinates[trimmed];
                        break;
                    }
                }
                
                // If still no coords, use default
                if (!coords) {
                    coords = countyCoordinates.default;
                }
            }
            
            // Add a small random offset to prevent markers from stacking exactly
            const lat = coords[0] + (Math.random() - 0.5) * 0.05;
            const lng = coords[1] + (Math.random() - 0.5) * 0.05;
            
            // Create marker with custom icon
            const color = eventColors[eventType] || '#1e7a41';
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${color}; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [15, 15],
                iconAnchor: [7.5, 7.5]
            });
            
            const marker = L.marker([lat, lng], { icon: icon });
            
            // Create popup content
            const popupContent = `
                <div class="event-popup">
                    <h3>${eventTitle}</h3>
                    <p>${eventDate}</p>
                    <p>${eventDesc}</p>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.addTo(markerLayer);
            markers.push(marker);
        });
    }
    
    // Toggle between calendar and map views
    function toggleView() {
        if (viewToggle.checked) {
            // Show map view
            calendarView.style.display = 'none';
            mapView.style.display = 'block';
            
            // Initialize map with a slight delay to ensure container is visible
            setTimeout(function() {
                initMap();
                // Force map to update its size
                if (map) {
                    map.invalidateSize();
                    console.log("Map size invalidated");
                }
            }, 100);
        } else {
            // Show calendar view
            calendarView.style.display = 'grid';
            mapView.style.display = 'none';
        }
    }
    
    // Attach event listeners
    typeFilter.addEventListener('change', filterEvents);
    locationFilter.addEventListener('change', filterEvents);
    monthFilter.addEventListener('change', filterEvents);
    weekFilter.addEventListener('change', filterEvents);
    viewToggle.addEventListener('change', toggleView);
    
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
    toggleView();
    
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
