/**
 * Agroptics Satellite Imagery Demo
 * Main Application Script - Restructured with Modal
 */

// Global state
const AppState = {
    map: null,
    selectedField: null,
    fieldLayers: {},
    fieldData: {},
    charts: {},
    currentCategory: 'et',
    categoryData: null,
    imageOverlay: null,
    availableDates: [],
    selectedDate: null,
    currentCalendarMonth: new Date(),
    uploadedLayers: [],
    swipeSlider: null,
    comparisonMaps: {
        map1: null,
        map2: null,
        mapDiff: null
    },
    comparisonData: {
        date1: null,
        date2: null,
        index: null,
        data1: null,
        data2: null
    }
};

// Field configurations
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

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    loadAllFields();
    setupAnalysisSection();
    setupImageOverlayControls();
    setupFileUpload();
});

/**
 * Initialize Leaflet map
 */
function initializeMap() {
    AppState.map = L.map('map').setView([40.6135, -104.9945], 14);

    // Define base layers
    const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 19
    });

    // Add satellite as default
    satellite.addTo(AppState.map);

    const baseMaps = {
        "Satellite": satellite,
        "Street Map": streetMap
    };

    // Layer control hidden - basemap switching disabled
    // L.control.layers(baseMaps).addTo(AppState.map);

    // Initialize drawing controls
    initializeDrawingControls();
}

/**
 * Initialize drawing controls with custom styling
 */
function initializeDrawingControls() {
    // Create a feature group to store drawn items
    const drawnItems = new L.FeatureGroup();
    AppState.map.addLayer(drawnItems);
    AppState.drawnItems = drawnItems;

    // Configure draw control options with area display
    const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            polyline: {
                shapeOptions: {
                    color: '#FF9800',
                    weight: 3
                },
                showLength: true,
                metric: true,
                feet: false
            },
            rectangle: false,
            marker: false,
            circlemarker: false,
            polygon: {
                allowIntersection: false,
                showArea: true,
                metric: ['km', 'm'],
                feet: false,
                shapeOptions: {
                    color: '#2196F3',
                    weight: 3,
                    fillColor: '#2196F3',
                    fillOpacity: 0.3
                },
                drawError: {
                    color: '#d32f2f',
                    timeout: 1000
                }
            },
            circle: {
                shapeOptions: {
                    color: '#2196F3',
                    weight: 3,
                    fillColor: '#2196F3',
                    fillOpacity: 0.3
                },
                showRadius: true,
                metric: true,
                feet: false
            }
        },
        edit: {
            featureGroup: drawnItems,
            edit: {
                selectedPathOptions: {
                    maintainColor: true,
                    opacity: 0.6,
                    dashArray: '10, 10'
                }
            }
        }
    });

    AppState.map.addControl(drawControl);

    // Custom area calculation function
    function calculateArea(latlngs) {
        let area = 0;
        if (latlngs && latlngs.length > 2) {
            for (let i = 0; i < latlngs.length; i++) {
                const j = (i + 1) % latlngs.length;
                const xi = latlngs[i].lng;
                const yi = latlngs[i].lat;
                const xj = latlngs[j].lng;
                const yj = latlngs[j].lat;
                area += xi * yj - xj * yi;
            }
            area = Math.abs(area / 2);
            // Convert to square meters (approximate)
            const metersPerDegree = 111320;
            area = area * metersPerDegree * metersPerDegree;
        }
        return area;
    }

    // Handle draw created event
    AppState.map.on(L.Draw.Event.CREATED, function (event) {
        const layer = event.layer;
        const type = event.layerType;
        
        // Apply styling to drawn shapes
        if (type === 'polyline') {
            layer.setStyle({
                color: '#FF9800',
                weight: 3
            });
        } else if (layer.setStyle) {
            layer.setStyle({
                color: '#2196F3',
                weight: 3,
                fillColor: '#2196F3',
                fillOpacity: 0.3
            });
        }
        
        drawnItems.addLayer(layer);
        
        // Add popup with enhanced styling
        let popupContent = `<div class="field-popup">
            <h3>${type.charAt(0).toUpperCase() + type.slice(1)}</h3>`;
        
        if (type === 'polyline') {
            // Calculate distance
            const latlngs = layer.getLatLngs();
            let totalDistance = 0;
            
            for (let i = 0; i < latlngs.length - 1; i++) {
                totalDistance += latlngs[i].distanceTo(latlngs[i + 1]);
            }
            
            const meters = totalDistance.toFixed(2);
            const kilometers = (totalDistance / 1000).toFixed(2);
            const miles = (totalDistance * 0.000621371).toFixed(2);
            const feet = (totalDistance * 3.28084).toFixed(2);
            
            popupContent += `
                <div class="metric-row">
                    <span class="metric-label">Meters</span>
                    <span class="metric-value">${meters} m</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Kilometers</span>
                    <span class="metric-value">${kilometers} km</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Miles</span>
                    <span class="metric-value">${miles} mi</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Feet</span>
                    <span class="metric-value">${feet} ft</span>
                </div>`;
        } else if (type === 'polygon') {
            const latlngs = layer.getLatLngs()[0];
            const area = calculateArea(latlngs);
            const acres = (area * 0.000247105).toFixed(2);
            const hectares = (area / 10000).toFixed(2);
            const sqMeters = area.toFixed(0);
            
            popupContent += `
                <div class="metric-row">
                    <span class="metric-label">Acres</span>
                    <span class="metric-value">${acres} ac</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Hectares</span>
                    <span class="metric-value">${hectares} ha</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Square Meters</span>
                    <span class="metric-value">${sqMeters} m²</span>
                </div>`;
        } else if (type === 'circle') {
            const radius = layer.getRadius();
            const area = Math.PI * radius * radius;
            const acres = (area * 0.000247105).toFixed(2);
            const hectares = (area / 10000).toFixed(2);
            const sqMeters = area.toFixed(0);
            
            popupContent += `
                <div class="metric-row">
                    <span class="metric-label">Radius</span>
                    <span class="metric-value">${radius.toFixed(2)} m</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Acres</span>
                    <span class="metric-value">${acres} ac</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Hectares</span>
                    <span class="metric-value">${hectares} ha</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Square Meters</span>
                    <span class="metric-value">${sqMeters} m²</span>
                </div>`;
        }
        
        popupContent += '</div>';
        layer.bindPopup(popupContent);
        layer.openPopup();
    });

    // Handle draw edited event
    AppState.map.on(L.Draw.Event.EDITED, function (event) {
        const layers = event.layers;
        layers.eachLayer(function (layer) {
            // Update popup content for polyline (distance)
            if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                const latlngs = layer.getLatLngs();
                let totalDistance = 0;
                
                for (let i = 0; i < latlngs.length - 1; i++) {
                    totalDistance += latlngs[i].distanceTo(latlngs[i + 1]);
                }
                
                const meters = totalDistance.toFixed(2);
                const kilometers = (totalDistance / 1000).toFixed(2);
                const miles = (totalDistance * 0.000621371).toFixed(2);
                const feet = (totalDistance * 3.28084).toFixed(2);
                
                const popupContent = `<div class="field-popup">
                    <h3>Edited Distance</h3>
                    <div class="metric-row">
                        <span class="metric-label">Meters</span>
                        <span class="metric-value">${meters} m</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Kilometers</span>
                        <span class="metric-value">${kilometers} km</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Miles</span>
                        <span class="metric-value">${miles} mi</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Feet</span>
                        <span class="metric-value">${feet} ft</span>
                    </div>
                </div>`;
                layer.setPopupContent(popupContent);
            }
            // Update popup content if it's a polygon
            else if (layer instanceof L.Polygon && !(layer instanceof L.Circle)) {
                const latlngs = layer.getLatLngs()[0];
                const area = calculateArea(latlngs);
                const acres = (area * 0.000247105).toFixed(2);
                const hectares = (area / 10000).toFixed(2);
                const sqMeters = area.toFixed(0);
                
                const popupContent = `<div class="field-popup">
                    <h3>Edited Polygon</h3>
                    <div class="metric-row">
                        <span class="metric-label">Acres</span>
                        <span class="metric-value">${acres} ac</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Hectares</span>
                        <span class="metric-value">${hectares} ha</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Square Meters</span>
                        <span class="metric-value">${sqMeters} m²</span>
                    </div>
                </div>`;
                layer.setPopupContent(popupContent);
            } else if (layer instanceof L.Circle) {
                const radius = layer.getRadius();
                const area = Math.PI * radius * radius;
                const acres = (area * 0.000247105).toFixed(2);
                const hectares = (area / 10000).toFixed(2);
                const sqMeters = area.toFixed(0);
                
                const popupContent = `<div class="field-popup">
                    <h3>Edited Circle</h3>
                    <div class="metric-row">
                        <span class="metric-label">Radius</span>
                        <span class="metric-value">${radius.toFixed(2)} m</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Acres</span>
                        <span class="metric-value">${acres} ac</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Hectares</span>
                        <span class="metric-value">${hectares} ha</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Square Meters</span>
                        <span class="metric-value">${sqMeters} m²</span>
                    </div>
                </div>`;
                layer.setPopupContent(popupContent);
            }
        });
    });

    // Handle draw deleted event
    AppState.map.on(L.Draw.Event.DELETED, function (event) {
        console.log('Shapes deleted:', event.layers.getLayers().length);
    });

    // Show area while drawing polygon
    AppState.map.on('draw:drawvertex', function (e) {
        const layers = e.layers;
        layers.eachLayer(function (layer) {
            if (layer instanceof L.Polygon) {
                const latlngs = layer.getLatLngs()[0];
                if (latlngs.length > 2) {
                    const area = calculateArea(latlngs);
                    const acres = (area * 0.000247105).toFixed(2);
                    console.log(`Current area: ${acres} acres`);
                }
            }
        });
    });

    // Show drawing tools tooltip on load
    showDrawingToolsTooltip();
}

/**
 * Show tooltip pointing to drawing tools
 */
function showDrawingToolsTooltip() {
    const tooltip = document.getElementById('drawingToolsTooltip');
    if (!tooltip) return;

    // Show tooltip after a short delay
    setTimeout(() => {
        tooltip.classList.remove('hidden');
    }, 1000);

    // Hide tooltip after 5 seconds
    setTimeout(() => {
        tooltip.classList.add('hidden');
    }, 6000);

    // Hide tooltip when user clicks on drawing tools
    const drawToolbar = document.querySelector('.leaflet-draw-toolbar');
    if (drawToolbar) {
        drawToolbar.addEventListener('click', () => {
            tooltip.classList.add('hidden');
        });
    }

    // Hide tooltip when user starts drawing
    AppState.map.on('draw:drawstart', () => {
        tooltip.classList.add('hidden');
    });
}

/**
 * Load all field GeoJSON files
 */
async function loadAllFields() {
    const fieldListContainer = document.querySelector('.field-list');
    
    for (const [fieldId, config] of Object.entries(FIELD_CONFIGS)) {
        try {
            const response = await fetch(config.geojsonFile);
            const geojson = await response.json();
            
            AppState.fieldData[fieldId] = geojson.properties;
            addFieldToMap(fieldId, geojson, config);
            addFieldCard(fieldId, geojson.properties, config);
        } catch (error) {
            console.error(`Error loading ${config.name}:`, error);
        }
    }
}

/**
 * Add field card to sidebar
 */
function addFieldCard(fieldId, properties, config) {
    const fieldListContainer = document.querySelector('.field-list');
    
    const card = document.createElement('div');
    card.className = 'field-card';
    card.dataset.fieldId = fieldId;
    
    card.innerHTML = `
        <div class="field-card-header">
            <div class="field-color" style="background: ${config.color};"></div>
            <div>
                <span class="field-name">${properties.fieldName}</span>
                <span class="field-crop">(${formatCropName(properties.cropType)})</span>
            </div>
        </div>
        <div class="field-details">
            ${properties.fieldSize} acres • Planted ${formatDate(properties.plantingDate)}
        </div>
    `;
    
    card.addEventListener('click', () => {
        zoomToField(fieldId);
    });
    
    fieldListContainer.appendChild(card);
}

/**
 * Zoom to field with animation and flash
 */
function zoomToField(fieldId) {
    const layer = AppState.fieldLayers[fieldId];
    if (!layer) return;
    
    AppState.selectedField = fieldId;
    
    document.querySelectorAll('.field-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-field-id="${fieldId}"]`).classList.add('active');
    
    const bounds = layer.getBounds();
    AppState.map.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 1.5
    });
    
    setTimeout(() => {
        flashField(fieldId);
        loadFieldDates(fieldId);
        
        // Open analysis section with field data
        const fieldData = AppState.fieldData[fieldId];
        openAnalysisSection(fieldId, fieldData);
    }, 1500);
}

/**
 * Flash field polygon
 */
function flashField(fieldId) {
    const layer = AppState.fieldLayers[fieldId];
    if (!layer) return;
    
    let flashCount = 0;
    const maxFlashes = 6;
    const flashInterval = setInterval(() => {
        if (flashCount >= maxFlashes) {
            clearInterval(flashInterval);
            layer.setStyle({ fillOpacity: 0.4 });
            return;
        }
        
        const opacity = flashCount % 2 === 0 ? 0.1 : 0.7;
        layer.setStyle({ fillOpacity: opacity });
        flashCount++;
    }, 250);
}

/**
 * Add field polygon to map
 */
function addFieldToMap(fieldId, geojson, config) {
    const layer = L.geoJSON(geojson, {
        style: {
            color: config.color,
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.2
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            
            // Tooltip content for hover
            const tooltipContent = `
                <div style="font-size: 12px; padding: 4px;">
                    <strong>${props.fieldName}</strong><br>
                    ${formatCropName(props.cropType)} • ${props.fieldSize} acres
                </div>
            `;
            layer.bindTooltip(tooltipContent, {
                permanent: false,
                direction: 'top',
                className: 'field-tooltip',
                offset: [0, -10],
                opacity: 1
            });

            // Clicking polygon does nothing now - use field cards instead
            layer.on('click', () => {
                // Optional: could zoom to field or show a message
            });

            layer.on('mouseover', function() {
                this.setStyle({
                    fillOpacity: 0.4,
                    weight: 4
                });
            });

            layer.on('mouseout', function() {
                this.setStyle({
                    fillOpacity: 0.2,
                    weight: 3
                });
            });
        }
    }).addTo(AppState.map);

    AppState.fieldLayers[fieldId] = layer;
}

/**
 * Setup analysis section functionality
 */
function setupAnalysisSection() {
    const closeBtn = document.getElementById('analysisClose');
    const analysisTabs = document.querySelectorAll('.analysis-tab');
    
    closeBtn.addEventListener('click', closeAnalysisSection);
    
    analysisTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('disabled')) return;
            
            analysisTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.analysis-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const tabName = tab.dataset.analysisTab;
            document.getElementById(`analysis-${tabName}-content`).classList.add('active');
        });
    });
}

/**
 * Open analysis section
 */
function openAnalysisSection(fieldId, properties) {
    AppState.selectedField = fieldId;
    
    const analysisSection = document.getElementById('analysisSection');
    const analysisTitle = document.getElementById('analysisTitle');
    
    analysisTitle.textContent = properties.fieldName;
    
    // Remove empty state
    analysisSection.classList.remove('empty');
    analysisSection.classList.add('active');
    
    // Populate tabs
    populateFieldInfo(properties, 'analysis-field-info-content');
    populatePlanetTab(fieldId, properties, 'analysis-planet-content');
    
    // Switch to Planet tab by default
    document.querySelectorAll('.analysis-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-analysis-tab="planet"]').classList.add('active');
    
    document.querySelectorAll('.analysis-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('analysis-planet-content').classList.add('active');
}

/**
 * Close analysis section
 */
function closeAnalysisSection() {
    const analysisSection = document.getElementById('analysisSection');
    analysisSection.classList.remove('active');
    analysisSection.classList.add('empty');
}

/**
 * Populate field info tab
 */
function populateFieldInfo(properties, containerId = 'field-info-content') {
    const content = `
        <div class="field-info">
            <h2>${properties.fieldName}</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Crop Type</span>
                    <span class="info-value">${formatCropName(properties.cropType)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Field Size</span>
                    <span class="info-value">${properties.fieldSize} acres</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Planting Date</span>
                    <span class="info-value">${formatDate(properties.plantingDate)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Irrigation Method</span>
                    <span class="info-value">${properties.irrigMethod}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Soil Texture</span>
                    <span class="info-value">${formatSoilTexture(properties.soilTexture)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Cultivar</span>
                    <span class="info-value">${properties.cultivar || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById(containerId).innerHTML = content;
}

/**
 * Populate planet tab with category tabs and charts
 */
async function populatePlanetTab(fieldId, properties, containerId = 'planet-content') {
    const content = `
        <div class="category-tabs">
            <button class="category-tab active" data-category="et">ET</button>
            <button class="category-tab" data-category="crop">Crop Coefficient</button>
            <button class="category-tab" data-category="irrigation">Irrigation</button>
            <button class="category-tab" data-category="additional">Additional Variables</button>
            <button class="category-tab" data-category="depletion">Depletion</button>
            <button class="category-tab" data-category="awc">Available Water Content</button>
        </div>
        
        ${generateCategoryContent('et')}
        ${generateCategoryContent('crop')}
        ${generateCategoryContent('irrigation')}
        ${generateCategoryContent('additional')}
        ${generateCategoryContent('depletion')}
        ${generateCategoryContent('awc')}
    `;
    
    document.getElementById(containerId).innerHTML = content;
    
    await loadFieldData(fieldId);
    
    setupCategoryTabs();
    setupToggleButtons();
}

/**
 * Generate content for each category
 */
function generateCategoryContent(category) {
    const categoryConfig = {
        et: {
            title: 'ET Values',
            indices: [
                { name: 'Andy', color: '#2c5f2d' },
                { name: 'NDVI', color: '#4CAF50' },
                { name: 'FC', color: '#8BC34A' },
                { name: 'Ensemble', color: '#CDDC39' },
                { name: 'FAO56', color: '#FFC107' }
            ]
        },
        crop: {
            title: 'Crop Coefficient Values',
            indices: [
                { name: 'Andy', color: '#FF9800' },
                { name: 'NDVI', color: '#FF5722' },
                { name: 'FC', color: '#F44336' },
                { name: 'Ensemble', color: '#E91E63' },
                { name: 'FAO56', color: '#9C27B0' }
            ]
        },
        irrigation: {
            title: 'Irrigation and Precipitation',
            indices: [
                { name: 'Precipitation', color: '#3F51B5' },
                { name: 'Andy', color: '#2196F3' },
                { name: 'NDVI', color: '#03A9F4' },
                { name: 'FC', color: '#00BCD4' },
                { name: 'Ensemble', color: '#009688' },
                { name: 'FAO56', color: '#4DB6AC' }
            ]
        },
        additional: {
            title: 'Additional Variables',
            indices: [
                { name: 'NDVI', color: '#8BC34A' },
                { name: 'GCI', color: '#CDDC39' }
            ]
        },
        depletion: {
            title: 'Depletion Values',
            indices: [
                { name: 'Andy', color: '#FFC107' },
                { name: 'NDVI', color: '#FF9800' },
                { name: 'FC', color: '#FF5722' },
                { name: 'Ensemble', color: '#F44336' },
                { name: 'FAO56', color: '#E91E63' },
                { name: 'SAVI', color: '#9C27B0' }
            ]
        },
        awc: {
            title: 'Available Water Content',
            indices: [
                { name: 'Andy', color: '#673AB7' },
                { name: 'NDVI', color: '#3F51B5' },
                { name: 'FC', color: '#2196F3' },
                { name: 'AWC', color: '#03A9F4' },
                { name: 'SAVI', color: '#00BCD4' },
                { name: 'FAO56', color: '#009688' }
            ]
        }
    };
    
    const config = categoryConfig[category];
    const isActive = category === 'et' ? 'active' : '';
    
    return `
        <div class="category-content-wrapper ${isActive}" data-category-content="${category}">
            <div class="chart-section">
                <div class="chart-main">
                    <div class="chart-title">${config.title}</div>
                    <div class="chart-container">
                        <canvas id="chart-${category}" class="category-chart"></canvas>
                    </div>
                </div>
                
                <div class="data-toggles">
                    <div class="toggles-title">Toggle Indices</div>
                    <div class="toggle-group">
                        ${config.indices.map((index, i) => `
                            <label class="toggle-item">
                                <input type="checkbox" class="toggle-checkbox" data-category="${category}" data-index="${index.name}" ${i === 0 ? 'checked' : ''}>
                                <div class="toggle-legend" style="background: ${index.color};"></div>
                                <span>${index.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Setup category tab functionality
 */
function setupCategoryTabs() {
    const tabs = document.querySelectorAll('.category-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active content
            document.querySelectorAll('.category-content-wrapper').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelector(`[data-category-content="${category}"]`).classList.add('active');
            
            AppState.currentCategory = category;
        });
    });
}

async function loadFieldData(fieldId) {
    try {
        // Load the real timeseries data from preprocessed JSON
        const response = await fetch(`data/${fieldId}_timeseries.json`);
        if (!response.ok) {
            throw new Error(`Failed to load data for ${fieldId}`);
        }
        
        const jsonData = await response.json();
        const processedData = processTimeSeriesData(jsonData);
        
        AppState.categoryData = processedData;
        
        // Create charts for all categories
        createCategoryChart('et', processedData);
        createCategoryChart('crop', processedData);
        createCategoryChart('irrigation', processedData);
        createCategoryChart('additional', processedData);
        createCategoryChart('depletion', processedData);
        createCategoryChart('awc', processedData);
    } catch (error) {
        console.error('Error loading field data:', error);
        // Fallback to sample data if real data fails
        const sampleData = generateSampleData(fieldId);
        AppState.categoryData = sampleData;
        
        createCategoryChart('et', sampleData);
        createCategoryChart('crop', sampleData);
        createCategoryChart('irrigation', sampleData);
        createCategoryChart('additional', sampleData);
        createCategoryChart('depletion', sampleData);
        createCategoryChart('awc', sampleData);
    }
}

/**
 * Process the loaded JSON timeseries data into chart-ready format
 */
function processTimeSeriesData(jsonData) {
    const timeSeries = jsonData.timeSeries.map(entry => {
        const date = new Date(entry.date);
        const indices = entry.indices;
        
        // Extract mean values from each index
        const etcNdvi = indices.ETc_NDVI?.mean || 0;
        const ndvi = indices.NDVI?.mean || 0;
        const fc = indices.FC?.mean || 0;
        const gci = indices.GCI?.mean || 0;
        const msavi = indices.MSAVI?.mean || 0;
        const reci = indices.RECI?.mean || 0;
        
        return {
            date: date,
            // ET Category - using ETc_NDVI as primary ET
            andy: etcNdvi,
            ndvi: ndvi,
            fc: fc,
            ensemble: (etcNdvi + fc) / 2,
            fao56: etcNdvi * 1.05,
            // Additional indices
            gci: gci,
            msavi: msavi,
            savi: msavi, // Using MSAVI as SAVI equivalent
            reci: reci,
            // Derived values
            awc: Math.max(0, Math.min(1, 0.7 - fc * 0.3)),
            precipitation: 0
        };
    });
    
    // Get irrigation dates
    const irrigationDates = (jsonData.irrigationEvents || [])
        .filter(event => event.type === 'irrigation')
        .map(event => new Date(event.date));
    
    return {
        timeSeries: timeSeries,
        irrigationDates: irrigationDates
    };
}

function generateSampleData(fieldId) {
    const startDate = new Date('2025-03-01');
    const endDate = new Date('2026-01-10');
    const data = [];
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dayOfYear = getDayOfYear(currentDate);
        const growthFactor = Math.sin((dayOfYear - 60) / 365 * Math.PI * 2) * 0.5 + 0.5;
        
        data.push({
            date: new Date(currentDate),
            andy: Math.max(0, 0.05 + growthFactor * 0.28 + (Math.random() - 0.5) * 0.04),
            ndvi: Math.max(0, Math.min(1, 0.2 + growthFactor * 0.6 + (Math.random() - 0.5) * 0.1)),
            fc: Math.max(0, Math.min(1, growthFactor * 0.8 + (Math.random() - 0.5) * 0.1)),
            ensemble: Math.max(0, 0.05 + growthFactor * 0.32 + (Math.random() - 0.5) * 0.05),
            fao56: Math.max(0, 0.05 + growthFactor * 0.29 + (Math.random() - 0.5) * 0.04),
            gci: growthFactor * 2.5 + (Math.random() - 0.5) * 0.3,
            savi: Math.max(0, Math.min(1, growthFactor * 0.65 + (Math.random() - 0.5) * 0.1)),
            awc: Math.max(0, Math.min(1, 0.7 - (1 - growthFactor) * 0.4 + (Math.random() - 0.5) * 0.1)),
            precipitation: Math.random() > 0.9 ? Math.random() * 0.5 : 0
        });
        
        currentDate.setDate(currentDate.getDate() + (Math.random() > 0.5 ? 3 : 5));
    }
    
    const irrigationDates = getIrrigationDates(fieldId);
    return { timeSeries: data, irrigationDates };
}

function getIrrigationDates(fieldId) {
    const irrigationData = {
        'Field_10': ['2025-06-13', '2025-09-09'],
        'Field_11': ['2025-06-13', '2025-07-07'],
        'Field_12_and_13': ['2025-06-13', '2025-08-30']
    };
    
    return (irrigationData[fieldId] || []).map(date => new Date(date));
}

/**
 * Create Chart.js chart for a specific category
 */
function createCategoryChart(category, data) {
    const canvasId = `chart-${category}`;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (AppState.charts[category]) {
        AppState.charts[category].destroy();
    }
    
    const dates = data.timeSeries.map(d => d.date);
    let datasets = [];
    
    // Define datasets based on category
    switch(category) {
        case 'et':
            datasets = [
                {
                    label: 'Andy',
                    data: data.timeSeries.map(d => d.andy),
                    borderColor: '#2c5f2d',
                    backgroundColor: 'rgba(44, 95, 45, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: false
                },
                {
                    label: 'NDVI',
                    data: data.timeSeries.map(d => d.ndvi),
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FC',
                    data: data.timeSeries.map(d => d.fc),
                    borderColor: '#8BC34A',
                    backgroundColor: 'rgba(139, 195, 74, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'Ensemble',
                    data: data.timeSeries.map(d => d.ensemble),
                    borderColor: '#CDDC39',
                    backgroundColor: 'rgba(205, 220, 57, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FAO56',
                    data: data.timeSeries.map(d => d.fao56),
                    borderColor: '#FFC107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                }
            ];
            break;
            
        case 'crop':
            datasets = [
                {
                    label: 'Andy',
                    data: data.timeSeries.map(d => d.andy * 1.2),
                    borderColor: '#FF9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: false
                },
                {
                    label: 'NDVI',
                    data: data.timeSeries.map(d => d.ndvi * 1.1),
                    borderColor: '#FF5722',
                    backgroundColor: 'rgba(255, 87, 34, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FC',
                    data: data.timeSeries.map(d => d.fc * 1.15),
                    borderColor: '#F44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'Ensemble',
                    data: data.timeSeries.map(d => d.ensemble * 1.18),
                    borderColor: '#E91E63',
                    backgroundColor: 'rgba(233, 30, 99, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FAO56',
                    data: data.timeSeries.map(d => d.fao56 * 1.22),
                    borderColor: '#9C27B0',
                    backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                }
            ];
            break;
            
        case 'irrigation':
            datasets = [
                {
                    label: 'Precipitation',
                    data: data.timeSeries.map(d => d.precipitation),
                    borderColor: '#3F51B5',
                    backgroundColor: 'rgba(63, 81, 181, 0.5)',
                    borderWidth: 2,
                    type: 'bar',
                    hidden: false
                },
                {
                    label: 'Andy',
                    data: data.timeSeries.map(d => d.andy * 0.9),
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'NDVI',
                    data: data.timeSeries.map(d => d.ndvi * 0.85),
                    borderColor: '#03A9F4',
                    backgroundColor: 'rgba(3, 169, 244, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FC',
                    data: data.timeSeries.map(d => d.fc * 0.88),
                    borderColor: '#00BCD4',
                    backgroundColor: 'rgba(0, 188, 212, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'Ensemble',
                    data: data.timeSeries.map(d => d.ensemble * 0.92),
                    borderColor: '#009688',
                    backgroundColor: 'rgba(0, 150, 136, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FAO56',
                    data: data.timeSeries.map(d => d.fao56 * 0.87),
                    borderColor: '#4DB6AC',
                    backgroundColor: 'rgba(77, 182, 172, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                }
            ];
            break;
            
        case 'additional':
            datasets = [
                {
                    label: 'NDVI',
                    data: data.timeSeries.map(d => d.ndvi),
                    borderColor: '#8BC34A',
                    backgroundColor: 'rgba(139, 195, 74, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: false
                },
                {
                    label: 'GCI',
                    data: data.timeSeries.map(d => d.gci),
                    borderColor: '#CDDC39',
                    backgroundColor: 'rgba(205, 220, 57, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                }
            ];
            break;
            
        case 'depletion':
            datasets = [
                {
                    label: 'Andy',
                    data: data.timeSeries.map(d => 1 - d.andy),
                    borderColor: '#FFC107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: false
                },
                {
                    label: 'NDVI',
                    data: data.timeSeries.map(d => 1 - d.ndvi),
                    borderColor: '#FF9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FC',
                    data: data.timeSeries.map(d => 1 - d.fc),
                    borderColor: '#FF5722',
                    backgroundColor: 'rgba(255, 87, 34, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'Ensemble',
                    data: data.timeSeries.map(d => 1 - d.ensemble),
                    borderColor: '#F44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FAO56',
                    data: data.timeSeries.map(d => 1 - d.fao56),
                    borderColor: '#E91E63',
                    backgroundColor: 'rgba(233, 30, 99, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'SAVI',
                    data: data.timeSeries.map(d => d.savi),
                    borderColor: '#9C27B0',
                    backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                }
            ];
            break;
            
        case 'awc':
            datasets = [
                {
                    label: 'Andy',
                    data: data.timeSeries.map(d => d.awc * 0.95),
                    borderColor: '#673AB7',
                    backgroundColor: 'rgba(103, 58, 183, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: false
                },
                {
                    label: 'NDVI',
                    data: data.timeSeries.map(d => d.awc * 0.92),
                    borderColor: '#3F51B5',
                    backgroundColor: 'rgba(63, 81, 181, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FC',
                    data: data.timeSeries.map(d => d.awc * 0.97),
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'AWC',
                    data: data.timeSeries.map(d => d.awc),
                    borderColor: '#03A9F4',
                    backgroundColor: 'rgba(3, 169, 244, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'SAVI',
                    data: data.timeSeries.map(d => d.awc * 0.93),
                    borderColor: '#00BCD4',
                    backgroundColor: 'rgba(0, 188, 212, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                },
                {
                    label: 'FAO56',
                    data: data.timeSeries.map(d => d.awc * 0.96),
                    borderColor: '#009688',
                    backgroundColor: 'rgba(0, 150, 136, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    hidden: true
                }
            ];
            break;
    }
    
    AppState.charts[category] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(3)}`;
                        }
                    }
                },
                annotation: {
                    annotations: data.irrigationDates.map((date, index) => ({
                        type: 'line',
                        xMin: date,
                        xMax: date,
                        borderColor: 'rgba(33, 150, 243, 0.8)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            display: true,
                            content: 'Irrigation',
                            position: 'start'
                        }
                    }))
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            }
        }
    });
}

/**
 * Setup toggle button functionality
 */
function setupToggleButtons() {
    const checkboxes = document.querySelectorAll('.toggle-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const category = e.target.dataset.category;
            const index = e.target.dataset.index;
            updateChartVisibility(category, index, e.target.checked);
        });
    });
}

/**
 * Update chart dataset visibility
 */
function updateChartVisibility(category, index, visible) {
    const chart = AppState.charts[category];
    if (!chart) return;
    
    const dataset = chart.data.datasets.find(ds => ds.label === index);
    if (dataset) {
        dataset.hidden = !visible;
        chart.update();
    }
}

/**
 * Utility: Format crop name
 */
function formatCropName(crop) {
    const cropNames = {
        'barley': 'Barley',
        'wheat': 'Wheat',
        'corn': 'Corn',
        'soybean': 'Soybean'
    };
    return cropNames[crop?.toLowerCase()] || crop;
}

/**
 * Utility: Format soil texture
 */
function formatSoilTexture(texture) {
    const textureMap = {
        'silt_clay_loam': 'Silt Clay Loam',
        'clay_loam': 'Clay Loam',
        'sandy_loam': 'Sandy Loam',
        'loam': 'Loam'
    };
    return textureMap[texture] || texture;
}

/**
 * Utility: Format date
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Utility: Get day of year
 */
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}


/**
 * Setup image overlay controls
 */
function setupImageOverlayControls() {
    const showBtn = document.getElementById('showImageBtn');
    const clearBtn = document.getElementById('clearImageBtn');
    
    showBtn.addEventListener('click', showImageOverlay);
    clearBtn.addEventListener('click', clearImageOverlay);
}

/**
 * Load available dates for selected field
 */
async function loadFieldDates(fieldId) {
    try {
        const response = await fetch(`data/${fieldId}_dates.json`);
        if (!response.ok) throw new Error('Failed to load dates');
        
        const dates = await response.json();
        AppState.availableDates = dates.map(d => new Date(d));
        
        // Set initial calendar month to first available date
        if (AppState.availableDates.length > 0) {
            AppState.currentCalendarMonth = new Date(AppState.availableDates[0]);
        }
        
        // Generate calendar
        generateCalendar();
        
        // Show overlay controls
        document.getElementById('overlayControls').classList.add('active');
        
    } catch (error) {
        console.error('Error loading dates:', error);
        alert('Failed to load available dates for this field.');
    }
}

/**
 * Generate calendar UI
 */
function generateCalendar() {
    const container = document.getElementById('calendarContainer');
    const month = AppState.currentCalendarMonth.getMonth();
    const year = AppState.currentCalendarMonth.getFullYear();
    
    // Month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create calendar HTML
    let html = `
        <div class="calendar-header">
            <div class="calendar-month">${monthNames[month]} ${year}</div>
            <div class="calendar-nav">
                <button class="calendar-nav-btn" onclick="changeCalendarMonth(-1)">‹</button>
                <button class="calendar-nav-btn" onclick="changeCalendarMonth(1)">›</button>
            </div>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-header">Su</div>
            <div class="calendar-day-header">Mo</div>
            <div class="calendar-day-header">Tu</div>
            <div class="calendar-day-header">We</div>
            <div class="calendar-day-header">Th</div>
            <div class="calendar-day-header">Fr</div>
            <div class="calendar-day-header">Sa</div>
    `;
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day"></div>';
    }
    
    // Add days of month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check if this date has data
        const hasData = AppState.availableDates.some(d => 
            d.toISOString().split('T')[0] === dateStr
        );
        
        const isSelected = AppState.selectedDate && 
            AppState.selectedDate.toISOString().split('T')[0] === dateStr;
        
        const isToday = today.toISOString().split('T')[0] === dateStr;
        
        let classes = 'calendar-day';
        if (hasData) classes += ' available';
        if (isSelected) classes += ' selected';
        if (isToday) classes += ' today';
        
        const onclick = hasData ? `onclick="selectDate('${dateStr}')"` : '';
        
        html += `<div class="${classes}" ${onclick}>${day}</div>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Change calendar month
 */
window.changeCalendarMonth = function(delta) {
    const newMonth = new Date(AppState.currentCalendarMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    AppState.currentCalendarMonth = newMonth;
    generateCalendar();
}

/**
 * Select a date from calendar
 */
window.selectDate = function(dateStr) {
    AppState.selectedDate = new Date(dateStr);
    generateCalendar();
}

/**
 * Show image overlay on map
 */
async function showImageOverlay() {
    const fieldId = AppState.selectedField;
    if (!fieldId) {
        alert('Please select a field first');
        return;
    }
    
    if (!AppState.selectedDate) {
        alert('Please select a date from the calendar');
        return;
    }
    
    const indexSelect = document.getElementById('indexSelect');
    const selectedIndex = indexSelect.value;
    const selectedDateStr = AppState.selectedDate.toISOString().split('T')[0];
    
    // Clear existing overlay
    clearImageOverlay();
    
    // Make polygon completely transparent (no fill, only border) while showing image
    const layer = AppState.fieldLayers[fieldId];
    if (layer) {
        layer.setStyle({ 
            fillOpacity: 0,      // No fill
            opacity: 1,          // Full border opacity
            weight: 2,           // Thinner border
            color: '#2c5f2d'     // Green border
        });
    }
    
    try {
        // Construct path to TIF file
        const tifPath = `exports/${fieldId}/${selectedDateStr}/${selectedIndex}.tif`;
        
        console.log('Loading image from:', tifPath);
        
        // Load and display the GeoTIFF
        const response = await fetch(tifPath);
        if (!response.ok) {
            throw new Error(`Image not found: ${tifPath}\nThe file may not exist for this date/index combination.`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        const rasters = await image.readRasters();
        const data = rasters[0];
        
        // Get image bounds
        const bbox = image.getBoundingBox();
        console.log('Image bbox:', bbox);
        
        // Check if we need to get the coordinate system
        const geoKeys = image.getGeoKeys();
        console.log('GeoKeys:', geoKeys);
        
        // The bbox is in projected coordinates (UTM), we need to use the field bounds instead
        // Get the field layer bounds
        const fieldLayer = AppState.fieldLayers[fieldId];
        const fieldBounds = fieldLayer.getBounds();
        
        // Use field bounds for the overlay
        const bounds = [
            [fieldBounds.getSouth(), fieldBounds.getWest()],
            [fieldBounds.getNorth(), fieldBounds.getEast()]
        ];
        
        console.log('Using field bounds:', bounds);
        
        // Create canvas for visualization
        const canvas = document.createElement('canvas');
        const width = image.getWidth();
        const height = image.getHeight();
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        
        // Apply color scale based on index type
        const colorScale = getColorScale(selectedIndex);
        const stats = calculateImageStats(data);
        
        console.log('Image stats:', stats);
        console.log('Image dimensions:', width, 'x', height);
        
        // Handle negative values for NDVI
        let validPixels = 0;
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            
            // Skip no-data values
            if (isNaN(value) || !isFinite(value) || value === -9999 || value < -1 || value > 1) {
                const idx = i * 4;
                imageData.data[idx] = 0;
                imageData.data[idx + 1] = 0;
                imageData.data[idx + 2] = 0;
                imageData.data[idx + 3] = 0;
                continue;
            }
            
            validPixels++;
            
            // Normalize value between 0 and 1
            const normalized = Math.max(0, Math.min(1, (value - stats.min) / (stats.max - stats.min)));
            const color = colorScale(normalized);
            
            const idx = i * 4;
            imageData.data[idx] = color.r;
            imageData.data[idx + 1] = color.g;
            imageData.data[idx + 2] = color.b;
            imageData.data[idx + 3] = 220; // Opaque
        }
        
        console.log('Valid pixels:', validPixels, 'out of', data.length);
        
        ctx.putImageData(imageData, 0, 0);
        
        // Create data URL from canvas
        const dataUrl = canvas.toDataURL();
        console.log('Canvas data URL length:', dataUrl.length);
        
        // Add overlay to map
        AppState.imageOverlay = L.imageOverlay(dataUrl, bounds, {
            opacity: 0.8,
            interactive: false,
            className: 'satellite-overlay'
        }).addTo(AppState.map);
        
        // Force the overlay to the top
        if (AppState.imageOverlay._image) {
            AppState.imageOverlay._image.style.zIndex = '1000';
        }
        
        console.log('Image overlay added to map');
        
        // Initialize timeline player
        initializeTimelinePlayer();
        
        // Show info
        const overlayInfo = document.getElementById('overlayInfo');
        overlayInfo.style.display = 'block';
        overlayInfo.textContent = `Showing ${selectedIndex} for ${formatDate(selectedDateStr)} (${validPixels} pixels)`;
        
    } catch (error) {
        console.error('Error displaying image:', error);
        alert(`Failed to load image:\n\n${error.message}\n\nPossible reasons:\n- Image file doesn't exist for this date\n- Index not available for this date\n- File format issue`);
        
        // Restore polygon to normal style
        const layer = AppState.fieldLayers[fieldId];
        if (layer) {
            const config = FIELD_CONFIGS[fieldId];
            layer.setStyle({ 
                fillOpacity: 0.2,
                opacity: 0.8,
                weight: 3,
                color: config.color
            });
        }
    }
}

/**
 * Clear image overlay from map
 */
function clearImageOverlay() {
    if (AppState.imageOverlay) {
        AppState.map.removeLayer(AppState.imageOverlay);
        AppState.imageOverlay = null;
    }
    
    // Remove swipe control
    removeSwipeControl();
    
    // Hide timeline player
    hideTimelinePlayer();
    
    // Restore polygon to normal style
    const fieldId = AppState.selectedField;
    if (fieldId && AppState.fieldLayers[fieldId]) {
        const config = FIELD_CONFIGS[fieldId];
        AppState.fieldLayers[fieldId].setStyle({ 
            fillOpacity: 0.2,
            opacity: 0.8,
            weight: 3,
            color: config.color
        });
    }
    
    const overlayInfo = document.getElementById('overlayInfo');
    overlayInfo.style.display = 'none';
}

/**
 * Calculate statistics for image data
 */
function calculateImageStats(data) {
    const validData = Array.from(data).filter(v => 
        !isNaN(v) && isFinite(v) && v !== -9999
    );
    
    return {
        min: Math.min(...validData),
        max: Math.max(...validData),
        mean: validData.reduce((a, b) => a + b, 0) / validData.length
    };
}

/**
 * Get color scale for different indices
 */
function getColorScale(indexName) {
    // Color scales for different vegetation indices
    const scales = {
        'NDVI': (value) => {
            // Red to Yellow to Green scale
            if (value < 0.33) {
                return { r: 255, g: Math.floor(value * 3 * 255), b: 0 };
            } else if (value < 0.66) {
                return { r: Math.floor((1 - (value - 0.33) * 3) * 255), g: 255, b: 0 };
            } else {
                return { r: 0, g: 255, b: Math.floor((value - 0.66) * 3 * 255) };
            }
        },
        'ETc_NDVI': (value) => {
            // Blue to Cyan to Yellow to Red
            const r = Math.floor(value * 255);
            const g = Math.floor(Math.sin(value * Math.PI) * 255);
            const b = Math.floor((1 - value) * 255);
            return { r, g, b };
        },
        'FC': (value) => {
            // Brown to Green scale
            const r = Math.floor((1 - value) * 139 + value * 34);
            const g = Math.floor((1 - value) * 90 + value * 139);
            const b = Math.floor((1 - value) * 43 + value * 34);
            return { r, g, b };
        },
        'GCI': (value) => {
            // Purple to Green scale
            const r = Math.floor((1 - value) * 128);
            const g = Math.floor(value * 255);
            const b = Math.floor((1 - value) * 128);
            return { r, g, b };
        },
        'MSAVI': (value) => {
            // Similar to NDVI
            return scales.NDVI(value);
        },
        'RECI': (value) => {
            // Red to Green scale
            const r = Math.floor((1 - value) * 255);
            const g = Math.floor(value * 255);
            const b = 0;
            return { r, g, b };
        }
    };
    
    return scales[indexName] || scales.NDVI;
}


/**
 * Setup file upload functionality
 */
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            await handleFileUpload(file);
            // Reset input so same file can be uploaded again
            fileInput.value = '';
        } catch (error) {
            console.error('Error uploading file:', error);
            alert(`Failed to upload file:\n\n${error.message}`);
            fileInput.value = '';
        }
    });
}

/**
 * Handle file upload based on file type
 */
async function handleFileUpload(file) {
    const fileName = file.name.toLowerCase();
    let geojson = null;
    
    if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        // GeoJSON
        geojson = await readGeoJSON(file);
    } else if (fileName.endsWith('.kml')) {
        // KML
        geojson = await readKML(file);
    } else if (fileName.endsWith('.zip') || fileName.endsWith('.shp')) {
        // Shapefile (zipped)
        geojson = await readShapefile(file);
    } else if (fileName.endsWith('.gpx')) {
        // GPX
        geojson = await readGPX(file);
    } else if (fileName.endsWith('.gml')) {
        // GML
        alert('GML format is not fully supported yet. Please convert to GeoJSON.');
        return;
    } else {
        throw new Error('Unsupported file format. Please upload: GeoJSON, KML, Shapefile (zip), or GPX');
    }
    
    if (geojson) {
        displayUploadedLayer(geojson, file.name);
    }
}

/**
 * Read GeoJSON file
 */
async function readGeoJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const geojson = JSON.parse(e.target.result);
                resolve(geojson);
            } catch (error) {
                reject(new Error('Invalid GeoJSON file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Read KML file
 */
async function readKML(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const kmlText = e.target.result;
                const parser = new DOMParser();
                const kml = parser.parseFromString(kmlText, 'text/xml');
                const geojson = toGeoJSON.kml(kml);
                resolve(geojson);
            } catch (error) {
                reject(new Error('Invalid KML file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Read Shapefile (zipped)
 */
async function readShapefile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const geojson = await shp(arrayBuffer);
                resolve(geojson);
            } catch (error) {
                reject(new Error('Invalid Shapefile. Make sure it\'s a complete zipped shapefile.'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Read GPX file
 */
async function readGPX(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const gpxText = e.target.result;
                const parser = new DOMParser();
                const gpx = parser.parseFromString(gpxText, 'text/xml');
                const geojson = toGeoJSON.gpx(gpx);
                resolve(geojson);
            } catch (error) {
                reject(new Error('Invalid GPX file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Display uploaded layer on map
 */
function displayUploadedLayer(geojson, fileName) {
    // Random color for uploaded layer
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const layer = L.geoJSON(geojson, {
        style: {
            color: color,
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.2
        },
        onEachFeature: (feature, layer) => {
            // Add popup with feature properties
            let popupContent = `<div style="font-size: 12px;"><strong>${fileName}</strong><br>`;
            
            if (feature.properties) {
                const props = feature.properties;
                const keys = Object.keys(props).slice(0, 5); // Show first 5 properties
                keys.forEach(key => {
                    popupContent += `<br><strong>${key}:</strong> ${props[key]}`;
                });
                if (Object.keys(props).length > 5) {
                    popupContent += `<br><em>... and ${Object.keys(props).length - 5} more</em>`;
                }
            }
            
            popupContent += '</div>';
            
            // Bind popup with options to display above the feature
            layer.bindPopup(popupContent, {
                autoPan: true,
                autoPanPadding: [50, 50],
                offset: [0, -10],
                closeButton: true,
                autoClose: true,
                className: 'custom-popup'
            });
        }
    }).addTo(AppState.map);
    
    // Store reference
    AppState.uploadedLayers.push({
        layer: layer,
        name: fileName,
        color: color
    });
    
    // Zoom to uploaded layer
    const bounds = layer.getBounds();
    AppState.map.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 1.5
    });
    
    console.log(`Uploaded layer: ${fileName}`);
}

/**
 * Initialize swipe control for comparing base map with overlay
 */
function initializeSwipeControl() {
    // Remove existing swipe control if any
    removeSwipeControl();
    
    const mapContainer = document.getElementById('map');
    
    // Create swipe slider
    const swipeSlider = document.createElement('div');
    swipeSlider.id = 'swipeSlider';
    swipeSlider.className = 'swipe-slider';
    
    // Create slider handle
    const sliderHandle = document.createElement('div');
    sliderHandle.className = 'swipe-handle';
    sliderHandle.innerHTML = '<div class="swipe-handle-line"></div><div class="swipe-handle-grip">⬌</div><div class="swipe-handle-line"></div>';
    
    swipeSlider.appendChild(sliderHandle);
    mapContainer.appendChild(swipeSlider);
    
    // Store reference
    AppState.swipeSlider = swipeSlider;
    
    // Set initial position (middle)
    const mapWidth = mapContainer.offsetWidth;
    const initialX = mapWidth / 2;
    swipeSlider.style.left = initialX + 'px';
    
    // Wait for overlay image to be ready
    setTimeout(() => {
        updateSwipeClip(initialX);
    }, 100);
    
    // Add drag functionality
    let isDragging = false;
    
    const startDrag = (e) => {
        isDragging = true;
        // Disable map dragging
        AppState.map.dragging.disable();
        e.preventDefault();
        e.stopPropagation();
    };
    
    const stopDrag = () => {
        if (isDragging) {
            isDragging = false;
            // Re-enable map dragging
            AppState.map.dragging.enable();
        }
    };
    
    const onDrag = (clientX) => {
        if (!isDragging) return;
        
        const mapRect = mapContainer.getBoundingClientRect();
        let x = clientX - mapRect.left;
        
        // Constrain to map bounds
        x = Math.max(0, Math.min(x, mapRect.width));
        
        swipeSlider.style.left = x + 'px';
        updateSwipeClip(x);
    };
    
    // Mouse events
    sliderHandle.addEventListener('mousedown', startDrag);
    
    document.addEventListener('mousemove', (e) => {
        onDrag(e.clientX);
    });
    
    document.addEventListener('mouseup', stopDrag);
    
    // Touch events
    sliderHandle.addEventListener('touchstart', (e) => {
        startDrag(e);
    });
    
    document.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length > 0) {
            onDrag(e.touches[0].clientX);
        }
    });
    
    document.addEventListener('touchend', stopDrag);
}

/**
 * Update the clip path for the overlay based on swipe position
 */
function updateSwipeClip(x) {
    if (!AppState.imageOverlay || !AppState.imageOverlay._image) return;
    
    const img = AppState.imageOverlay._image;
    const mapContainer = document.getElementById('map');
    const mapRect = mapContainer.getBoundingClientRect();
    
    // Get the image position relative to the map
    const imgRect = img.getBoundingClientRect();
    const imgLeft = imgRect.left - mapRect.left;
    
    // Calculate the clip position relative to the image
    const clipX = x - imgLeft;
    
    // Apply clip-path for better performance and accuracy
    img.style.clipPath = `inset(0 ${img.width - clipX}px 0 0)`;
    img.style.clip = 'auto'; // Remove old clip property
}

/**
 * Remove swipe control
 */
function removeSwipeControl() {
    if (AppState.swipeSlider) {
        AppState.swipeSlider.remove();
        AppState.swipeSlider = null;
    }
    
    // Reset clip on overlay
    if (AppState.imageOverlay && AppState.imageOverlay._image) {
        AppState.imageOverlay._image.style.clipPath = 'none';
        AppState.imageOverlay._image.style.clip = 'auto';
    }
    
    // Re-enable map dragging if it was disabled
    if (AppState.map && AppState.map.dragging) {
        AppState.map.dragging.enable();
    }
}

/**
 * Toggle swipe control on/off
 */
function toggleSwipeControl() {
    const swipeBtn = document.getElementById('swipeToggle');
    
    if (AppState.swipeSlider) {
        // Swipe is active, remove it
        removeSwipeControl();
        swipeBtn.classList.remove('active');
    } else {
        // Swipe is not active, initialize it
        if (AppState.imageOverlay) {
            initializeSwipeControl();
            swipeBtn.classList.add('active');
        }
    }
}

/**
 * Timeline Player State
 */
const TimelineState = {
    isPlaying: false,
    currentIndex: 0,
    dates: [],
    playInterval: null,
    speed: 1000,
    loop: false,
    preloadedImages: {}
};

/**
 * Initialize Timeline Player
 */
function initializeTimelinePlayer() {
    // console.log('[TIMELINE] Initializing timeline player');
    
    const fieldId = AppState.selectedField;
    if (!fieldId || !AppState.availableDates || AppState.availableDates.length === 0) {
        // console.log('[TIMELINE] Cannot initialize - missing field or dates');
        return;
    }

    // Get available dates
    TimelineState.dates = AppState.availableDates.sort((a, b) => new Date(a) - new Date(b));
    TimelineState.currentIndex = 0;
    
    // console.log(`[TIMELINE] Loaded ${TimelineState.dates.length} dates for ${fieldId}`);

    // Show timeline player
    const player = document.getElementById('timelinePlayer');
    player.classList.remove('hidden');

    // Setup slider
    const slider = document.getElementById('timelineSlider');
    slider.max = TimelineState.dates.length - 1;
    slider.value = 0;

    // Setup labels
    setupTimelineLabels();

    // Setup event listeners
    setupTimelineControls();

    // Update display
    updateTimelineDisplay();

    // Preload first few images
    preloadTimelineImages();
    
    // console.log('[TIMELINE] Timeline player initialized successfully');
}

/**
 * Setup timeline labels
 */
function setupTimelineLabels() {
    const labelsContainer = document.getElementById('timelineLabels');
    labelsContainer.innerHTML = '';

    const dates = TimelineState.dates;
    const maxLabels = 6;
    const step = Math.ceil(dates.length / maxLabels);

    for (let i = 0; i < dates.length; i += step) {
        const label = document.createElement('div');
        label.className = 'timeline-label';
        const date = new Date(dates[i]);
        label.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labelsContainer.appendChild(label);
    }
}

/**
 * Setup timeline controls
 */
function setupTimelineControls() {
    // Play/Pause
    document.getElementById('timelinePlay').addEventListener('click', togglePlayPause);

    // Navigation
    document.getElementById('timelineFirst').addEventListener('click', () => goToFrame(0));
    document.getElementById('timelinePrev').addEventListener('click', () => goToFrame(TimelineState.currentIndex - 1));
    document.getElementById('timelineNext').addEventListener('click', () => goToFrame(TimelineState.currentIndex + 1));
    document.getElementById('timelineLast').addEventListener('click', () => goToFrame(TimelineState.dates.length - 1));

    // Speed
    document.getElementById('timelineSpeed').addEventListener('change', (e) => {
        TimelineState.speed = parseInt(e.target.value);
        if (TimelineState.isPlaying) {
            stopPlayback();
            startPlayback();
        }
    });

    // Loop
    document.getElementById('timelineLoop').addEventListener('click', () => {
        TimelineState.loop = !TimelineState.loop;
        document.getElementById('timelineLoop').classList.toggle('active', TimelineState.loop);
    });
    
    // Swipe Toggle
    document.getElementById('swipeToggle').addEventListener('click', toggleSwipeControl);

    // Slider
    document.getElementById('timelineSlider').addEventListener('input', (e) => {
        goToFrame(parseInt(e.target.value));
    });
    
    // Prevent map panning when interacting with timeline slider
    const timelineSlider = document.getElementById('timelineSlider');
    const timelinePlayer = document.getElementById('timelinePlayer');
    
    // Disable map dragging when mouse is over timeline
    timelinePlayer.addEventListener('mouseenter', () => {
        if (AppState.map && AppState.map.dragging) {
            AppState.map.dragging.disable();
        }
    });
    
    // Re-enable map dragging when mouse leaves timeline
    timelinePlayer.addEventListener('mouseleave', () => {
        if (AppState.map && AppState.map.dragging && !AppState.swipeSlider) {
            AppState.map.dragging.enable();
        }
    });
    
    // Also prevent map events on slider specifically
    timelineSlider.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
    
    timelineSlider.addEventListener('touchstart', (e) => {
        e.stopPropagation();
    });
}

/**
 * Toggle play/pause
 */
function togglePlayPause() {
    if (TimelineState.isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

/**
 * Start playback
 */
function startPlayback() {
    TimelineState.isPlaying = true;
    
    // Update button
    const playBtn = document.getElementById('timelinePlay');
    playBtn.querySelector('.play-icon').style.display = 'none';
    playBtn.querySelector('.pause-icon').style.display = 'block';

    // Start interval
    TimelineState.playInterval = setInterval(() => {
        let nextIndex = TimelineState.currentIndex + 1;
        
        if (nextIndex >= TimelineState.dates.length) {
            if (TimelineState.loop) {
                nextIndex = 0;
            } else {
                stopPlayback();
                return;
            }
        }
        
        goToFrame(nextIndex);
    }, TimelineState.speed);
}

/**
 * Stop playback
 */
function stopPlayback() {
    TimelineState.isPlaying = false;
    
    // Update button
    const playBtn = document.getElementById('timelinePlay');
    playBtn.querySelector('.play-icon').style.display = 'block';
    playBtn.querySelector('.pause-icon').style.display = 'none';

    // Clear interval
    if (TimelineState.playInterval) {
        clearInterval(TimelineState.playInterval);
        TimelineState.playInterval = null;
    }
}

/**
 * Go to specific frame
 */
async function goToFrame(index) {
    if (index < 0 || index >= TimelineState.dates.length) return;

    // console.log(`[TIMELINE] Going to frame ${index + 1}/${TimelineState.dates.length}`);
    
    TimelineState.currentIndex = index;
    
    // Update slider
    document.getElementById('timelineSlider').value = index;
    
    // Update display
    updateTimelineDisplay();
    
    // Load and show image
    await showTimelineImage(TimelineState.dates[index]);
    
    // Update charts with current date marker
    // console.log(`[TIMELINE] Triggering chart update for date: ${TimelineState.dates[index]}`);
    updateChartsWithTimelineDate(TimelineState.dates[index]);
    
    // Preload next images
    preloadTimelineImages();
}

/**
 * Update timeline display
 */
function updateTimelineDisplay() {
    const date = new Date(TimelineState.dates[TimelineState.currentIndex]);
    const dateStr = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    document.getElementById('timelineCurrentDate').textContent = dateStr;
}

/**
 * Show image for specific date
 */
async function showTimelineImage(dateStr) {
    const fieldId = AppState.selectedField;
    const indexSelect = document.getElementById('indexSelect');
    const selectedIndex = indexSelect.value;

    // Convert date to YYYY-MM-DD format
    const date = new Date(dateStr);
    const formattedDate = date.toISOString().split('T')[0];

    try {
        // Check if image is preloaded
        const cacheKey = `${fieldId}_${formattedDate}_${selectedIndex}`;
        
        if (TimelineState.preloadedImages[cacheKey]) {
            // Use cached image
            updateImageOverlay(TimelineState.preloadedImages[cacheKey]);
        } else {
            // Load image
            const dataUrl = await loadTimelineImage(fieldId, formattedDate, selectedIndex);
            TimelineState.preloadedImages[cacheKey] = dataUrl;
            updateImageOverlay(dataUrl);
        }
    } catch (error) {
        console.error('Error loading timeline image:', error);
    }
}

/**
 * Load timeline image
 */
async function loadTimelineImage(fieldId, dateStr, selectedIndex) {
    const tifPath = `exports/${fieldId}/${dateStr}/${selectedIndex}.tif`;
    
    const response = await fetch(tifPath);
    if (!response.ok) {
        throw new Error(`Image not found: ${tifPath}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const data = rasters[0];
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const width = image.getWidth();
    const height = image.getHeight();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    
    // Apply color scale
    const colorScale = getColorScale(selectedIndex);
    const stats = calculateImageStats(data);
    
    for (let i = 0; i < data.length; i++) {
        const value = data[i];
        
        if (isNaN(value) || !isFinite(value) || value === -9999 || value < -1 || value > 1) {
            const idx = i * 4;
            imageData.data[idx] = 0;
            imageData.data[idx + 1] = 0;
            imageData.data[idx + 2] = 0;
            imageData.data[idx + 3] = 0;
            continue;
        }
        
        const normalized = Math.max(0, Math.min(1, (value - stats.min) / (stats.max - stats.min)));
        const color = colorScale(normalized);
        
        const idx = i * 4;
        imageData.data[idx] = color.r;
        imageData.data[idx + 1] = color.g;
        imageData.data[idx + 2] = color.b;
        imageData.data[idx + 3] = 220;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

/**
 * Update image overlay with new data
 */
function updateImageOverlay(dataUrl) {
    if (!AppState.imageOverlay) return;
    
    const fieldId = AppState.selectedField;
    const fieldLayer = AppState.fieldLayers[fieldId];
    const fieldBounds = fieldLayer.getBounds();
    
    const bounds = [
        [fieldBounds.getSouth(), fieldBounds.getWest()],
        [fieldBounds.getNorth(), fieldBounds.getEast()]
    ];
    
    // Remove old overlay
    if (AppState.imageOverlay) {
        AppState.map.removeLayer(AppState.imageOverlay);
    }
    
    // Add new overlay
    AppState.imageOverlay = L.imageOverlay(dataUrl, bounds, {
        opacity: 0.8,
        interactive: false,
        className: 'satellite-overlay'
    }).addTo(AppState.map);
    
    if (AppState.imageOverlay._image) {
        AppState.imageOverlay._image.style.zIndex = '1000';
    }
    
    // Reapply swipe if active
    if (AppState.swipeSlider) {
        setTimeout(() => {
            const sliderPos = parseInt(AppState.swipeSlider.style.left);
            updateSwipeClip(sliderPos);
        }, 50);
    }
}

/**
 * Preload timeline images
 */
function preloadTimelineImages() {
    const fieldId = AppState.selectedField;
    const indexSelect = document.getElementById('indexSelect');
    const selectedIndex = indexSelect.value;
    
    // Preload next 3 images
    for (let i = 1; i <= 3; i++) {
        const nextIndex = TimelineState.currentIndex + i;
        if (nextIndex < TimelineState.dates.length) {
            const dateStr = TimelineState.dates[nextIndex];
            // Convert to YYYY-MM-DD format
            const date = new Date(dateStr);
            const formattedDate = date.toISOString().split('T')[0];
            const cacheKey = `${fieldId}_${formattedDate}_${selectedIndex}`;
            
            if (!TimelineState.preloadedImages[cacheKey]) {
                loadTimelineImage(fieldId, formattedDate, selectedIndex)
                    .then(dataUrl => {
                        TimelineState.preloadedImages[cacheKey] = dataUrl;
                    })
                    .catch(err => console.log('Preload failed:', err));
            }
        }
    }
}

/**
 * Hide timeline player
 */
function hideTimelinePlayer() {
    const player = document.getElementById('timelinePlayer');
    player.classList.add('hidden');
    stopPlayback();
    TimelineState.preloadedImages = {};
    
    // Remove timeline markers from charts
    removeTimelineMarkersFromCharts();
}

/**
 * Update charts with timeline date marker
 */
function updateChartsWithTimelineDate(dateStr) {
    const currentDate = new Date(dateStr);
    // console.log('[TIMELINE-CHART] Updating charts with date:', currentDate.toISOString().split('T')[0]);
    
    let chartsUpdated = 0;
    
    // Update all category charts
    Object.keys(AppState.charts).forEach(category => {
        const chart = AppState.charts[category];
        if (!chart) {
            // console.log(`[TIMELINE-CHART] Chart not found for category: ${category}`);
            return;
        }
        
        // Filter data to show only up to current date
        const fullData = AppState.categoryData.timeSeries;
        const filteredData = fullData.filter(d => new Date(d.date) <= currentDate);
        
        // console.log(`[TIMELINE-CHART] ${category}: Showing ${filteredData.length}/${fullData.length} data points`);
        
        // Update chart data
        chart.data.labels = filteredData.map(d => d.date);
        
        // Update each dataset based on category
        chart.data.datasets.forEach(dataset => {
            const label = dataset.label;
            
            switch(category) {
                case 'et':
                    if (label === 'Andy') dataset.data = filteredData.map(d => d.andy);
                    else if (label === 'NDVI') dataset.data = filteredData.map(d => d.ndvi);
                    else if (label === 'FC') dataset.data = filteredData.map(d => d.fc);
                    else if (label === 'Ensemble') dataset.data = filteredData.map(d => d.ensemble);
                    else if (label === 'FAO56') dataset.data = filteredData.map(d => d.fao56);
                    break;
                    
                case 'crop':
                    if (label === 'Andy') dataset.data = filteredData.map(d => d.andy * 1.2);
                    else if (label === 'NDVI') dataset.data = filteredData.map(d => d.ndvi * 1.1);
                    else if (label === 'FC') dataset.data = filteredData.map(d => d.fc * 1.15);
                    else if (label === 'Ensemble') dataset.data = filteredData.map(d => d.ensemble * 1.18);
                    else if (label === 'FAO56') dataset.data = filteredData.map(d => d.fao56 * 1.22);
                    break;
                    
                case 'irrigation':
                    if (label === 'Precipitation') dataset.data = filteredData.map(d => d.precipitation);
                    else if (label === 'Andy') dataset.data = filteredData.map(d => d.andy * 0.9);
                    else if (label === 'NDVI') dataset.data = filteredData.map(d => d.ndvi * 0.85);
                    else if (label === 'FC') dataset.data = filteredData.map(d => d.fc * 0.88);
                    else if (label === 'Ensemble') dataset.data = filteredData.map(d => d.ensemble * 0.92);
                    else if (label === 'FAO56') dataset.data = filteredData.map(d => d.fao56 * 0.87);
                    break;
                    
                case 'additional':
                    if (label === 'NDVI') dataset.data = filteredData.map(d => d.ndvi);
                    else if (label === 'GCI') dataset.data = filteredData.map(d => d.gci);
                    break;
                    
                case 'depletion':
                    if (label === 'Andy') dataset.data = filteredData.map(d => 1 - d.andy);
                    else if (label === 'NDVI') dataset.data = filteredData.map(d => 1 - d.ndvi);
                    else if (label === 'FC') dataset.data = filteredData.map(d => 1 - d.fc);
                    else if (label === 'Ensemble') dataset.data = filteredData.map(d => 1 - d.ensemble);
                    else if (label === 'FAO56') dataset.data = filteredData.map(d => 1 - d.fao56);
                    else if (label === 'SAVI') dataset.data = filteredData.map(d => d.savi);
                    break;
                    
                case 'awc':
                    if (label === 'Andy') dataset.data = filteredData.map(d => d.awc * 0.95);
                    else if (label === 'NDVI') dataset.data = filteredData.map(d => d.awc * 0.92);
                    else if (label === 'FC') dataset.data = filteredData.map(d => d.awc * 0.97);
                    else if (label === 'AWC') dataset.data = filteredData.map(d => d.awc);
                    else if (label === 'SAVI') dataset.data = filteredData.map(d => d.awc * 0.93);
                    else if (label === 'FAO56') dataset.data = filteredData.map(d => d.awc * 0.96);
                    break;
            }
        });
        
        // Update irrigation annotations to only show those before current date
        if (chart.options.plugins.annotation && chart.options.plugins.annotation.annotations) {
            const irrigationDates = AppState.categoryData.irrigationDates || [];
            chart.options.plugins.annotation.annotations = irrigationDates
                .filter(date => new Date(date) <= currentDate)
                .map(date => ({
                    type: 'line',
                    xMin: date,
                    xMax: date,
                    borderColor: 'rgba(33, 150, 243, 0.8)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    label: {
                        display: true,
                        content: 'Irrigation',
                        position: 'start'
                    }
                }));
        }
        
        // Update chart with no animation for smooth playback
        chart.update('none');
        chartsUpdated++;
        
        // console.log(`[TIMELINE-CHART] Updated ${category} chart data`);
    });
    
    // console.log(`[TIMELINE-CHART] Updated ${chartsUpdated} charts total`);
}

/**
 * Remove timeline markers from all charts and restore full data
 */
function removeTimelineMarkersFromCharts() {
    // console.log('[TIMELINE-CHART] Restoring full chart data');
    
    if (!AppState.categoryData) {
        // console.log('[TIMELINE-CHART] No category data available');
        return;
    }
    
    let chartsRestored = 0;
    const fullData = AppState.categoryData.timeSeries;
    
    Object.keys(AppState.charts).forEach(category => {
        const chart = AppState.charts[category];
        if (!chart) return;
        
        // Restore full data
        chart.data.labels = fullData.map(d => d.date);
        
        // Restore each dataset
        chart.data.datasets.forEach(dataset => {
            const label = dataset.label;
            
            switch(category) {
                case 'et':
                    if (label === 'Andy') dataset.data = fullData.map(d => d.andy);
                    else if (label === 'NDVI') dataset.data = fullData.map(d => d.ndvi);
                    else if (label === 'FC') dataset.data = fullData.map(d => d.fc);
                    else if (label === 'Ensemble') dataset.data = fullData.map(d => d.ensemble);
                    else if (label === 'FAO56') dataset.data = fullData.map(d => d.fao56);
                    break;
                    
                case 'crop':
                    if (label === 'Andy') dataset.data = fullData.map(d => d.andy * 1.2);
                    else if (label === 'NDVI') dataset.data = fullData.map(d => d.ndvi * 1.1);
                    else if (label === 'FC') dataset.data = fullData.map(d => d.fc * 1.15);
                    else if (label === 'Ensemble') dataset.data = fullData.map(d => d.ensemble * 1.18);
                    else if (label === 'FAO56') dataset.data = fullData.map(d => d.fao56 * 1.22);
                    break;
                    
                case 'irrigation':
                    if (label === 'Precipitation') dataset.data = fullData.map(d => d.precipitation);
                    else if (label === 'Andy') dataset.data = fullData.map(d => d.andy * 0.9);
                    else if (label === 'NDVI') dataset.data = fullData.map(d => d.ndvi * 0.85);
                    else if (label === 'FC') dataset.data = fullData.map(d => d.fc * 0.88);
                    else if (label === 'Ensemble') dataset.data = fullData.map(d => d.ensemble * 0.92);
                    else if (label === 'FAO56') dataset.data = fullData.map(d => d.fao56 * 0.87);
                    break;
                    
                case 'additional':
                    if (label === 'NDVI') dataset.data = fullData.map(d => d.ndvi);
                    else if (label === 'GCI') dataset.data = fullData.map(d => d.gci);
                    break;
                    
                case 'depletion':
                    if (label === 'Andy') dataset.data = fullData.map(d => 1 - d.andy);
                    else if (label === 'NDVI') dataset.data = fullData.map(d => 1 - d.ndvi);
                    else if (label === 'FC') dataset.data = fullData.map(d => 1 - d.fc);
                    else if (label === 'Ensemble') dataset.data = fullData.map(d => 1 - d.ensemble);
                    else if (label === 'FAO56') dataset.data = fullData.map(d => 1 - d.fao56);
                    else if (label === 'SAVI') dataset.data = fullData.map(d => d.savi);
                    break;
                    
                case 'awc':
                    if (label === 'Andy') dataset.data = fullData.map(d => d.awc * 0.95);
                    else if (label === 'NDVI') dataset.data = fullData.map(d => d.awc * 0.92);
                    else if (label === 'FC') dataset.data = fullData.map(d => d.awc * 0.97);
                    else if (label === 'AWC') dataset.data = fullData.map(d => d.awc);
                    else if (label === 'SAVI') dataset.data = fullData.map(d => d.awc * 0.93);
                    else if (label === 'FAO56') dataset.data = fullData.map(d => d.awc * 0.96);
                    break;
            }
        });
        
        // Restore all irrigation annotations
        if (chart.options.plugins.annotation && chart.options.plugins.annotation.annotations) {
            const irrigationDates = AppState.categoryData.irrigationDates || [];
            chart.options.plugins.annotation.annotations = irrigationDates.map(date => ({
                type: 'line',
                xMin: date,
                xMax: date,
                borderColor: 'rgba(33, 150, 243, 0.8)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'Irrigation',
                    position: 'start'
                }
            }));
        }
        
        chart.update('none');
        chartsRestored++;
        
        // console.log(`[TIMELINE-CHART] Restored ${category} chart to full data (${fullData.length} points)`);
    });
    
    // console.log(`[TIMELINE-CHART] Restored ${chartsRestored} charts`);
}


/**
 * ========================================
 * DATE COMPARISON SYSTEM
 * ========================================
 */

/**
 * Setup comparison button and modal
 */
function setupComparison() {
    const compareBtn = document.getElementById('compareBtn');
    const comparisonModal = document.getElementById('comparisonModal');
    const closeModalBtn = document.getElementById('closeComparisonModal');
    const cancelBtn = document.getElementById('cancelComparisonBtn');
    const startBtn = document.getElementById('startComparisonBtn');
    
    // Open modal
    compareBtn.addEventListener('click', openComparisonModal);
    
    // Close modal
    closeModalBtn.addEventListener('click', closeComparisonModal);
    cancelBtn.addEventListener('click', closeComparisonModal);
    
    // Start comparison
    startBtn.addEventListener('click', startComparison);
    
    // Close comparison view
    document.getElementById('closeComparisonView').addEventListener('click', closeComparisonView);
}

/**
 * Open comparison modal
 */
function openComparisonModal() {
    if (!AppState.selectedField || !AppState.availableDates || AppState.availableDates.length < 2) {
        alert('Please select a field with at least 2 available dates first.');
        return;
    }
    
    // Populate date selectors
    const date1Select = document.getElementById('compareDate1');
    const date2Select = document.getElementById('compareDate2');
    
    // Clear existing options
    date1Select.innerHTML = '<option value="">Select date...</option>';
    date2Select.innerHTML = '<option value="">Select date...</option>';
    
    // Add dates
    const sortedDates = [...AppState.availableDates].sort((a, b) => new Date(a) - new Date(b));
    sortedDates.forEach(date => {
        const dateStr = new Date(date).toISOString().split('T')[0];
        const displayDate = formatDate(dateStr);
        
        const option1 = document.createElement('option');
        option1.value = dateStr;
        option1.textContent = displayDate;
        date1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = dateStr;
        option2.textContent = displayDate;
        date2Select.appendChild(option2);
    });
    
    // Set default values (first and last date)
    if (sortedDates.length >= 2) {
        date1Select.value = new Date(sortedDates[0]).toISOString().split('T')[0];
        date2Select.value = new Date(sortedDates[sortedDates.length - 1]).toISOString().split('T')[0];
    }
    
    // Show modal
    document.getElementById('comparisonModal').classList.remove('hidden');
}

/**
 * Close comparison modal
 */
function closeComparisonModal() {
    document.getElementById('comparisonModal').classList.add('hidden');
}

/**
 * Start comparison
 */
async function startComparison() {
    const date1 = document.getElementById('compareDate1').value;
    const date2 = document.getElementById('compareDate2').value;
    const index = document.getElementById('compareIndex').value;
    
    if (!date1 || !date2) {
        alert('Please select both dates.');
        return;
    }
    
    if (date1 === date2) {
        alert('Please select different dates.');
        return;
    }
    
    // Store comparison data
    AppState.comparisonData.date1 = date1;
    AppState.comparisonData.date2 = date2;
    AppState.comparisonData.index = index;
    
    // Close modal
    closeComparisonModal();
    
    // Show comparison view
    await showComparisonView();
}

/**
 * Show comparison view
 */
async function showComparisonView() {
    const comparisonView = document.getElementById('comparisonView');
    comparisonView.classList.remove('hidden');
    
    // Update title
    const title = document.getElementById('comparisonViewTitle');
    title.textContent = `Comparing ${AppState.comparisonData.index} - ${formatDate(AppState.comparisonData.date1)} vs ${formatDate(AppState.comparisonData.date2)}`;
    
    // Update labels
    document.getElementById('comparisonLabel1').textContent = `${formatDate(AppState.comparisonData.date1)} - ${AppState.comparisonData.index}`;
    document.getElementById('comparisonLabel2').textContent = `${formatDate(AppState.comparisonData.date2)} - ${AppState.comparisonData.index}`;
    
    // Initialize maps
    setTimeout(async () => {
        await initializeComparisonMaps();
        await loadComparisonData();
    }, 100);
}

/**
 * Initialize comparison maps
 */
async function initializeComparisonMaps() {
    const fieldId = AppState.selectedField;
    const fieldLayer = AppState.fieldLayers[fieldId];
    const bounds = fieldLayer.getBounds();
    const center = bounds.getCenter();
    const zoom = AppState.map.getZoom();
    
    // Initialize map 1
    if (AppState.comparisonMaps.map1) {
        AppState.comparisonMaps.map1.remove();
    }
    AppState.comparisonMaps.map1 = L.map('comparisonMap1', {
        zoomControl: true,
        attributionControl: false
    }).setView([center.lat, center.lng], zoom);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
    }).addTo(AppState.comparisonMaps.map1);
    
    // Initialize map 2
    if (AppState.comparisonMaps.map2) {
        AppState.comparisonMaps.map2.remove();
    }
    AppState.comparisonMaps.map2 = L.map('comparisonMap2', {
        zoomControl: true,
        attributionControl: false
    }).setView([center.lat, center.lng], zoom);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
    }).addTo(AppState.comparisonMaps.map2);
    
    // Synchronize map movements
    AppState.comparisonMaps.map1.sync(AppState.comparisonMaps.map2);
    AppState.comparisonMaps.map2.sync(AppState.comparisonMaps.map1);
}

/**
 * Load comparison data and display
 */
async function loadComparisonData() {
    const fieldId = AppState.selectedField;
    const date1 = AppState.comparisonData.date1;
    const date2 = AppState.comparisonData.date2;
    const index = AppState.comparisonData.index;
    
    try {
        // Load both images
        const data1 = await loadComparisonImage(fieldId, date1, index);
        const data2 = await loadComparisonImage(fieldId, date2, index);
        
        AppState.comparisonData.data1 = data1;
        AppState.comparisonData.data2 = data2;
        
        // Display images
        displayComparisonImage(AppState.comparisonMaps.map1, data1.dataUrl, data1.bounds);
        displayComparisonImage(AppState.comparisonMaps.map2, data2.dataUrl, data2.bounds);
        
        // Calculate difference statistics
        const diffStats = calculateDifferenceStats(data1, data2);
        
        // Display enhanced statistics and insights
        displayEnhancedStats(data1, data2, diffStats, index);
        
    } catch (error) {
        console.error('Error loading comparison data:', error);
        alert('Failed to load comparison data. Please try again.');
        closeComparisonView();
    }
}

/**
 * Load comparison image
 */
async function loadComparisonImage(fieldId, dateStr, selectedIndex) {
    const tifPath = `exports/${fieldId}/${dateStr}/${selectedIndex}.tif`;
    
    const response = await fetch(tifPath);
    if (!response.ok) {
        throw new Error(`Image not found: ${tifPath}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const data = rasters[0];
    
    // Get bounds
    const fieldLayer = AppState.fieldLayers[fieldId];
    const fieldBounds = fieldLayer.getBounds();
    const bounds = [
        [fieldBounds.getSouth(), fieldBounds.getWest()],
        [fieldBounds.getNorth(), fieldBounds.getEast()]
    ];
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const width = image.getWidth();
    const height = image.getHeight();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    
    // Apply color scale
    const colorScale = getColorScale(selectedIndex);
    const stats = calculateImageStats(data);
    
    for (let i = 0; i < data.length; i++) {
        const value = data[i];
        
        if (isNaN(value) || !isFinite(value) || value === -9999 || value < -1 || value > 1) {
            const idx = i * 4;
            imageData.data[idx] = 0;
            imageData.data[idx + 1] = 0;
            imageData.data[idx + 2] = 0;
            imageData.data[idx + 3] = 0;
            continue;
        }
        
        const normalized = Math.max(0, Math.min(1, (value - stats.min) / (stats.max - stats.min)));
        const color = colorScale(normalized);
        
        const idx = i * 4;
        imageData.data[idx] = color.r;
        imageData.data[idx + 1] = color.g;
        imageData.data[idx + 2] = color.b;
        imageData.data[idx + 3] = 220;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return {
        dataUrl: canvas.toDataURL(),
        bounds: bounds,
        data: data,
        stats: stats,
        width: width,
        height: height
    };
}

/**
 * Display comparison image on map
 */
function displayComparisonImage(map, dataUrl, bounds) {
    L.imageOverlay(dataUrl, bounds, {
        opacity: 0.8,
        interactive: false
    }).addTo(map);
}

/**
 * Calculate difference statistics between two images
 */
function calculateDifferenceStats(data1, data2) {
    const diffData = new Float32Array(data1.data.length);
    let validCount = 0;
    let sumDiff = 0;
    let minDiff = Infinity;
    let maxDiff = -Infinity;
    let positiveCount = 0;
    let negativeCount = 0;
    let unchangedCount = 0;
    let sumPositive = 0;
    let sumNegative = 0;
    
    for (let i = 0; i < data1.data.length; i++) {
        const val1 = data1.data[i];
        const val2 = data2.data[i];
        
        if (isNaN(val1) || isNaN(val2) || !isFinite(val1) || !isFinite(val2) || 
            val1 === -9999 || val2 === -9999 || val1 < -1 || val1 > 1 || val2 < -1 || val2 > 1) {
            diffData[i] = NaN;
            continue;
        }
        
        const diff = val2 - val1;
        diffData[i] = diff;
        
        validCount++;
        sumDiff += diff;
        minDiff = Math.min(minDiff, diff);
        maxDiff = Math.max(maxDiff, diff);
        
        if (diff > 0.01) {
            positiveCount++;
            sumPositive += diff;
        } else if (diff < -0.01) {
            negativeCount++;
            sumNegative += diff;
        } else {
            unchangedCount++;
        }
    }
    
    const meanDiff = validCount > 0 ? sumDiff / validCount : 0;
    const meanPositive = positiveCount > 0 ? sumPositive / positiveCount : 0;
    const meanNegative = negativeCount > 0 ? sumNegative / negativeCount : 0;
    
    const percentImproved = validCount > 0 ? (positiveCount / validCount * 100) : 0;
    const percentDeclined = validCount > 0 ? (negativeCount / validCount * 100) : 0;
    const percentUnchanged = validCount > 0 ? (unchangedCount / validCount * 100) : 0;
    
    return {
        min: minDiff,
        max: maxDiff,
        mean: meanDiff,
        validCount: validCount,
        positiveCount: positiveCount,
        negativeCount: negativeCount,
        unchangedCount: unchangedCount,
        meanPositive: meanPositive,
        meanNegative: meanNegative,
        percentImproved: percentImproved,
        percentDeclined: percentDeclined,
        percentUnchanged: percentUnchanged
    };
}

/**
 * Display enhanced statistics and insights
 */
function displayEnhancedStats(data1, data2, diffStats, index) {
    const statsContainer = document.getElementById('comparisonStats');
    
    const percentChange = data1.stats.mean !== 0 
        ? ((data2.stats.mean - data1.stats.mean) / Math.abs(data1.stats.mean) * 100)
        : 0;
    
    const changeClass = percentChange > 5 ? 'positive' : percentChange < -5 ? 'negative' : 'neutral';
    const changeSymbol = percentChange > 0 ? '+' : '';
    
    // SVG Icons
    const trendUpIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>';
    const trendDownIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>';
    const trendFlatIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    const chartIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
    const mapIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>';
    const lightbulbIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>';
    const calendarIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
    
    const changeIcon = percentChange > 5 ? trendUpIcon : percentChange < -5 ? trendDownIcon : trendFlatIcon;
    
    // Determine overall health status
    let healthStatus = '';
    let healthClass = '';
    if (percentChange > 10) {
        healthStatus = 'Significant Improvement';
        healthClass = 'positive';
    } else if (percentChange > 5) {
        healthStatus = 'Moderate Improvement';
        healthClass = 'positive';
    } else if (percentChange > -5) {
        healthStatus = 'Stable Condition';
        healthClass = 'neutral';
    } else if (percentChange > -10) {
        healthStatus = 'Moderate Decline';
        healthClass = 'negative';
    } else {
        healthStatus = 'Significant Decline';
        healthClass = 'negative';
    }
    
    // Generate insights based on index type
    const insights = generateInsights(index, percentChange, diffStats, data1, data2);
    
    statsContainer.innerHTML = `
        <!-- Overall Status -->
        <div class="stat-section">
            <div class="stat-section-title">
                <span class="stat-section-icon">${changeIcon}</span>
                Overall Status
            </div>
            <div style="text-align: center; padding: 15px 0;">
                <div class="change-indicator ${healthClass}" style="font-size: 16px; padding: 8px 16px;">
                    ${healthStatus}
                </div>
                <div style="margin-top: 10px; font-size: 24px; font-weight: 700; color: ${changeClass === 'positive' ? '#4CAF50' : changeClass === 'negative' ? '#f44336' : '#FFC107'};">
                    ${changeSymbol}${percentChange.toFixed(2)}%
                </div>
                <div style="color: #aaa; font-size: 11px; margin-top: 5px;">Change in ${index}</div>
            </div>
        </div>
        
        <!-- Key Metrics -->
        <div class="stat-section">
            <div class="stat-section-title">
                <span class="stat-section-icon">${chartIcon}</span>
                Key Metrics
            </div>
            <div class="stat-row">
                <span class="stat-label">Date 1 Average:</span>
                <span class="stat-value">${data1.stats.mean.toFixed(4)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Date 2 Average:</span>
                <span class="stat-value">${data2.stats.mean.toFixed(4)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Absolute Change:</span>
                <span class="stat-value ${changeClass}">${changeSymbol}${(data2.stats.mean - data1.stats.mean).toFixed(4)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Date 1 Range:</span>
                <span class="stat-value">${data1.stats.min.toFixed(3)} - ${data1.stats.max.toFixed(3)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Date 2 Range:</span>
                <span class="stat-value">${data2.stats.min.toFixed(3)} - ${data2.stats.max.toFixed(3)}</span>
            </div>
        </div>
        
        <!-- Field Coverage Analysis -->
        <div class="stat-section">
            <div class="stat-section-title">
                <span class="stat-section-icon">${mapIcon}</span>
                Field Coverage
            </div>
            <div class="stat-row">
                <span class="stat-label">Improved Areas:</span>
                <span class="stat-value positive">${diffStats.percentImproved.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Declined Areas:</span>
                <span class="stat-value negative">${diffStats.percentDeclined.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Stable Areas:</span>
                <span class="stat-value neutral">${diffStats.percentUnchanged.toFixed(1)}%</span>
            </div>
            ${diffStats.positiveCount > 0 ? `
            <div class="stat-row">
                <span class="stat-label">Avg. Improvement:</span>
                <span class="stat-value positive">+${diffStats.meanPositive.toFixed(4)}</span>
            </div>
            ` : ''}
            ${diffStats.negativeCount > 0 ? `
            <div class="stat-row">
                <span class="stat-label">Avg. Decline:</span>
                <span class="stat-value negative">${diffStats.meanNegative.toFixed(4)}</span>
            </div>
            ` : ''}
        </div>
        
        <!-- Insights & Recommendations -->
        <div class="stat-section">
            <div class="stat-section-title">
                <span class="stat-section-icon">${lightbulbIcon}</span>
                Insights & Recommendations
            </div>
            ${insights}
        </div>
        
        <!-- Time Period -->
        <div class="stat-section">
            <div class="stat-section-title">
                <span class="stat-section-icon">${calendarIcon}</span>
                Time Period
            </div>
            <div class="stat-row">
                <span class="stat-label">Start Date:</span>
                <span class="stat-value">${formatDate(AppState.comparisonData.date1)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">End Date:</span>
                <span class="stat-value">${formatDate(AppState.comparisonData.date2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Days Elapsed:</span>
                <span class="stat-value">${Math.round((new Date(AppState.comparisonData.date2) - new Date(AppState.comparisonData.date1)) / (1000 * 60 * 60 * 24))} days</span>
            </div>
        </div>
    `;
}

/**
 * Generate insights based on index and changes
 */
function generateInsights(index, percentChange, diffStats, data1, data2) {
    let insights = '';
    
    // SVG Icons for insights
    const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    const alertIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    const infoIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    const dropletIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>';
    const seedIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
    const searchIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
    const starIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
    const targetIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>';
    
    // Index-specific insights
    if (index === 'NDVI') {
        if (percentChange > 10) {
            insights += `
                <div class="insight-box">
                    <div class="insight-text">
                        ${checkIcon} <strong>Excellent vegetation growth!</strong> NDVI increased by ${percentChange.toFixed(1)}%, indicating healthy crop development and good canopy coverage.
                    </div>
                </div>
            `;
        } else if (percentChange < -10) {
            insights += `
                <div class="insight-box alert">
                    <div class="insight-text">
                        ${alertIcon} <strong>Vegetation stress detected.</strong> NDVI decreased by ${Math.abs(percentChange).toFixed(1)}%. Consider checking irrigation, pest issues, or nutrient deficiency.
                    </div>
                </div>
            `;
        }
        
        if (diffStats.percentImproved > 70) {
            insights += `
                <div class="insight-box">
                    <div class="insight-text">
                        ${targetIcon} <strong>Widespread improvement:</strong> ${diffStats.percentImproved.toFixed(0)}% of the field shows increased vegetation health.
                    </div>
                </div>
            `;
        } else if (diffStats.percentDeclined > 50) {
            insights += `
                <div class="insight-box warning">
                    <div class="insight-text">
                        ${targetIcon} <strong>Attention needed:</strong> ${diffStats.percentDeclined.toFixed(0)}% of the field shows declining vegetation. Investigate potential causes.
                    </div>
                </div>
            `;
        }
    } else if (index === 'ETc_NDVI') {
        if (percentChange > 5) {
            insights += `
                <div class="insight-box">
                    <div class="insight-text">
                        ${dropletIcon} <strong>Increased water demand:</strong> Evapotranspiration rose by ${percentChange.toFixed(1)}%. Crops are actively growing and may need more irrigation.
                    </div>
                </div>
            `;
        } else if (percentChange < -5) {
            insights += `
                <div class="insight-box warning">
                    <div class="insight-text">
                        ${dropletIcon} <strong>Reduced water use:</strong> ET decreased by ${Math.abs(percentChange).toFixed(1)}%. This could indicate crop stress or reduced growth.
                    </div>
                </div>
            `;
        }
    } else if (index === 'FC') {
        if (percentChange > 10) {
            insights += `
                <div class="insight-box">
                    <div class="insight-text">
                        ${seedIcon} <strong>Canopy expansion:</strong> Fractional cover increased by ${percentChange.toFixed(1)}%, showing good crop establishment and ground coverage.
                    </div>
                </div>
            `;
        }
    }
    
    // General recommendations
    if (diffStats.percentDeclined > 30) {
        insights += `
            <div class="insight-box warning">
                <div class="insight-text">
                    ${searchIcon} <strong>Recommended actions:</strong>
                    <ul style="margin: 8px 0 0 20px; padding: 0;">
                        <li>Check irrigation system functionality</li>
                        <li>Scout for pest or disease issues</li>
                        <li>Review recent weather conditions</li>
                        <li>Consider soil moisture testing</li>
                    </ul>
                </div>
            </div>
        `;
    } else if (percentChange > 15) {
        insights += `
            <div class="insight-box">
                <div class="insight-text">
                    ${starIcon} <strong>Keep up the good work!</strong> Current management practices are showing positive results. Continue monitoring for optimal outcomes.
                </div>
            </div>
        `;
    }
    
    if (!insights) {
        insights = `
            <div class="insight-box">
                <div class="insight-text">
                    ${infoIcon} Field conditions remain relatively stable between these dates. Continue regular monitoring to track any emerging trends.
                </div>
            </div>
        `;
    }
    
    return insights;
}

/**
 * Calculate difference between two images (kept for potential future use)
 */
function calculateDifference(data1, data2) {
    const width = data1.width;
    const height = data1.height;
    
    // Create canvas for difference
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    
    // Calculate difference
    const diffData = new Float32Array(data1.data.length);
    let validCount = 0;
    let sumDiff = 0;
    let minDiff = Infinity;
    let maxDiff = -Infinity;
    
    for (let i = 0; i < data1.data.length; i++) {
        const val1 = data1.data[i];
        const val2 = data2.data[i];
        
        if (isNaN(val1) || isNaN(val2) || !isFinite(val1) || !isFinite(val2) || 
            val1 === -9999 || val2 === -9999 || val1 < -1 || val1 > 1 || val2 < -1 || val2 > 1) {
            diffData[i] = NaN;
            continue;
        }
        
        const diff = val2 - val1;
        diffData[i] = diff;
        
        validCount++;
        sumDiff += diff;
        minDiff = Math.min(minDiff, diff);
        maxDiff = Math.max(maxDiff, diff);
    }
    
    const meanDiff = validCount > 0 ? sumDiff / validCount : 0;
    
    // Color scale for difference: red (negative) to white (zero) to green (positive)
    for (let i = 0; i < diffData.length; i++) {
        const diff = diffData[i];
        const idx = i * 4;
        
        if (isNaN(diff)) {
            imageData.data[idx] = 0;
            imageData.data[idx + 1] = 0;
            imageData.data[idx + 2] = 0;
            imageData.data[idx + 3] = 0;
            continue;
        }
        
        // Normalize difference to -1 to 1 range
        const maxAbsDiff = Math.max(Math.abs(minDiff), Math.abs(maxDiff));
        const normalized = maxAbsDiff > 0 ? diff / maxAbsDiff : 0;
        
        if (normalized > 0) {
            // Positive change - green
            imageData.data[idx] = Math.floor(255 * (1 - normalized));
            imageData.data[idx + 1] = 255;
            imageData.data[idx + 2] = Math.floor(255 * (1 - normalized));
        } else {
            // Negative change - red
            imageData.data[idx] = 255;
            imageData.data[idx + 1] = Math.floor(255 * (1 + normalized));
            imageData.data[idx + 2] = Math.floor(255 * (1 + normalized));
        }
        imageData.data[idx + 3] = 220;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return {
        dataUrl: canvas.toDataURL(),
        bounds: data1.bounds,
        stats: {
            min: minDiff,
            max: maxDiff,
            mean: meanDiff,
            validCount: validCount
        }
    };
}

/**
 * Close comparison view
 */
function closeComparisonView() {
    document.getElementById('comparisonView').classList.add('hidden');
    
    // Cleanup maps
    if (AppState.comparisonMaps.map1) {
        AppState.comparisonMaps.map1.remove();
        AppState.comparisonMaps.map1 = null;
    }
    if (AppState.comparisonMaps.map2) {
        AppState.comparisonMaps.map2.remove();
        AppState.comparisonMaps.map2 = null;
    }
}

// Initialize comparison on page load
document.addEventListener('DOMContentLoaded', () => {
    setupComparison();
});
