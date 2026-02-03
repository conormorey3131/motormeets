# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Motor Meets Ireland is a static website that displays automotive events across Ireland. It features a calendar view with event filtering, a separate map view, and an event submission system.

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (no frameworks)
- **Fonts**: Google Fonts (Montserrat)
- **Map Library**: Leaflet.js v1.9.4 with OpenStreetMap tiles (map-view.html)
- **Form Handling**: Formspree for event submissions
- **Hosting**: GitHub Pages with custom domain (motormeets.ie)
- **No build process**: Direct file editing, no compilation required

## Key Architecture Patterns

### Event Data Structure
Events are embedded directly in HTML with data attributes:
```html
<div class="event" data-type="show" data-location="Louth" data-month="January" data-date="2025-01-05">
```

Event types: `rally`, `show`, `run`, `Trackday`, `drift`, `ids` (Irish Drift Series), `dr` (Slab Day), `bee` (Bumblebee 1000), `sd` (Buggy Championship)

### JavaScript Organization
- Main filtering logic in `script.js` for calendar view
- Inline JavaScript in `map-view.html` for map functionality
- Dynamic week filter generation based on event dates
- Past events automatically hidden (date comparison with today)
- Facebook link management through `FB_LINK` constant

### CSS Architecture
- Mobile-first responsive design
- Primary color: `#1e7a41` (green)
- Gradient header: `linear-gradient(135deg, #1e7a41, #2ca45d)`
- Shared `style.css` across pages

## Development Commands

Since this is a static site with no build process:
- **Run locally**: Open `index.html` in a browser or use a local server (e.g., `python -m http.server`)
- **Deploy**: Push to GitHub, automatically deployed via GitHub Pages

## Important Implementation Details

### Event Management
1. Events stored directly in HTML with `class="event"` and data attributes
2. Date format: `data-date="YYYY-MM-DD"`
3. Events automatically filtered to show only upcoming (future) events
4. Week filter dynamically populated based on available event dates

### Map View Implementation
- Separate page (`map-view.html`) with embedded event data
- Leaflet.js map centered on Ireland
- Events embedded as JavaScript array within the HTML
- Filter controls for type, location, and month

### Event Submission
- Form at `submit-event.html` 
- Processed via Formspree to `motormeets.ie@gmail.com`
- Success page at `submission-success.html`
- Fields: event name, type, date, location, description, website, organizer info

### Sponsors Section
- Featured partner: Morey Digital (moreydigital.ie)
- Premium sponsor section with modern dark theme design
- Consistent across calendar and map views

## File Structure

```
├── index.html               # Main calendar view with embedded events
├── map-view.html           # Dedicated map view page with inline JS
├── submit-event.html       # Event submission form
├── submission-success.html # Form submission success page
├── script.js               # Calendar view filtering logic
├── style.css               # Main stylesheet for all pages
├── logo.webp               # Site logo
├── favicon.ico            # Site favicon
├── CNAME                  # GitHub Pages domain config (motormeets.ie)
└── motorMeets/            # Subdirectory with minimal event listing
    └── index.html         # Basic event list
```

## Common Tasks

### Update Event Information
Events are hard-coded in `index.html`. Search for `<div class="event"` to find and modify events. Each event needs:
- `data-type`: Event type
- `data-location`: County name
- `data-month`: Month name (full, e.g., "January")
- `data-date`: ISO date format (YYYY-MM-DD)

### Add New Event Type
1. Add new type option in filter dropdown in both `index.html` and `map-view.html`
2. Update `submit-event.html` form options if needed
3. Add corresponding CSS styling if needed

### Modify Filters
- Type filter: Update `<select id="type-filter">` options
- Location filter: Update `<select id="location-filter">` with counties
- Month filter: Standard 12 months
- Week filter: Auto-generated based on event dates

### Social Media Integration
- Instagram link in header: @motormeets.ie
- Facebook link managed via `FB_LINK` constant in script.js