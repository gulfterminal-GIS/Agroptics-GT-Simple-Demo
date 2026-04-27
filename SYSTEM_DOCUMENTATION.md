# Agroptics System Documentation

**Version:** 2.0  
**Last Updated:** April 2026  
**Purpose:** Complete system reference for AI assistants and developers

---

## 🎯 System Overview

Agroptics is a web-based satellite imagery monitoring system for agricultural fields. It displays real satellite data from GeoTIFF files, processes them into interactive charts, and provides field analysis tools with advanced timeline playback and comparison features.

### Core Purpose
- Monitor crop health using satellite vegetation indices
- Visualize time-series data across multiple metrics
- Overlay actual satellite imagery on interactive maps
- Animate satellite imagery over time with synchronized chart updates
- Compare satellite imagery with base maps using swipe control
- Support custom GIS file uploads for field boundaries
- Draw and measure polygons, circles, and distances on the map

### Technology Stack
- **Frontend:** Vanilla JavaScript (no frameworks)
- **Mapping:** Leaflet.js v1.9.4
- **Drawing Tools:** Leaflet.draw v1.0.4
- **Charts:** Chart.js v4.4.0 with Annotation Plugin v3.0.1
- **Raster Processing:** GeoTIFF.js v2.1.3
- **GIS Parsing:** shp.js, toGeoJSON
- **Hosting:** GitHub Pages (static site)

---

## 📁 File Structure

```
Project Root/
├── index.html                          # Main application (1153 lines)
├── app.js                              # Core logic (1645 lines)
├── package.json                        # Dependencies
├── package-lock.json                   # Locked dependencies
│
├── data/                               # Preprocessed JSON data
│   ├── Field_10_dates.json            # Available dates for Field 10
│   ├── Field_10_timeseries.json       # Statistics for Field 10
│   ├── Field_11_dates.json
│   ├── Field_11_timeseries.json
│   ├── Field_12_and_13_dates.json
│   └── Field_12_and_13_timeseries.json
│
├── exports/                            # Satellite imagery (GeoTIFF)
│   ├── Field_10/
│   │   ├── 2025-03-29/
│   │   │   ├── ETc_NDVI.tif
│   │   │   ├── NDVI.tif
│   │   │   ├── FC.tif
│   │   │   ├── GCI.tif
│   │   │   ├── MSAVI.tif
│   │   │   └── RECI.tif
│   │   ├── 2025-04-01/
│   │   └── ... (170+ dates)
│   ├── Field_11/
│   └── Field_12_and_13/
│
├── Field_10.geojson                    # Field boundary polygons
├── Field_11.geojson
├── Field_12_and_13.geojson
│
└── preprocess-data-template.js         # Data preprocessing script
```


---

## 🏗️ System Architecture

### Application State (AppState Object)
```javascript
const AppState = {
    map: null,                    // Leaflet map instance
    selectedField: null,          // Currently selected field ID
    fieldLayers: {},              // Leaflet layers for each field
    fieldData: {},                // Field properties (name, crop, size)
    charts: {},                   // Chart.js instances
    currentCategory: 'et',        // Active chart category
    categoryData: null,           // Processed time-series data
    imageOverlay: null,           // Current satellite image overlay
    availableDates: [],           // Dates with imagery for selected field
    selectedDate: null,           // Currently selected date
    currentCalendarMonth: new Date(),
    uploadedLayers: [],           // User-uploaded GIS layers
    drawnItems: null,             // Leaflet FeatureGroup for drawn shapes
    swipeSlider: null             // Swipe comparison control element
};

const TimelineState = {
    isPlaying: false,             // Timeline playback status
    currentIndex: 0,              // Current frame index
    dates: [],                    // Available dates for timeline
    playInterval: null,           // Playback interval timer
    speed: 1000,                  // Playback speed in milliseconds
    loop: false,                  // Loop playback enabled
    preloadedImages: {}           // Cache for preloaded images
};
```

### Field Configuration
```javascript
const FIELD_CONFIGS = {
    'Field_10': {
        color: '#4CAF50',
        name: 'Field 10',
        geojsonFile: 'Field_10.geojson'
    },
    'Field_11': {
        color: '#2196F3',
        name: 'Field 11',
        geojsonFile: 'Field_11.geojson'
    },
    'Field_12_and_13': {
        color: '#FF9800',
        name: 'Field 12 & 13',
        geojsonFile: 'Field_12_and_13.geojson'
    }
};
```


---

## 🔄 Application Workflow

### 1. Initialization Flow
```
Page Load
  ↓
DOMContentLoaded Event
  ↓
initializeMap()           → Create Leaflet map with satellite/street layers
  ↓
loadAllFields()           → Load 3 field GeoJSON files
  ↓
  ├─ addFieldToMap()      → Add polygons to map with tooltips
  └─ addFieldCard()       → Create sidebar field cards
  ↓
setupAnalysisSection()    → Setup tab switching
  ↓
setupImageOverlayControls() → Setup calendar and controls
  ↓
setupFileUpload()         → Setup drag-drop file upload
```

### 2. Field Selection Flow
```
User Clicks Field Card
  ↓
zoomToField(fieldId)
  ↓
  ├─ Update active card styling
  ├─ Fly map to field bounds
  └─ Flash field polygon (6 times)
  ↓
loadFieldDates(fieldId)   → Load available dates from JSON
  ↓
openAnalysisSection()
  ↓
  ├─ populateFieldInfo()  → Display field properties
  └─ populatePlanetTab()  → Create category tabs and charts
      ↓
      loadFieldData(fieldId)
        ↓
        fetch(`data/${fieldId}_timeseries.json`)
        ↓
        processTimeSeriesData()  → Extract mean values
        ↓
        createCategoryChart() × 6  → Create all charts
```

### 3. Image Overlay Flow
```
User Selects Date from Calendar
  ↓
User Selects Index (NDVI, ETc_NDVI, etc.)
  ↓
User Clicks "Show Image"
  ↓
displayImageOverlay()
  ↓
  ├─ Construct path: exports/Field_X/YYYY-MM-DD/INDEX.tif
  ├─ Fetch GeoTIFF file
  ├─ Parse with GeoTIFF.js
  ├─ Extract raster data and bounds
  ├─ Normalize values to 0-255
  ├─ Apply color scale (viridis)
  ├─ Create canvas with colored pixels
  └─ Add as Leaflet ImageOverlay
```

### 4. File Upload Flow
```
User Clicks Upload or Drags File
  ↓
handleFileUpload(file)
  ↓
Detect file type (.geojson, .kml, .shp, .gpx)
  ↓
Parse file:
  ├─ GeoJSON → Direct parse
  ├─ KML → toGeoJSON conversion
  ├─ Shapefile → shp.js parsing
  └─ GPX → toGeoJSON conversion
  ↓
addUploadedLayerToMap()
  ↓
  ├─ Generate random color
  ├─ Create Leaflet GeoJSON layer
  ├─ Bind popup with properties
  └─ Zoom to layer bounds
```


---

## 📊 Data Structure & Format

### GeoJSON Field Files
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-104.99, 40.61], ...]]
  },
  "properties": {
    "fieldName": "Field 10",
    "cropType": "corn",
    "fieldSize": 125.5,
    "plantingDate": "2025-04-15",
    "irrigMethod": "Center Pivot",
    "soilTexture": "sandy_loam",
    "cultivar": "Pioneer 1234"
  }
}
```

### Timeseries JSON Files
```json
{
  "fieldName": "Field_10",
  "timeSeries": [
    {
      "date": "2025-03-29",
      "indices": {
        "ETc_NDVI": {
          "mean": 0.0024,
          "min": -0.0049,
          "max": 0.0147,
          "std": 0.0022,
          "p25": 0.0011,
          "p50": 0.0025,
          "p75": 0.0039,
          "count": 3526,
          "width": 43,
          "height": 82
        },
        "NDVI": { ... },
        "FC": { ... },
        "GCI": { ... },
        "MSAVI": { ... },
        "RECI": { ... }
      }
    }
  ],
  "irrigationEvents": [
    { "date": "2025-06-13", "type": "irrigation" }
  ]
}
```

### Dates JSON Files
```json
{
  "fieldName": "Field_10",
  "dates": [
    "2025-03-29",
    "2025-04-01",
    "2025-04-02",
    ...
  ]
}
```


---

## 🎨 UI Components & Layout

### Layout Structure (Flexbox)
```
┌─────────────────────────────────────────────────────────┐
│                    Browser Window                        │
├──────────────┬──────────────────────────────────────────┤
│   Sidebar    │         Right Container                   │
│   (320px)    │                                           │
│              │  ┌─────────────────────────────────────┐ │
│  ┌────────┐  │  │      Map Section (35%)              │ │
│  │ Header │  │  │  - Leaflet map                      │ │
│  └────────┘  │  │  - Satellite/Street layers          │ │
│              │  │  - Field polygons                   │ │
│  ┌────────┐  │  │  - Image overlays                   │ │
│  │ Field  │  │  └─────────────────────────────────────┘ │
│  │ Cards  │  │                                           │
│  │        │  │  ┌─────────────────────────────────────┐ │
│  │        │  │  │   Analysis Section (65%)            │ │
│  └────────┘  │  │  ┌───────────────────────────────┐ │ │
│              │  │  │ Header (Field Name + Close)   │ │ │
│  ┌────────┐  │  │  ├───────────────────────────────┤ │ │
│  │ Image  │  │  │  │ Tabs: Field Info | Planet     │ │ │
│  │Overlay │  │  │  ├───────────────────────────────┤ │ │
│  │Controls│  │  │  │ Body (scrollable)             │ │ │
│  │        │  │  │  │  - Category tabs              │ │ │
│  │Calendar│  │  │  │  - Charts (Chart.js)          │ │ │
│  └────────┘  │  │  │  - Toggle checkboxes          │ │ │
│              │  │  └───────────────────────────────┘ │ │
└──────────────┴──┴─────────────────────────────────────┴─┘
```

### Key CSS Classes
- `.sidebar` - Left panel (z-index: 1000)
- `.right-container` - Map + Analysis container
- `#map` - Map section (35% height, z-index: 1)
- `.analysis-section` - Bottom section (65% height)
- `.analysis-section.empty` - Shows placeholder
- `.analysis-section.active` - Shows content
- `.field-card` - Clickable field cards
- `.field-card.active` - Selected field
- `.overlay-controls` - Image overlay controls
- `.overlay-controls.active` - Visible when field selected

### Z-Index Hierarchy
```
2000 - Modal overlay
1000 - Sidebar
 700 - Leaflet popup pane
 650 - Leaflet tooltip pane
 400 - Leaflet overlay pane (polygons + images)
 200 - Leaflet base pane
   1 - Map container
```


---

## 📈 Chart System

### Chart Categories (6 Total)
1. **ET (Evapotranspiration)** - Water use by crops
2. **Crop Coefficient** - Crop water requirements
3. **Irrigation** - Irrigation events + precipitation
4. **Additional Variables** - NDVI, GCI
5. **Depletion** - Water depletion levels
6. **AWC (Available Water Content)** - Soil water availability

### Chart Data Mapping

| Chart Line | Source Data | Calculation |
|------------|-------------|-------------|
| Andy | ETc_NDVI.tif mean | Direct value |
| NDVI | NDVI.tif mean | Direct value |
| FC | FC.tif mean | Direct value |
| GCI | GCI.tif mean | Direct value |
| MSAVI | MSAVI.tif mean | Direct value |
| RECI | RECI.tif mean | Direct value |
| Ensemble | ETc_NDVI + FC | (ETc_NDVI + FC) / 2 |
| FAO56 | ETc_NDVI | ETc_NDVI × 1.05 |
| SAVI | MSAVI | Uses MSAVI value |
| AWC | FC | 0.7 - (FC × 0.3) |

### Chart Configuration
- **Library:** Chart.js v4.4.0
- **Type:** Line charts (except precipitation = bar)
- **X-Axis:** Time (dates)
- **Y-Axis:** Index values (0-1 for most indices)
- **Interaction:** Hover tooltips, toggle lines on/off
- **Animation:** Smooth transitions (tension: 0.4)

### Toggle System
Each chart has checkboxes to show/hide individual lines:
```javascript
// User clicks checkbox
setupToggleButtons() → 
  Listen for checkbox changes →
    Get chart instance →
      Update dataset.hidden property →
        chart.update() → Redraw chart
```


---

## 🗺️ Map System

### Leaflet Configuration
```javascript
// Map initialization
L.map('map').setView([40.6135, -104.9945], 14)

// Base layers
- Satellite: ArcGIS World Imagery (default)
- Street Map: OpenStreetMap

// Controls
- Layer switcher (top-right)
- Zoom controls (top-left)
```

### Field Polygons
```javascript
// Style
{
    color: '#4CAF50',        // Border color (field-specific)
    weight: 3,               // Border width
    opacity: 0.8,            // Border opacity
    fillOpacity: 0.2         // Fill opacity (0.4 on hover)
}

// Interactions
- Hover: Show tooltip with field name, crop, size
- Click: (disabled - use field cards instead)
- Mouseover: Increase opacity and border weight
- Mouseout: Reset to default style
```

### Tooltips
```javascript
layer.bindTooltip(content, {
    permanent: false,
    direction: 'top',        // Appears above polygon
    className: 'field-tooltip',
    offset: [0, -10],
    opacity: 1
});
```

### Popups (for uploaded files)
```javascript
layer.bindPopup(content, {
    autoPan: true,
    autoPanPadding: [50, 50],
    offset: [0, -10],        // Appears above feature
    closeButton: true,
    autoClose: true,
    className: 'custom-popup'
});
```

### Image Overlays
```javascript
L.imageOverlay(imageUrl, bounds, {
    opacity: 0.7,
    interactive: false,
    zIndex: 400
}).addTo(map);
```


---

## 🖼️ Image Overlay System

### Supported Indices
- **NDVI** - Normalized Difference Vegetation Index
- **ETc_NDVI** - Crop Evapotranspiration (NDVI-based)
- **FC** - Fractional Cover
- **GCI** - Green Chlorophyll Index
- **MSAVI** - Modified Soil-Adjusted Vegetation Index
- **RECI** - Red Edge Chlorophyll Index

### Image Processing Pipeline
```
1. User selects date + index
   ↓
2. Construct path: exports/Field_X/YYYY-MM-DD/INDEX.tif
   ↓
3. Fetch GeoTIFF file (binary)
   ↓
4. Parse with GeoTIFF.js
   ├─ Extract raster data (Float32Array)
   ├─ Extract geospatial bounds
   └─ Get width × height
   ↓
5. Normalize values
   ├─ Find min/max (excluding nodata)
   └─ Scale to 0-255
   ↓
6. Apply color scale (viridis)
   ├─ Map each value to RGB color
   └─ Handle nodata as transparent
   ↓
7. Create canvas
   ├─ Draw colored pixels
   └─ Convert to data URL
   ↓
8. Add to map as ImageOverlay
   └─ Position using geospatial bounds
```

### Color Scale (Viridis)
```javascript
// Low values (0) → Purple/Blue
// Mid values (128) → Green/Yellow
// High values (255) → Yellow
// NoData (-9999) → Transparent
```

### Calendar System
- Displays current month
- Navigation: Previous/Next month buttons
- Available dates: Highlighted in white with border
- Selected date: Green background
- Unavailable dates: Gray, not clickable
- Today: Bold border


---

## 📤 File Upload System

### Supported Formats
1. **GeoJSON** (.geojson, .json)
   - Direct JSON.parse()
   - Native Leaflet support

2. **KML** (.kml)
   - Parse XML with DOMParser
   - Convert to GeoJSON with toGeoJSON
   - Google Earth format

3. **Shapefile** (.zip)
   - Must be zipped with .shp, .shx, .dbf
   - Parse with shp.js
   - Convert to GeoJSON

4. **GPX** (.gpx)
   - GPS track format
   - Parse XML with DOMParser
   - Convert to GeoJSON with toGeoJSON

### Upload Methods
1. Click "Upload" button → File picker
2. Drag & drop file onto map

### Processing
```javascript
handleFileUpload(file)
  ↓
Read file as ArrayBuffer/Text
  ↓
Detect format by extension
  ↓
Parse to GeoJSON
  ↓
Generate random color
  ↓
Create Leaflet layer
  ↓
Bind popup with properties
  ↓
Add to map
  ↓
Zoom to bounds
  ↓
Store in AppState.uploadedLayers
```

### Popup Content
Shows first 5 properties of each feature:
```
Filename
─────────
Property1: Value1
Property2: Value2
...
... and X more
```


---

## 🎬 Timeline Player System

### Overview
The timeline player allows users to animate through satellite imagery over time, with synchronized chart updates showing data progression.

### Features
- **Playback Controls:** Play/Pause, First, Previous, Next, Last
- **Speed Control:** 0.5x, 1x, 2x, 4x playback speeds
- **Loop Mode:** Continuous playback option
- **Timeline Slider:** Drag to any date
- **Date Labels:** Shows key dates along timeline
- **Image Preloading:** Preloads next 3 images for smooth playback
- **Chart Synchronization:** Charts update to show only data up to current date

### Timeline State
```javascript
const TimelineState = {
    isPlaying: false,        // Playback active
    currentIndex: 0,         // Current frame (0 to dates.length-1)
    dates: [],              // Array of available dates
    playInterval: null,     // setInterval reference
    speed: 1000,           // Milliseconds between frames
    loop: false,           // Loop when reaching end
    preloadedImages: {}    // Cache: {fieldId_date_index: dataUrl}
};
```

### Timeline Flow
```
User clicks "Show Image"
  ↓
initializeTimelinePlayer()
  ↓
  ├─ Load available dates
  ├─ Setup slider (max = dates.length - 1)
  ├─ Setup control event listeners
  ├─ Generate date labels
  └─ Show timeline player UI
  ↓
User clicks Play
  ↓
startPlayback()
  ↓
  ├─ Set interval based on speed
  └─ Every interval:
      ↓
      goToFrame(nextIndex)
        ↓
        ├─ Update slider position
        ├─ Update date display
        ├─ showTimelineImage(date)
        │   ↓
        │   ├─ Load GeoTIFF for date
        │   ├─ Process and render
        │   └─ Update image overlay
        ├─ updateChartsWithTimelineDate(date)
        │   ↓
        │   ├─ Filter data to current date
        │   ├─ Update all chart datasets
        │   └─ Update irrigation annotations
        └─ preloadTimelineImages()
            ↓
            └─ Preload next 3 images
```

### Chart Synchronization
When timeline plays, charts dynamically update to show only data up to the current date:
```javascript
updateChartsWithTimelineDate(dateStr)
  ↓
  ├─ Filter timeSeries data: date <= currentDate
  ├─ Update chart.data.labels
  ├─ Update each dataset.data
  ├─ Filter irrigation annotations
  └─ chart.update('none') // No animation for performance
```

### Key Functions
- `initializeTimelinePlayer()` - Initialize timeline UI and state
- `setupTimelineControls()` - Attach event listeners
- `togglePlayPause()` - Toggle playback
- `startPlayback()` - Start interval-based playback
- `stopPlayback()` - Stop playback and clear interval
- `goToFrame(index)` - Jump to specific frame
- `showTimelineImage(date)` - Load and display image for date
- `updateTimelineDisplay()` - Update date text display
- `preloadTimelineImages()` - Preload upcoming images
- `updateChartsWithTimelineDate(date)` - Sync charts with timeline
- `removeTimelineMarkersFromCharts()` - Restore full chart data
- `hideTimelinePlayer()` - Hide timeline and cleanup


---

## 🔄 Swipe Comparison System

### Overview
The swipe control allows users to compare satellite imagery with the base map by dragging a vertical slider left/right.

### Features
- **Toggle Button:** Orange button in timeline controls
- **Vertical Slider:** White line with blue circular handle
- **Clip-Path:** Uses CSS clip-path for precise clipping
- **Drag Interaction:** Smooth dragging with visual feedback
- **Map Interaction:** Disables map dragging during swipe

### Swipe Flow
```
User clicks Swipe Toggle Button
  ↓
toggleSwipeControl()
  ↓
  ├─ If swipe active: removeSwipeControl()
  └─ If swipe inactive: initializeSwipeControl()
      ↓
      ├─ Create swipe slider element
      ├─ Position at center of map
      ├─ Attach drag event listeners
      ├─ Disable map dragging
      └─ Apply initial clip-path
```

### Swipe Implementation
```javascript
// Create slider
const swipeSlider = document.createElement('div');
swipeSlider.className = 'swipe-slider';

// Drag handling
let isDragging = false;

slider.addEventListener('mousedown', () => {
    isDragging = true;
    AppState.map.dragging.disable();
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const x = e.clientX - mapRect.left;
        swipeSlider.style.left = x + 'px';
        updateSwipeClip(x);
    }
});

// Update clip-path
function updateSwipeClip(x) {
    const clipX = x - imgLeft;
    img.style.clipPath = `inset(0 ${img.width - clipX}px 0 0)`;
}
```

### Key Functions
- `initializeSwipeControl()` - Create and setup swipe slider
- `removeSwipeControl()` - Remove swipe slider and reset
- `toggleSwipeControl()` - Toggle swipe on/off
- `updateSwipeClip(x)` - Update image clip-path based on position


---

## ✏️ Drawing Tools System

### Overview
Custom GIS-style drawing tools for measuring areas and distances on the map.

### Features
- **Polygon Drawing:** Draw irregular polygons with area measurements
- **Circle Drawing:** Draw circles with radius and area
- **Distance Measurement:** Draw polylines with distance measurements
- **Vertex Editing:** Edit drawn shapes by dragging vertices
- **Multiple Units:** Acres, hectares, sq meters, miles, kilometers, feet, meters
- **Custom Icons:** Professional GIS-style icons (green/orange/red, white on hover)
- **Enhanced Popups:** Metric rows showing all measurements

### Drawing Tools
```javascript
// Leaflet.draw configuration
const drawControl = new L.Control.Draw({
    draw: {
        polygon: {
            shapeOptions: { color: '#2196F3', weight: 3 },
            showArea: true,
            metric: ['km', 'm']
        },
        circle: {
            shapeOptions: { color: '#2196F3', weight: 3 },
            showRadius: true,
            metric: true
        },
        polyline: {
            shapeOptions: { color: '#FF9800', weight: 3 },
            showLength: true,
            metric: true
        },
        rectangle: false,
        marker: false,
        circlemarker: false
    },
    edit: {
        featureGroup: drawnItems,
        edit: { selectedPathOptions: { dashArray: '10, 10' } }
    }
});
```

### Measurement Calculations
```javascript
// Area measurements
const acres = (sqMeters * 0.000247105).toFixed(2);
const hectares = (sqMeters / 10000).toFixed(2);

// Distance measurements
const miles = (meters * 0.000621371).toFixed(2);
const kilometers = (meters / 1000).toFixed(2);
const feet = (meters * 3.28084).toFixed(2);
```

### Custom Icons
- **Polygon:** Vector polygon with vertices (green)
- **Circle:** Simple circle outline (orange)
- **Distance:** Zigzag line with dots (red)
- **Hover State:** All icons turn white
- **Disabled State:** Icons stay in original colors

### Drawing Tour Tooltip
A professional tooltip appears 1 second after map loads to guide users:
- Dark background (#1a1a1a) with blue accent
- "Drawing tools available" message
- Pulsing blue dot indicator
- Auto-hides after 5 seconds
- Hides when user interacts with drawing tools


---

## 📊 Date Comparison System

### Overview
The date comparison feature allows farmers to compare field conditions between two different dates, providing side-by-side visual comparison and detailed statistical analysis.

### Features
- **Side-by-Side Maps:** Two maps stacked vertically showing different dates
- **Synchronized Navigation:** Both maps zoom and pan together
- **Comprehensive Statistics:** Detailed metrics and change analysis
- **Smart Insights:** Context-aware recommendations based on changes
- **Field Coverage Analysis:** Shows percentage of field that improved/declined
- **Professional Icons:** SVG-based icons throughout (no emojis)

### Comparison Flow
```
User clicks "Compare Dates" button
  ↓
openComparisonModal()
  ↓
  ├─ Populate date selectors with available dates
  ├─ Auto-select first and last dates
  └─ Show modal
  ↓
User selects two dates and index
  ↓
startComparison()
  ↓
showComparisonView()
  ↓
  ├─ Initialize two synchronized Leaflet maps
  ├─ Load GeoTIFF data for both dates
  ├─ Display images on maps
  ├─ Calculate difference statistics
  └─ Display enhanced statistics and insights
```

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  Comparison View Header                    [Exit Button]│
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│   Date 1 Map (Top)       │                              │
│   Satellite + Overlay    │                              │
│                          │                              │
├──────────────────────────┤   Analysis & Insights        │
│                          │   (400px wide, scrollable)   │
│   Date 2 Map (Bottom)    │                              │
│   Satellite + Overlay    │   - Overall Status           │
│                          │   - Key Metrics              │
│                          │   - Field Coverage           │
│                          │   - Insights                 │
│                          │   - Time Period              │
└──────────────────────────┴──────────────────────────────┘
```

### Statistics Sections

**1. Overall Status**
- Visual health indicator (Significant Improvement, Moderate Decline, etc.)
- Large percentage change display
- Color-coded (green = positive, red = negative, yellow = neutral)

**2. Key Metrics**
- Date 1 and Date 2 average values
- Absolute change
- Value ranges for both dates

**3. Field Coverage Analysis**
- Percentage of field that improved
- Percentage of field that declined
- Percentage of field that remained stable
- Average improvement/decline values

**4. Insights & Recommendations**
Index-specific insights:
- **NDVI:** Vegetation health analysis, growth patterns
- **ETc_NDVI:** Water demand changes, irrigation needs
- **FC:** Canopy coverage analysis

General recommendations:
- Check irrigation systems
- Scout for pests/diseases
- Review weather conditions
- Soil moisture testing

**5. Time Period**
- Start and end dates
- Days elapsed between dates

### Key Functions
- `setupComparison()` - Initialize comparison button and modal
- `openComparisonModal()` - Show date selection modal
- `closeComparisonModal()` - Hide modal
- `startComparison()` - Begin comparison process
- `showComparisonView()` - Display comparison view
- `initializeComparisonMaps()` - Create two synchronized Leaflet maps
- `loadComparisonData()` - Load and process both images
- `loadComparisonImage(fieldId, date, index)` - Load single GeoTIFF
- `displayComparisonImage(map, dataUrl, bounds)` - Add image to map
- `calculateDifferenceStats(data1, data2)` - Calculate change statistics
- `displayEnhancedStats(data1, data2, diffStats, index)` - Show analysis
- `generateInsights(index, percentChange, diffStats)` - Generate recommendations
- `closeComparisonView()` - Exit comparison and cleanup

### Difference Calculation
```javascript
// For each pixel
diff = value_date2 - value_date1

// Classify changes
if (diff > 0.01) → Improved
if (diff < -0.01) → Declined
else → Stable

// Calculate statistics
percentImproved = (improvedPixels / totalPixels) * 100
percentDeclined = (declinedPixels / totalPixels) * 100
meanChange = sum(allDiffs) / totalPixels
```

### Insight Generation Logic
```javascript
// Health status determination
if (percentChange > 10) → "Significant Improvement"
if (percentChange > 5) → "Moderate Improvement"
if (percentChange > -5) → "Stable Condition"
if (percentChange > -10) → "Moderate Decline"
else → "Significant Decline"

// Recommendations triggered when:
- percentDeclined > 30% → Show action items
- percentChange > 15% → Positive reinforcement
- No significant change → Continue monitoring
```


---

## 🔧 Key Functions Reference

### Initialization Functions
- `initializeMap()` - Create Leaflet map with base layers
- `initializeDrawingControls()` - Setup Leaflet.draw tools
- `loadAllFields()` - Load all 3 field GeoJSON files
- `addFieldToMap(fieldId, geojson, config)` - Add field polygon to map
- `addFieldCard(fieldId, properties, config)` - Create sidebar card
- `setupAnalysisSection()` - Setup tab switching
- `setupImageOverlayControls()` - Setup calendar and controls
- `setupFileUpload()` - Setup file upload handlers
- `setupComparison()` - Initialize date comparison feature

### Field Selection Functions
- `zoomToField(fieldId)` - Zoom to field and open analysis
- `flashField(fieldId)` - Flash polygon animation
- `openAnalysisSection(fieldId, properties)` - Open analysis panel
- `closeAnalysisSection()` - Close analysis panel
- `populateFieldInfo(properties)` - Display field properties
- `populatePlanetTab(fieldId, properties)` - Create charts

### Data Loading Functions
- `loadFieldData(fieldId)` - Load timeseries JSON
- `loadFieldDates(fieldId)` - Load available dates JSON
- `processTimeSeriesData(jsonData)` - Extract mean values
- `generateSampleData(fieldId)` - Fallback synthetic data

### Chart Functions
- `createCategoryChart(category, data)` - Create Chart.js chart
- `setupCategoryTabs()` - Setup category tab switching
- `setupToggleButtons()` - Setup line toggle checkboxes
- `updateChartsWithTimelineDate(date)` - Sync charts with timeline
- `removeTimelineMarkersFromCharts()` - Restore full chart data

### Image Overlay Functions
- `displayImageOverlay()` - Load and display GeoTIFF
- `clearImageOverlay()` - Remove overlay from map
- `renderCalendar(year, month)` - Render calendar UI
- `selectDate(dateStr)` - Handle date selection

### Timeline Functions
- `initializeTimelinePlayer()` - Initialize timeline player
- `setupTimelineControls()` - Setup timeline event listeners
- `togglePlayPause()` - Toggle playback state
- `startPlayback()` - Start timeline animation
- `stopPlayback()` - Stop timeline animation
- `goToFrame(index)` - Jump to specific frame
- `showTimelineImage(date)` - Load image for date
- `loadTimelineImage(fieldId, date, index)` - Load and process GeoTIFF
- `updateImageOverlay(dataUrl)` - Update overlay with new image
- `preloadTimelineImages()` - Preload upcoming images
- `hideTimelinePlayer()` - Hide and cleanup timeline

### Swipe Control Functions
- `initializeSwipeControl()` - Create swipe slider
- `removeSwipeControl()` - Remove swipe slider
- `toggleSwipeControl()` - Toggle swipe on/off
- `updateSwipeClip(x)` - Update image clip-path

### Drawing Functions
- `initializeDrawingControls()` - Setup Leaflet.draw
- Event handlers for draw:created, draw:edited, draw:deleted
- Custom measurement calculations for areas and distances

### Date Comparison Functions
- `setupComparison()` - Initialize comparison button and modal
- `openComparisonModal()` - Show date selection modal
- `closeComparisonModal()` - Hide modal
- `startComparison()` - Begin comparison process
- `showComparisonView()` - Display comparison view
- `initializeComparisonMaps()` - Create two synchronized Leaflet maps
- `loadComparisonData()` - Load and process both images
- `loadComparisonImage(fieldId, date, index)` - Load single GeoTIFF
- `displayComparisonImage(map, dataUrl, bounds)` - Add image to map
- `calculateDifferenceStats(data1, data2)` - Calculate change statistics
- `displayEnhancedStats(data1, data2, diffStats, index)` - Show analysis
- `generateInsights(index, percentChange, diffStats)` - Generate recommendations
- `closeComparisonView()` - Exit comparison and cleanup

### File Upload Functions
- `handleFileUpload(file)` - Process uploaded file
- `addUploadedLayerToMap(geojson, fileName)` - Add layer to map

### Utility Functions
- `formatDate(dateStr)` - Format date for display
- `formatCropName(cropType)` - Format crop name
- `formatSoilTexture(texture)` - Format soil texture
- `getDayOfYear(date)` - Get day number (1-365)
- `getIrrigationDates(fieldId)` - Get irrigation dates
- `calculateImageStats(data)` - Calculate min/max/mean for raster
- `getColorScale(index)` - Get color scale function for index


---

## 🐛 Known Issues & Solutions

### Issue 1: Popups Appearing Below Polygons
**Problem:** Leaflet popups/tooltips rendered below field polygons  
**Cause:** Incorrect z-index layering  
**Solution:** Set explicit z-index values:
```css
.leaflet-popup-pane { z-index: 700 !important; }
.leaflet-tooltip-pane { z-index: 650 !important; }
.leaflet-overlay-pane { z-index: 400 !important; }
```
### Issue 2: GitHub Pages Not Loading Images
**Problem:** "Invalid byte order value" error when loading .tif files  
**Cause:** Git LFS pointer files served instead of actual files  
**Solution:** Remove Git LFS, push actual .tif files as regular Git files

### Issue 3: Long File Paths in Windows
**Problem:** Cannot extract raw image folders  
**Cause:** Windows 260-character path limit  
**Solution:** Use exports/ folder with processed GeoTIFF files only

### Issue 4: CORS Errors in Local Development
**Problem:** Cannot load files with file:// protocol  
**Solution:** Use local web server (http-server, Python, PHP)


---

## 🚀 Deployment

### GitHub Pages Setup
1. Repository: `https://github.com/gulfterminal-GIS/Agroptics-GT-Simple-Demo`
2. Branch: `master`
3. Folder: `/` (root)
4. URL: Auto-generated by GitHub Pages

### Deployment Process
```bash
# 1. Make changes locally
git add .
git commit -m "Description"

# 2. Push to GitHub
git push origin master

# 3. GitHub Pages auto-deploys
# Wait 1-2 minutes for changes to appear
```

### Files Pushed to GitHub
- ✅ index.html, app.js
- ✅ package.json, package-lock.json
- ✅ data/ folder (JSON files)
- ✅ exports/ folder (GeoTIFF files - 63.64 MiB)
- ✅ Field_*.geojson files
- ✅ preprocess-data-template.js
- ❌ node_modules/ (excluded via .gitignore)
- ❌ Raw image folders (too large)

### Important Notes
- **No Git LFS:** All files pushed as regular Git objects
- **Static Site:** No server-side processing required
- **CDN Libraries:** Leaflet, Chart.js loaded from CDN
- **No Build Step:** Pure HTML/CSS/JS, no compilation


---

## 🎓 Development Guidelines

### Code Style
- **No frameworks:** Vanilla JavaScript only
- **ES6+:** Use modern JavaScript features
- **Async/Await:** For file loading and processing
- **Comments:** Document complex logic
- **Naming:** camelCase for functions, PascalCase for constants

### Adding New Fields
1. Add GeoJSON file: `Field_X.geojson`
2. Add to FIELD_CONFIGS in app.js
3. Create data files:
   - `data/Field_X_dates.json`
   - `data/Field_X_timeseries.json`
4. Add exports folder: `exports/Field_X/`

### Adding New Indices
1. Add .tif files to exports folders
2. Update index selector in HTML
3. Update processTimeSeriesData() to extract values
4. Update chart datasets to use new values

### Modifying Charts
1. Find createCategoryChart() function
2. Locate category switch statement
3. Add/modify datasets array
4. Update toggle checkboxes in generateCategoryContent()

### Debugging Tips
- Check browser console for errors
- Use `console.log(AppState)` to inspect state
- Check Network tab for failed file loads
- Verify file paths are correct (case-sensitive)
- Test with local server, not file:// protocol


---

## 📚 External Dependencies

### CDN Libraries (Loaded from HTML)
```html
<!-- Leaflet -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>

<!-- GeoTIFF.js -->
<script src="https://cdn.jsdelivr.net/npm/geotiff@2.0.7/dist-browser/geotiff.js"></script>

<!-- Shapefile Parser -->
<script src="https://unpkg.com/shpjs@latest/dist/shp.js"></script>

<!-- KML/GPX Converter -->
<script src="https://unpkg.com/@mapbox/togeojson@0.16.0/togeojson.js"></script>
```

### NPM Dependencies (package.json)
```json
{
  "geotiff": "^2.0.7",
  "sharp": "^0.33.2"
}
```
**Note:** Only used for preprocessing, not required for runtime

### Browser Requirements
- Modern browser with ES6+ support
- Canvas API support
- Fetch API support
- FileReader API support
- Recommended: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+


---

## 🔐 Security Considerations

### File Upload Security
- **Client-side only:** No server-side processing
- **File type validation:** Check extensions before parsing
- **Size limits:** Browser memory constraints apply
- **No execution:** Files parsed as data, not executed
- **User responsibility:** Users must trust their own files

### Data Privacy
- **No server:** All processing happens in browser
- **No tracking:** No analytics or tracking scripts
- **No authentication:** Public access to all data
- **Static hosting:** GitHub Pages serves static files only

### CORS Policy
- **Same-origin:** Files loaded from same domain
- **CDN resources:** Loaded with CORS headers
- **No external APIs:** No third-party data requests


---

## 📊 Performance Metrics

### File Sizes
- **index.html:** ~40 KB
- **app.js:** ~60 KB
- **Each GeoJSON:** ~5-15 KB
- **Each timeseries JSON:** ~200-500 KB
- **Each GeoTIFF:** ~50-200 KB
- **Total exports folder:** ~63.64 MB

### Load Times (Typical)
- **Initial page load:** 1-2 seconds
- **Field selection:** 0.5-1 second
- **Chart rendering:** 0.2-0.5 seconds
- **Image overlay:** 1-3 seconds (depends on file size)
- **File upload:** 0.5-2 seconds (depends on file size)

### Optimization Strategies
- **Lazy loading:** Charts created only when field selected
- **Preprocessed data:** JSON files instead of processing GeoTIFF in browser
- **CDN caching:** Libraries cached by browser
- **Minimal dependencies:** No heavy frameworks
- **Efficient rendering:** Canvas for image overlays


---

## 🤖 AI Assistant Guidelines

### When Working on This Project

1. **Always read this file first** to understand the complete system
2. **Check existing code** before suggesting changes
3. **Maintain consistency** with current architecture
4. **Test locally** before pushing to GitHub
5. **Update documentation** when making significant changes

### Common Tasks

#### Adding a New Feature
1. Identify where it fits in the architecture
2. Check if similar functionality exists
3. Follow existing code patterns
4. Update this documentation

#### Fixing a Bug
1. Reproduce the issue
2. Check "Known Issues" section
3. Identify root cause
4. Test fix thoroughly
5. Document solution if novel

#### Modifying UI
1. Check CSS class hierarchy
2. Maintain z-index order
3. Test responsive behavior
4. Ensure accessibility

#### Working with Data
1. Understand data flow (see DATA_FLOW_EXPLANATION.md)
2. Check data format specifications
3. Validate JSON structure
4. Handle missing data gracefully

### Important Reminders
- ✅ This is a static site (no backend)
- ✅ All processing happens in browser
- ✅ Use vanilla JavaScript (no frameworks)
- ✅ Test with local server, not file://
- ✅ Commit and push to deploy
- ❌ Don't use Git LFS
- ❌ Don't add heavy dependencies
- ❌ Don't break existing functionality


---

## 📞 Quick Reference

### File Locations
- **Main app:** `index.html`, `app.js`
- **Data:** `data/*.json`
- **Images:** `exports/Field_X/YYYY-MM-DD/*.tif`
- **Boundaries:** `Field_*.geojson`
- **Docs:** `*.md` files

### Key URLs
- **Repository:** https://github.com/gulfterminal-GIS/Agroptics-GT-Simple-Demo
- **Live Site:** [GitHub Pages URL]
- **Leaflet Docs:** https://leafletjs.com/reference.html
- **Chart.js Docs:** https://www.chartjs.org/docs/

### Key Variables
- `AppState` - Global application state
- `FIELD_CONFIGS` - Field configuration object
- `AppState.map` - Leaflet map instance
- `AppState.charts` - Chart.js instances
- `AppState.selectedField` - Current field ID

### Key Functions
- `zoomToField(fieldId)` - Select and zoom to field
- `loadFieldData(fieldId)` - Load chart data
- `displayImageOverlay()` - Show satellite image
- `handleFileUpload(file)` - Process uploaded file

### Common Commands
```bash
# Local development
npx http-server

# Deploy to GitHub
git add .
git commit -m "Message"
git push origin master

# Check status
git status
```

---

**End of System Documentation**  
**For questions, refer to other .md files or check the code directly.**
