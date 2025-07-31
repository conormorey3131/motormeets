# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Motor Meets Ireland is a static website that displays automotive events across Ireland. It features a dual-view system (calendar and map) with multi-criteria filtering capabilities.

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (no frameworks)
- **Map Library**: Leaflet.js v1.9.4 with OpenStreetMap tiles
- **Hosting**: GitHub Pages with custom domain (motormeets.ie)
- **No build process**: Direct file editing, no compilation required

## Key Architecture Patterns

### Event Data Structure
Events are embedded directly in HTML with data attributes:
```html
<div class="event-card" data-type="show" data-location="cork" data-month="1" data-week="4">
```

Event types: `rally`, `show`, `run`, `trackday`, `ids`, `dr`, `bee`, `sd`

### JavaScript Organization
- All functionality in `script.js`
- Event filtering logic based on data attributes
- Map markers generated from JavaScript array with coordinates

### CSS Architecture
- Mobile-first responsive design (breakpoints: 768px, 480px)
- Primary color: `#1e7a41` (green)
- BEM-like naming conventions

## Development Commands

Since this is a static site with no build process:
- **Run locally**: Open `index.html` in a browser or use a local server (e.g., `python -m http.server`)
- **Deploy**: Push to GitHub, automatically deployed via GitHub Pages

## Important Implementation Details

### Adding New Events
1. Add event HTML in `index.html` with proper data attributes
2. Add corresponding map data in `script.js` (eventData array)
3. Ensure county coordinates exist in `countyCoordinates` object

### Map View Implementation
- County-based fallback coordinates for general locations
- Event-specific coordinates override county defaults
- Custom marker colors based on event type

### Filtering System
- Filters work on both calendar and map views
- Multiple filters can be active simultaneously
- "Show All" buttons reset individual filter categories

## File Structure

```
├── index.html        # Main calendar view with embedded events
├── map-view.html     # Dedicated map view page
├── script.js         # All JavaScript functionality
├── style.css         # Main stylesheet
├── CNAME            # GitHub Pages domain config
└── motorMeets/      # Subdirectory with minimal event listing
```

## Common Tasks

### Update Event Information
Events are hard-coded in `index.html`. Search for `<div class="event-card"` to find and modify events.

### Add New Event Type
1. Add new type option in filter dropdown in `index.html`
2. Add corresponding CSS class in `style.css` if custom styling needed
3. Update event type colors in map markers if applicable

### Modify Map Behavior
Map initialization and marker logic in `script.js` starting at `initializeMap()` function.