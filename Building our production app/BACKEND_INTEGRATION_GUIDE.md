# GT Agroptics Leaflet - Backend Integration Guide

## 📋 Quick Overview

This is a **pure JavaScript GIS application** for drawing and managing field boundaries. All functionality is in the `GTAgropticsLeaflet` global object.

---

## 🎯 How It Works

### User Actions:
1. **Draw** polygons, rectangles, circles, or lines on the map
2. **Edit** existing features (drag vertices, reshape)
3. **Delete** features
4. **Upload** GeoJSON files

### Your Backend Needs To:
1. **Save** feature data when user finishes drawing/editing
2. **Load** saved features when page loads
3. **Store** GeoJSON geometry + properties in database

---

## 🔌 Backend Integration - 2 Main Functions

### 1️⃣ **GET DATA FROM MAP** (Save to Database)

```javascript
// Call this to get all features for saving to database
const dataToSave = GTAgropticsLeaflet.getAllFeatures();

// Send to your backend
fetch('/api/fields', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataToSave)
});
```

**Returns:**
```javascript
{
    timestamp: "2026-04-22T15:30:00.000Z",
    mapPosition: {
        center: [36.7783, -119.4179],
        zoom: 10
    },
    totalFeatures: 3,
    featuresByType: {
        polygon: 2,
        circle: 1
    },
    features: [
        {
            id: "feature_1",
            type: "polygon",
            createdAt: "2026-04-22T15:25:00.000Z",
            updatedAt: "2026-04-22T15:25:00.000Z",
            geometry: {
                type: "Polygon",
                coordinates: [[[lng, lat], [lng, lat], ...]]
            },
            properties: {
                area_sqm: 455000,
                area_hectares: "45.5",
                area_acres: "112.4",
                perimeter_meters: 2700,
                points_count: 5,
                color: "#2196F3",
                fillOpacity: 0.3
            }
        },
        // ... more features
    ]
}
```

---

### 2️⃣ **LOAD DATA TO MAP** (Display from Database)

```javascript
// Get data from your backend
fetch('/api/fields')
    .then(response => response.json())
    .then(backendData => {
        // Load features onto map
        GTAgropticsLeaflet.setFeatures(backendData.features);
        
        // Optional: Set map position
        if (backendData.mapPosition) {
            GTAgropticsLeaflet.setMapPosition(
                backendData.mapPosition.center,
                backendData.mapPosition.zoom
            );
        }
    });
```

**Expected Format:**
```javascript
{
    features: [
        {
            id: "field_001",
            geometry: {
                type: "Polygon",
                coordinates: [[[lng, lat], ...]]
            },
            properties: {
                name: "North Field",
                crop: "Wheat",
                area_hectares: "45.5"
            }
        }
    ],
    mapPosition: {
        center: [36.7783, -119.4179],
        zoom: 12
    }
}
```

---

## 📦 What to Store in Database

### Minimum Required Fields:
```sql
CREATE TABLE fields (
    id VARCHAR(50) PRIMARY KEY,
    geometry JSON NOT NULL,           -- GeoJSON geometry
    properties JSON,                  -- Feature properties
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Example Database Record:
```json
{
    "id": "feature_1",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[-119.4179, 36.7783], ...]]
    },
    "properties": {
        "area_hectares": "45.5",
        "perimeter_meters": 2700,
        "color": "#2196F3"
    },
    "created_at": "2026-04-22T15:25:00.000Z",
    "updated_at": "2026-04-22T15:25:00.000Z"
}
```

---

## 🚀 Complete Integration Example

### On Page Load:
```javascript
document.addEventListener('DOMContentLoaded', function() {
    // 1. Initialize map
    GTAgropticsLeaflet.init({
        center: [36.7783, -119.4179],
        zoom: 10,
        satellite: true
    });
    
    // 2. Load saved features from backend
    fetch('/api/fields')
        .then(response => response.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                GTAgropticsLeaflet.setFeatures(data.features);
            }
        });
});
```

### Auto-Save on Changes:
```javascript
// Listen for map events
map.on(L.Draw.Event.CREATED, saveToBackend);
map.on(L.Draw.Event.EDITED, saveToBackend);
map.on(L.Draw.Event.DELETED, saveToBackend);

function saveToBackend() {
    const data = GTAgropticsLeaflet.getAllFeatures();
    
    fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        console.log('✅ Saved to backend:', result);
    })
    .catch(error => {
        console.error('❌ Save failed:', error);
        alert('Failed to save changes');
    });
}
```

---

## 🛠️ Additional Useful Functions

### Get Single Feature:
```javascript
const feature = GTAgropticsLeaflet.getFeatureById('feature_1');
```

### Get Features by Type:
```javascript
const polygons = GTAgropticsLeaflet.getFeaturesByType('polygon');
```

### Get Statistics:
```javascript
const stats = GTAgropticsLeaflet.getStatistics();
// Returns: { totalFeatures: 5, totalArea: 225.5, ... }
```

### Update Feature Properties:
```javascript
GTAgropticsLeaflet.updateFeatureProperties('feature_1', {
    name: 'North Field',
    crop: 'Wheat'
});
```

### Clear All Features:
```javascript
GTAgropticsLeaflet.clearAll();
```

---

## 📁 File Structure

```
Building our production app/
├── index.html                          # Main HTML
├── css/
│   └── styles.css                      # All styles
├── js/
│   ├── lib/                            # Leaflet libraries (local)
│   ├── GTAgropticsLeaflet.js          # Main app (rename to leaflet-main.js)
│   ├── draw.js                         # Drawing (rename to leaflet-draw-handler.js)
│   ├── edit.js                         # Editing (rename to leaflet-edit-handler.js)
│   ├── display.js                      # Display (rename to leaflet-display-handler.js)
│   └── data.js                         # Data (rename to leaflet-data-handler.js)
└── data/
    └── sample-fields.geojson           # Sample data
```

### Recommended File Renaming:
- `GTAgropticsLeaflet.js` → `leaflet-main.js`
- `draw.js` → `leaflet-draw-handler.js`
- `edit.js` → `leaflet-edit-handler.js`
- `display.js` → `leaflet-display-handler.js`
- `data.js` → `leaflet-data-handler.js`

**Don't forget to update script tags in index.html after renaming!**

---

## ⚠️ Important Notes

1. **All features are stored in memory** - Call `getAllFeatures()` to save to backend
2. **GeoJSON format** - Standard format, works with PostGIS, MongoDB, etc.
3. **Coordinates are [longitude, latitude]** - GeoJSON standard (not lat/lng!)
4. **No authentication** - Add your own auth headers to fetch calls
5. **No validation** - Add backend validation for geometry data
6. **Offline capable** - All Leaflet files are local (no CDN)

---

## 🎨 Customization

### Change Map Center:
```javascript
GTAgropticsLeaflet.init({
    center: [YOUR_LAT, YOUR_LNG],
    zoom: 12,
    satellite: true
});
```

### Change Drawing Colors:
Edit `GTAgropticsLeaflet.js` → `initDrawControls()` → `shapeOptions`

### Add Custom Properties:
After drawing, update feature properties:
```javascript
GTAgropticsLeaflet.updateFeatureProperties('feature_1', {
    farmName: 'Green Valley Farm',
    cropType: 'Wheat',
    plantingDate: '2026-03-15'
});
```

---

## 📞 Support

For questions or issues, contact:
**GT Agroptics Development Team**
Email: ashraf.ayman@gulfterminal.net

---

## 🔄 Version

**Version:** 1.1.0  
**Last Updated:** 2026-04-22  
**Status:** Production Ready ✅
