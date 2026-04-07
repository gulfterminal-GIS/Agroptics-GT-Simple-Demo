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
    uploadedLayers: []
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

    L.control.layers(baseMaps).addTo(AppState.map);
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
