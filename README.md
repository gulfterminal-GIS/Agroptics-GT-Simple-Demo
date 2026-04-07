# 🌾 Agroptics - Satellite Imagery Field Monitoring

A professional web application for monitoring agricultural fields using real satellite imagery data. Visualize crop health, analyze vegetation indices, track field conditions over time with interactive charts, animated timeline playback, and advanced comparison tools.

[![Status](https://img.shields.io/badge/Status-Active-success)](https://github.com/gulfterminal-GIS/Agroptics-GT-Simple-Demo)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-brightgreen)](https://gulfterminal-gis.github.io/Agroptics-GT-Simple-Demo/)

---

## 🎯 What is Agroptics?

Agroptics is a browser-based satellite imagery analysis tool designed for precision agriculture. It processes real GeoTIFF satellite data and presents it through an intuitive interface with interactive maps, time-series charts, and advanced visualization features including timeline animation and swipe comparison.

### Key Capabilities
- 📊 **Real Satellite Data** - 170+ observation dates from Planet/Sentinel imagery
- 🗺️ **Interactive Mapping** - Leaflet-based maps with field boundaries and image overlays
- 📈 **Time-Series Analysis** - 6 chart categories tracking crop health metrics
- 🎬 **Timeline Animation** - Animate through satellite imagery with synchronized chart updates
- 🔄 **Swipe Comparison** - Compare satellite imagery with base maps
- ✏️ **Drawing Tools** - Measure areas and distances with professional GIS tools
- 📁 **GIS File Support** - Upload GeoJSON, KML, Shapefile, GPX files
- 🎨 **Professional UI** - Clean, responsive design optimized for field analysis

---

## ✨ Features

### 🎬 Timeline Player (NEW!)
- **Animated Playback:** Watch satellite imagery change over time
- **Playback Controls:** Play/Pause, First, Previous, Next, Last navigation
- **Speed Control:** 0.5x, 1x, 2x, 4x playback speeds
- **Loop Mode:** Continuous playback option
- **Chart Synchronization:** Charts dynamically update to show data up to current date
- **Image Preloading:** Smooth playback with intelligent caching
- **Timeline Slider:** Drag to any date instantly

### 🔄 Swipe Comparison (NEW!)
- **Toggle Control:** Orange button in timeline to enable/disable
- **Vertical Slider:** Drag left/right to compare imagery with base map
- **Smooth Interaction:** Precise clipping with CSS clip-path
- **Visual Feedback:** White line with blue circular handle

### ✏️ Drawing & Measurement Tools (NEW!)
- **Polygon Drawing:** Draw irregular shapes with area measurements
- **Circle Drawing:** Draw circles with radius and area calculations
- **Distance Measurement:** Measure distances along polylines
- **Multiple Units:** Acres, hectares, sq meters, miles, kilometers, feet
- **Vertex Editing:** Edit drawn shapes by dragging vertices
- **Custom Icons:** Professional GIS-style icons with hover effects
- **Enhanced Popups:** Detailed measurement information

### 📊 Data Visualization
- **6 Vegetation Indices:** NDVI, ETc_NDVI, FC, GCI, MSAVI, RECI
- **6 Chart Categories:** ET, Crop Coefficient, Irrigation, Additional Variables, Depletion, AWC
- **Interactive Charts:** Toggle data series, zoom, hover for details
- **Real-Time Updates:** Charts update instantly when selecting fields
- **Dynamic Data:** Charts sync with timeline playback

### 🗺️ Mapping Features
- **Dual Base Maps:** Satellite imagery (default) or street map
- **Field Boundaries:** Color-coded polygons with hover tooltips
- **Image Overlays:** Display actual satellite imagery on the map
- **Calendar Interface:** Visual date picker for available imagery
- **Zoom & Pan:** Smooth animations and auto-zoom to selected fields

### 📁 File Upload
- **Drag & Drop:** Drag files directly onto the map
- **Multiple Formats:** GeoJSON, KML, Shapefile (zipped), GPX
- **Auto-Display:** Uploaded files appear instantly with random colors
- **Property Popups:** Click features to view attributes

### 🎨 User Interface
- **Split Layout:** 35% map, 65% analysis section
- **Sidebar Navigation:** Field cards with crop information
- **Tabbed Analysis:** Field Info and Planet data tabs
- **Responsive Design:** Works on desktop and tablet devices
- **Dark Theme:** Professional dark header with green accents
- **Compact Timeline:** Optimized height for better screen usage

---

## 🚀 Quick Start

### Option 1: View Live Demo
Visit the deployed site: [GitHub Pages URL]

### Option 2: Run Locally

1. **Clone the repository**
```bash
git clone https://github.com/gulfterminal-GIS/Agroptics-GT-Simple-Demo.git
cd Agroptics-GT-Simple-Demo
```

2. **Start a local web server**
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

3. **Open in browser**
```
http://localhost:8000
```

**Note:** Must use a web server (not file://) due to CORS restrictions.

---

## 📖 Usage Guide

### Viewing Field Data
1. Click on a field card in the left sidebar
2. Map automatically zooms to the selected field
3. Analysis section opens with charts and field information
4. Switch between tabs to view different data categories

### Displaying Satellite Images
1. Select a field from the sidebar
2. Choose a date from the calendar (green = available)
3. Select a vegetation index (NDVI, ETc_NDVI, etc.)
4. Click "Show Image" to overlay on the map

### Using Timeline Animation
1. After showing an image, the timeline player appears at the bottom
2. Click the Play button to start animation
3. Use speed selector to adjust playback speed (0.5x to 4x)
4. Enable Loop for continuous playback
5. Drag the timeline slider to jump to any date
6. Watch charts update dynamically as timeline plays

### Using Swipe Comparison
1. With an image displayed, click the orange swipe button in timeline
2. Drag the vertical slider left/right to compare
3. Click the button again to hide the swipe control

### Drawing and Measuring
1. Use the drawing tools in the top-right corner
2. Click polygon icon to draw irregular shapes
3. Click circle icon to draw circles
4. Click distance icon to measure distances
5. View measurements in popup after drawing
6. Use edit tool to modify drawn shapes
7. Use delete tool to remove shapes
5. Click "Clear" to remove the overlay

### Uploading Custom Fields
1. Click the "Upload" button in the sidebar
2. Select a GIS file (GeoJSON, KML, Shapefile, GPX)
3. File appears on the map with a random color
4. Click features to view their properties in a popup

### Interacting with Charts
1. Hover over chart lines to see values
2. Use checkboxes to toggle data series on/off
3. Switch between 6 chart categories using tabs
4. Charts display real satellite data over time
5. During timeline playback, charts update dynamically

---

## 📂 Project Structure

```
Agroptics-GT-Simple-Demo/
├── index.html                      # Main application (~1900 lines)
├── app.js                          # Core JavaScript logic (~2700 lines)
├── package.json                    # Node.js dependencies
│
├── data/                           # Preprocessed JSON data
│   ├── Field_10_dates.json        # Available dates
│   ├── Field_10_timeseries.json   # Statistics & time-series
│   ├── Field_11_dates.json
│   ├── Field_11_timeseries.json
│   ├── Field_12_and_13_dates.json
│   └── Field_12_and_13_timeseries.json
│
├── exports/                        # Satellite imagery (GeoTIFF)
│   ├── Field_10/
│   │   ├── 2025-03-29/
│   │   │   ├── ETc_NDVI.tif
│   │   │   ├── NDVI.tif
│   │   │   ├── FC.tif
│   │   │   ├── GCI.tif
│   │   │   ├── MSAVI.tif
│   │   │   └── RECI.tif
│   │   └── ... (170+ dates)
│   ├── Field_11/
│   └── Field_12_and_13/
│
├── Field_10.geojson                # Field boundary polygons
├── Field_11.geojson
├── Field_12_and_13.geojson
│
├── preprocess-data-template.js     # Data preprocessing script
│
└── Documentation/
    ├── README.md                   # This file
    ├── SYSTEM_DOCUMENTATION.md     # Complete system reference
    ├── DATA_FLOW_EXPLANATION.md    # Data flow details
    └── CHART_DATA_VISUAL_GUIDE.md  # Chart data guide
```

---

## �️ Technology Stack

### Frontend
- **HTML5/CSS3** - Modern web standards
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **Leaflet.js v1.9.4** - Interactive mapping
- **Leaflet.draw v1.0.4** - Drawing and measurement tools
- **Chart.js v4.4.0** - Data visualization
- **chartjs-plugin-annotation v3.0.1** - Chart annotations

### Data Processing
- **GeoTIFF.js v2.1.3** - Raster image processing
- **shp.js** - Shapefile parsing
- **toGeoJSON** - KML/GPX conversion
- **chartjs-adapter-date-fns** - Date handling for charts

### Hosting
- **GitHub Pages** - Static site hosting
- **No backend** - All processing in browser
- **CDN libraries** - Fast loading from CDN

---

## 📊 Data Sources

### Satellite Imagery
- **Source:** Planet Labs / Sentinel satellites
- **Date Range:** February 2025 - January 2026
- **Frequency:** 3-5 day intervals
- **Resolution:** ~3-10 meters per pixel
- **Format:** GeoTIFF (Cloud-Optimized)

### Field Data
- **Source:** CSU TAPS 2024 field trials
- **Fields:** 3 agricultural fields in Colorado
- **Crops:** Corn, wheat, and mixed crops
- **Attributes:** Planting dates, irrigation, soil type

### Vegetation Indices
- **NDVI** - Normalized Difference Vegetation Index
- **ETc_NDVI** - Crop Evapotranspiration (NDVI-based)
- **FC** - Fractional Cover
- **GCI** - Green Chlorophyll Index
- **MSAVI** - Modified Soil-Adjusted Vegetation Index
- **RECI** - Red Edge Chlorophyll Index

---

## 📚 Documentation

For detailed technical information, see:

- **[SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)** - Complete system architecture, workflows, and API reference
- **[DATA_FLOW_EXPLANATION.md](DATA_FLOW_EXPLANATION.md)** - How data flows from GeoTIFF to charts
- **[CHART_DATA_VISUAL_GUIDE.md](CHART_DATA_VISUAL_GUIDE.md)** - Visual guide to chart data sources

---

## 🔧 Development

### Prerequisites
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)
- Local web server for development
- Git for version control

### Adding New Fields
1. Add GeoJSON file: `Field_X.geojson`
2. Update `FIELD_CONFIGS` in `app.js`
3. Create data files in `data/` folder
4. Add imagery to `exports/Field_X/` folder

### Modifying Charts
1. Edit `createCategoryChart()` function in `app.js`
2. Update datasets array for the category
3. Modify `generateCategoryContent()` for toggles

### Deployment
```bash
git add .
git commit -m "Your changes"
git push origin master
# GitHub Pages auto-deploys in 1-2 minutes
```

---

## 🐛 Known Issues

### Popup Display
- **Issue:** Popups appearing below polygons
- **Status:** ✅ Fixed (z-index configuration)

### GitHub Pages Image Loading
- **Issue:** "Invalid byte order value" error
- **Status:** ✅ Fixed (removed Git LFS)

### Windows Path Length
- **Issue:** Cannot extract raw image folders
- **Status:** ⚠️ Use exports/ folder instead

See [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) for detailed solutions.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines
- Follow existing code style (vanilla JavaScript, ES6+)
- Test thoroughly before submitting
- Update documentation for significant changes
- Keep commits focused and descriptive

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **CSU TAPS 2024** - Field data and research collaboration
- **Planet Labs** - Satellite imagery data
- **Leaflet.js** - Excellent mapping library
- **Chart.js** - Beautiful chart visualizations
- **Open Source Community** - For amazing tools and libraries

---

## 📧 Contact & Support

- **Issues:** [GitHub Issues](https://github.com/gulfterminal-GIS/Agroptics-GT-Simple-Demo/issues)
- **Repository:** [GitHub](https://github.com/gulfterminal-GIS/Agroptics-GT-Simple-Demo)

---

## 🌟 Star This Project

If you find Agroptics useful, please consider giving it a star on GitHub! ⭐

---

**Built with ❤️ for precision agriculture and sustainable farming**
