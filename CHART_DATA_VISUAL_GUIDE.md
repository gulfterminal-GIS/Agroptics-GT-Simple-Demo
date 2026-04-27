# Visual Guide: Chart Data Flow

## 🎯 Quick Answer
**Your charts display REAL satellite imagery data** from the GeoTIFF files in your `exports/` folder, preprocessed into JSON format for fast loading.

---

## 📊 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SATELLITE IMAGERY                             │
│                  (Original GeoTIFF Files)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Stored in exports/ folder
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  exports/Field_10/2025-03-29/                                   │
│    ├── ETc_NDVI.tif  ← Evapotranspiration                      │
│    ├── NDVI.tif      ← Vegetation Index                        │
│    ├── FC.tif        ← Fractional Cover                        │
│    ├── GCI.tif       ← Green Chlorophyll Index                 │
│    ├── MSAVI.tif     ← Soil-Adjusted Vegetation Index          │
│    └── RECI.tif      ← Red Edge Chlorophyll Index              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Preprocessed (statistics calculated)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PREPROCESSED JSON FILES                             │
│              (data/ folder)                                      │
│                                                                  │
│  data/Field_10_timeseries.json                                  │
│  {                                                               │
│    "timeSeries": [                                              │
│      {                                                           │
│        "date": "2025-03-29",                                    │
│        "indices": {                                             │
│          "ETc_NDVI": { "mean": 0.0024, ... },                  │
│          "NDVI": { "mean": 0.0393, ... },                      │
│          "FC": { "mean": 0, ... },                             │
│          ...                                                     │
│        }                                                         │
│      }                                                           │
│    ]                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks field card
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              JAVASCRIPT LOADS DATA                               │
│              loadFieldData(fieldId)                              │
│                                                                  │
│  fetch(`data/${fieldId}_timeseries.json`)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Process data
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              DATA PROCESSING                                     │
│              processTimeSeriesData()                             │
│                                                                  │
│  Extract mean values:                                           │
│    andy = ETc_NDVI.mean                                         │
│    ndvi = NDVI.mean                                             │
│    fc = FC.mean                                                 │
│    gci = GCI.mean                                               │
│                                                                  │
│  Calculate derived values:                                      │
│    ensemble = (ETc_NDVI + FC) / 2                              │
│    fao56 = ETc_NDVI × 1.05                                     │
│    awc = 0.7 - (FC × 0.3)                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Create visualizations
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              CHART.JS CHARTS                                     │
│              createCategoryChart()                               │
│                                                                  │
│  📈 ET Chart                                                    │
│  📈 Crop Coefficient Chart                                      │
│  📈 Irrigation Chart                                            │
│  📈 Additional Variables Chart                                  │
│  📈 Depletion Chart                                             │
│  📈 AWC Chart                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Display to user
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER SEES INTERACTIVE CHARTS                        │
│              in Analysis Section                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detailed Breakdown

### 1️⃣ Original Data: GeoTIFF Files

**Location:** `exports/Field_10/2025-03-29/`

Each date folder contains 6 satellite imagery analysis files:

| File | Full Name | What It Measures |
|------|-----------|------------------|
| **ETc_NDVI.tif** | Crop Evapotranspiration (NDVI-based) | Water used by crops |
| **NDVI.tif** | Normalized Difference Vegetation Index | Plant health/greenness |
| **FC.tif** | Fractional Cover | Ground covered by vegetation |
| **GCI.tif** | Green Chlorophyll Index | Chlorophyll content |
| **MSAVI.tif** | Modified Soil-Adjusted Vegetation Index | Vegetation with soil correction |
| **RECI.tif** | Red Edge Chlorophyll Index | Chlorophyll using red edge band |

**Format:** GeoTIFF (georeferenced raster images)
**Size:** Each file contains pixel-by-pixel values for the entire field

---

### 2️⃣ Preprocessed Data: JSON Files

**Location:** `data/Field_10_timeseries.json`

**What happened:** Someone (or a script) processed all the GeoTIFF files and calculated statistics:

```json
{
  "date": "2025-03-29",
  "indices": {
    "NDVI": {
      "mean": 0.0393,      ← Average NDVI across all pixels
      "min": -0.0129,      ← Minimum value
      "max": 0.1263,       ← Maximum value
      "std": 0.0157,       ← Standard deviation
      "p25": 0.0302,       ← 25th percentile
      "p50": 0.0397,       ← Median (50th percentile)
      "p75": 0.0495,       ← 75th percentile
      "count": 3526        ← Number of pixels analyzed
    }
  }
}
```

**Why JSON?** 
- ✅ Much faster to load than processing GeoTIFF files in the browser
- ✅ Smaller file size
- ✅ Easy to work with in JavaScript

---

### 3️⃣ Data Loading: JavaScript Fetch

**File:** `app.js` (line ~490)

```javascript
// When user clicks a field card:
async function loadFieldData(fieldId) {
    // Fetch the JSON file
    const response = await fetch(`data/${fieldId}_timeseries.json`);
    const jsonData = await response.json();
    
    // Process it
    const processedData = processTimeSeriesData(jsonData);
    
    // Create charts
    createCategoryChart('et', processedData);
    // ... more charts
}
```

---

### 4️⃣ Data Processing: Extract Values

**File:** `app.js` (line ~525)

```javascript
function processTimeSeriesData(jsonData) {
    const timeSeries = jsonData.timeSeries.map(entry => {
        const indices = entry.indices;
        
        // Extract the MEAN value from each index
        const etcNdvi = indices.ETc_NDVI?.mean || 0;  // ← Gets 0.0024
        const ndvi = indices.NDVI?.mean || 0;         // ← Gets 0.0393
        const fc = indices.FC?.mean || 0;             // ← Gets 0
        const gci = indices.GCI?.mean || 0;           // ← Gets 0.3848
        
        return {
            date: new Date(entry.date),
            andy: etcNdvi,                    // Direct value
            ndvi: ndvi,                       // Direct value
            fc: fc,                           // Direct value
            ensemble: (etcNdvi + fc) / 2,    // Calculated
            fao56: etcNdvi * 1.05,           // Calculated
            gci: gci,                         // Direct value
            // ... more values
        };
    });
    
    return { timeSeries, irrigationDates };
}
```

**Key Point:** The charts use the **mean (average)** value from each GeoTIFF file.

---

### 5️⃣ Chart Creation: Mapping Data to Lines

**File:** `app.js` (line ~615)

Each chart category displays different data:

#### 📊 ET Chart
```javascript
datasets = [
    {
        label: 'Andy',
        data: data.timeSeries.map(d => d.andy),  // ← ETc_NDVI mean
        borderColor: '#2c5f2d'
    },
    {
        label: 'NDVI',
        data: data.timeSeries.map(d => d.ndvi),  // ← NDVI mean
        borderColor: '#4CAF50'
    },
    {
        label: 'FC',
        data: data.timeSeries.map(d => d.fc),    // ← FC mean
        borderColor: '#8BC34A'
    },
    {
        label: 'Ensemble',
        data: data.timeSeries.map(d => d.ensemble), // ← (ETc_NDVI + FC) / 2
        borderColor: '#CDDC39'
    },
    {
        label: 'FAO56',
        data: data.timeSeries.map(d => d.fao56),    // ← ETc_NDVI × 1.05
        borderColor: '#FFC107'
    }
]
```

#### 📊 Additional Variables Chart
```javascript
datasets = [
    {
        label: 'NDVI',
        data: data.timeSeries.map(d => d.ndvi),  // ← NDVI mean
        borderColor: '#8BC34A'
    },
    {
        label: 'GCI',
        data: data.timeSeries.map(d => d.gci),   // ← GCI mean
        borderColor: '#CDDC39'
    }
]
```

---

## 🎨 What Each Chart Line Represents

### Chart: ET (Evapotranspiration)
| Line Name | Data Source | Meaning |
|-----------|-------------|---------|
| **Andy** | ETc_NDVI.tif mean | NDVI-based crop water use |
| **NDVI** | NDVI.tif mean | Vegetation index |
| **FC** | FC.tif mean | Fractional cover |
| **Ensemble** | (ETc_NDVI + FC) / 2 | Average of two methods |
| **FAO56** | ETc_NDVI × 1.05 | FAO-56 adjusted ET |

### Chart: Additional Variables
| Line Name | Data Source | Meaning |
|-----------|-------------|---------|
| **NDVI** | NDVI.tif mean | Vegetation health |
| **GCI** | GCI.tif mean | Chlorophyll content |

### Chart: Crop Coefficient
Uses the same data as ET but multiplied by different factors (1.1x, 1.2x, etc.)

### Chart: Depletion
Uses inverted values: `1 - value` to show water depletion

### Chart: AWC (Available Water Content)
Calculated from FC: `0.7 - (FC × 0.3)`

---

## ⚠️ Fallback: Sample Data

If JSON files fail to load, the app generates **synthetic data** using math:

```javascript
function generateSampleData(fieldId) {
    // Creates fake data using sine waves for seasonal patterns
    const growthFactor = Math.sin((dayOfYear - 60) / 365 * Math.PI * 2) * 0.5 + 0.5;
    
    ndvi: 0.2 + growthFactor * 0.6 + random_noise
    // This creates a smooth curve that looks realistic
}
```

**How to tell if you're seeing real vs. sample data:**
- ✅ **Real data:** Irregular patterns, actual dates from your exports folder
- ⚠️ **Sample data:** Smooth sine wave patterns, evenly spaced dates

---

## 🎯 Summary

```
GeoTIFF Files (exports/) 
    ↓ [Preprocessed]
JSON Files (data/)
    ↓ [Loaded by JavaScript]
Processed Data (mean values extracted)
    ↓ [Mapped to chart datasets]
Chart.js Visualizations
    ↓ [Displayed to user]
Interactive Charts in Analysis Section
```

**Your charts show REAL satellite data!** 🛰️📊
