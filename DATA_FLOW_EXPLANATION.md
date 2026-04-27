# Chart Data Flow Explanation

## Overview
The charts in your application display satellite imagery analysis data over time. Here's exactly where the data comes from and how it flows through the system.

---

## Data Sources

### 1. **Primary Source: Preprocessed JSON Files** (REAL DATA)
Located in the `data/` folder:
- `Field_10_timeseries.json`
- `Field_11_timeseries.json`
- `Field_12_and_13_timeseries.json`

These files contain **real satellite imagery analysis** from your exports folder.

#### Data Structure:
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
          "count": 3526
        },
        "NDVI": { "mean": 0.0393, ... },
        "FC": { "mean": 0, ... },
        "GCI": { "mean": 0.3848, ... },
        "MSAVI": { "mean": 0.0751, ... },
        "RECI": { "mean": -0.1886, ... }
      }
    },
    // ... more dates
  ],
  "irrigationEvents": [
    { "date": "2025-06-13", "type": "irrigation" }
  ]
}
```

### 2. **Fallback Source: Generated Sample Data** (SYNTHETIC DATA)
If the JSON files fail to load, the app generates synthetic data using mathematical formulas.

---

## Data Flow Process

### Step 1: User Selects a Field
```
User clicks on Field Card → zoomToField(fieldId) → loadFieldDates(fieldId)
```

### Step 2: Load Field Data
**Function:** `loadFieldData(fieldId)` in `app.js` (line ~490)

```javascript
async function loadFieldData(fieldId) {
    try {
        // 🔹 STEP 1: Fetch the JSON file
        const response = await fetch(`data/${fieldId}_timeseries.json`);
        
        // 🔹 STEP 2: Parse JSON
        const jsonData = await response.json();
        
        // 🔹 STEP 3: Process the data
        const processedData = processTimeSeriesData(jsonData);
        
        // 🔹 STEP 4: Store in app state
        AppState.categoryData = processedData;
        
        // 🔹 STEP 5: Create all charts
        createCategoryChart('et', processedData);
        createCategoryChart('crop', processedData);
        createCategoryChart('irrigation', processedData);
        createCategoryChart('additional', processedData);
        createCategoryChart('depletion', processedData);
        createCategoryChart('awc', processedData);
    } catch (error) {
        // ⚠️ FALLBACK: Generate synthetic data
        const sampleData = generateSampleData(fieldId);
        // ... create charts with sample data
    }
}
```

### Step 3: Process Raw Data
**Function:** `processTimeSeriesData(jsonData)` in `app.js` (line ~525)

This function transforms the raw JSON into chart-ready format:

```javascript
function processTimeSeriesData(jsonData) {
    const timeSeries = jsonData.timeSeries.map(entry => {
        const date = new Date(entry.date);
        const indices = entry.indices;
        
        // Extract mean values from each satellite index
        const etcNdvi = indices.ETc_NDVI?.mean || 0;
        const ndvi = indices.NDVI?.mean || 0;
        const fc = indices.FC?.mean || 0;
        const gci = indices.GCI?.mean || 0;
        const msavi = indices.MSAVI?.mean || 0;
        const reci = indices.RECI?.mean || 0;
        
        return {
            date: date,
            // ET Category
            andy: etcNdvi,              // ← Uses ETc_NDVI mean
            ndvi: ndvi,                 // ← Uses NDVI mean
            fc: fc,                     // ← Uses FC mean
            ensemble: (etcNdvi + fc) / 2,  // ← Calculated average
            fao56: etcNdvi * 1.05,      // ← Calculated (5% increase)
            // Additional indices
            gci: gci,
            msavi: msavi,
            savi: msavi,                // ← Uses MSAVI as SAVI
            reci: reci,
            // Derived values
            awc: Math.max(0, Math.min(1, 0.7 - fc * 0.3)),
            precipitation: 0
        };
    });
    
    return {
        timeSeries: timeSeries,
        irrigationDates: jsonData.irrigationEvents || []
    };
}
```

### Step 4: Create Charts
**Function:** `createCategoryChart(category, data)` in `app.js` (line ~615)

Each chart category uses different combinations of the processed data:

#### ET Chart (Evapotranspiration)
```javascript
datasets = [
    { label: 'Andy', data: data.timeSeries.map(d => d.andy) },      // ETc_NDVI
    { label: 'NDVI', data: data.timeSeries.map(d => d.ndvi) },      // NDVI
    { label: 'FC', data: data.timeSeries.map(d => d.fc) },          // FC
    { label: 'Ensemble', data: data.timeSeries.map(d => d.ensemble) }, // Average
    { label: 'FAO56', data: data.timeSeries.map(d => d.fao56) }     // ETc_NDVI * 1.05
]
```

#### Crop Coefficient Chart
```javascript
datasets = [
    { label: 'Andy', data: data.timeSeries.map(d => d.andy * 1.2) },
    { label: 'NDVI', data: data.timeSeries.map(d => d.ndvi * 1.1) },
    // ... multiplied by different factors
]
```

#### Additional Variables Chart
```javascript
datasets = [
    { label: 'NDVI', data: data.timeSeries.map(d => d.ndvi) },
    { label: 'GCI', data: data.timeSeries.map(d => d.gci) }
]
```

---

## Where Does the Original Data Come From?

### The `exports/` Folder
Your `exports/` folder contains GeoTIFF images organized by field and date:
```
exports/
  Field_10/
    2025-03-29/
      ETc_NDVI.tif
      NDVI.tif
      FC.tif
      GCI.tif
      MSAVI.tif
      RECI.tif
    2025-04-01/
      ...
```

### Data Preprocessing (Not in Current Code)
The JSON files in `data/` folder were created by:
1. Reading each GeoTIFF file from `exports/`
2. Calculating statistics (mean, min, max, std, percentiles) for each image
3. Organizing by date and field
4. Saving as JSON for fast loading

**Note:** The preprocessing script is not currently in your repository, but the preprocessed JSON files are already there and working.

---

## Data Mapping Summary

| Chart Display Name | Source Data | Calculation |
|-------------------|-------------|-------------|
| **Andy** | ETc_NDVI.tif mean | Direct value |
| **NDVI** | NDVI.tif mean | Direct value |
| **FC** | FC.tif mean | Direct value |
| **GCI** | GCI.tif mean | Direct value |
| **MSAVI** | MSAVI.tif mean | Direct value |
| **RECI** | RECI.tif mean | Direct value |
| **Ensemble** | ETc_NDVI + FC | (ETc_NDVI + FC) / 2 |
| **FAO56** | ETc_NDVI | ETc_NDVI × 1.05 |
| **SAVI** | MSAVI | Uses MSAVI value |
| **AWC** | FC | 0.7 - (FC × 0.3) |

---

## Fallback: Sample Data Generation

If JSON files fail to load, `generateSampleData(fieldId)` creates synthetic data using:
- Sine wave for seasonal growth patterns
- Random noise for variation
- Date range: March 2025 to January 2026
- Hardcoded irrigation dates per field

```javascript
const growthFactor = Math.sin((dayOfYear - 60) / 365 * Math.PI * 2) * 0.5 + 0.5;
ndvi: Math.max(0, Math.min(1, 0.2 + growthFactor * 0.6 + (Math.random() - 0.5) * 0.1))
```

---

## Summary

**Your charts display REAL satellite data** that has been:
1. ✅ Captured from satellite imagery (GeoTIFF files in `exports/`)
2. ✅ Preprocessed into JSON format (files in `data/`)
3. ✅ Loaded dynamically when you select a field
4. ✅ Processed to extract mean values
5. ✅ Rendered as interactive Chart.js visualizations

The data represents actual vegetation indices, evapotranspiration, and crop health metrics calculated from satellite imagery over time!
