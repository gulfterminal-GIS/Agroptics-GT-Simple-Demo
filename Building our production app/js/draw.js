/**
 * Drawing functionality for GTAgropticsLeaflet
 */

/**
 * Handle feature created event
 */
GTAgropticsLeaflet.onFeatureCreated = function(e) {
    const layer = e.layer;
    const type = e.layerType;
    
    console.log('✨ Feature created:', type);
    
    // Generate unique ID
    const featureId = 'feature_' + this.featureIdCounter++;
    
    // Get current timestamp
    const createdAt = new Date().toISOString();
    
    // Calculate geometry properties
    const geometryData = this.calculateGeometryProperties(layer, type);
    
    // Create feature data object
    const featureData = {
        id: featureId,
        type: type,
        createdAt: createdAt,
        updatedAt: createdAt,
        geometry: geometryData.geometry,
        properties: {
            ...geometryData.properties,
            color: layer.options.color || '#4CAF50',
            fillColor: layer.options.fillColor || layer.options.color,
            fillOpacity: layer.options.fillOpacity || 0.3,
            weight: layer.options.weight || 3
        }
    };
    
    // Store feature ID in layer
    layer.featureId = featureId;
    
    // Store feature data
    this.features.push(featureData);
    
    // Add layer to map
    this.drawnItems.addLayer(layer);
    
    // Bind popup with feature info
    this.bindFeaturePopup(layer, featureData);
    
    // Add click handler to show detailed info
    layer.on('click', () => {
        this.showFeatureInfo(featureData);
    });
    
    console.log('💾 Feature saved:', featureData);
    this.showToast(`${type} created successfully!`, 'success');
};

/**
 * Calculate geometry properties based on layer type
 */
GTAgropticsLeaflet.calculateGeometryProperties = function(layer, type) {
    const result = {
        geometry: null,
        properties: {}
    };
    
    switch(type) {
        case 'polyline':
            const lineCoords = layer.getLatLngs();
            result.geometry = {
                type: 'LineString',
                coordinates: this.latLngsToCoords(lineCoords)
            };
            result.properties.length_meters = this.calculateLength(lineCoords);
            result.properties.length_km = (result.properties.length_meters / 1000).toFixed(3);
            result.properties.points_count = lineCoords.length;
            break;
            
        case 'polygon':
            const polyCoords = layer.getLatLngs()[0]; // First ring
            result.geometry = {
                type: 'Polygon',
                coordinates: [this.latLngsToCoords(polyCoords, true)]
            };
            result.properties.area_sqm = L.GeometryUtil.geodesicArea(polyCoords);
            result.properties.area_hectares = (result.properties.area_sqm / 10000).toFixed(4);
            result.properties.area_acres = (result.properties.area_sqm / 4046.86).toFixed(4);
            result.properties.perimeter_meters = this.calculatePerimeter(polyCoords);
            result.properties.points_count = polyCoords.length;
            break;
            
        case 'circle':
            const center = layer.getLatLng();
            const radius = layer.getRadius();
            result.geometry = {
                type: 'Point',
                coordinates: [center.lng, center.lat],
                radius: radius
            };
            result.properties.center = [center.lat, center.lng];
            result.properties.radius_meters = radius.toFixed(2);
            result.properties.radius_km = (radius / 1000).toFixed(3);
            result.properties.area_sqm = Math.PI * radius * radius;
            result.properties.area_hectares = (result.properties.area_sqm / 10000).toFixed(4);
            result.properties.area_acres = (result.properties.area_sqm / 4046.86).toFixed(4);
            break;
            
        case 'rectangle':
            const bounds = layer.getBounds();
            const rectCoords = [
                bounds.getSouthWest(),
                bounds.getNorthWest(),
                bounds.getNorthEast(),
                bounds.getSouthEast(),
                bounds.getSouthWest()
            ];
            result.geometry = {
                type: 'Polygon',
                coordinates: [this.latLngsToCoords(rectCoords)]
            };
            result.properties.area_sqm = L.GeometryUtil.geodesicArea(rectCoords.slice(0, -1));
            result.properties.area_hectares = (result.properties.area_sqm / 10000).toFixed(4);
            result.properties.area_acres = (result.properties.area_sqm / 4046.86).toFixed(4);
            result.properties.bounds = {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest()
            };
            break;
    }
    
    return result;
};

/**
 * Convert Leaflet LatLngs to GeoJSON coordinates
 */
GTAgropticsLeaflet.latLngsToCoords = function(latLngs, close = false) {
    const coords = latLngs.map(ll => [ll.lng, ll.lat]);
    if (close && coords.length > 0) {
        coords.push(coords[0]); // Close the ring
    }
    return coords;
};

/**
 * Calculate length of a polyline
 */
GTAgropticsLeaflet.calculateLength = function(latLngs) {
    let length = 0;
    for (let i = 0; i < latLngs.length - 1; i++) {
        length += latLngs[i].distanceTo(latLngs[i + 1]);
    }
    return length.toFixed(2);
};

/**
 * Calculate perimeter of a polygon
 */
GTAgropticsLeaflet.calculatePerimeter = function(latLngs) {
    let perimeter = 0;
    for (let i = 0; i < latLngs.length; i++) {
        const next = (i + 1) % latLngs.length;
        perimeter += latLngs[i].distanceTo(latLngs[next]);
    }
    return perimeter.toFixed(2);
};

/**
 * Bind popup to feature
 */
GTAgropticsLeaflet.bindFeaturePopup = function(layer, featureData) {
    let popupContent = `<div class="popup-title">${featureData.type.toUpperCase()}</div>`;
    popupContent += `<div class="popup-info">`;
    popupContent += `<strong>ID:</strong> ${featureData.id}<br>`;
    popupContent += `<strong>Created:</strong> ${new Date(featureData.createdAt).toLocaleString()}<br>`;
    
    // Add specific properties
    if (featureData.properties.area_hectares) {
        popupContent += `<strong>Area:</strong> ${featureData.properties.area_hectares} ha<br>`;
    }
    if (featureData.properties.length_km) {
        popupContent += `<strong>Length:</strong> ${featureData.properties.length_km} km<br>`;
    }
    if (featureData.properties.radius_meters) {
        popupContent += `<strong>Radius:</strong> ${featureData.properties.radius_meters} m<br>`;
    }
    
    popupContent += `</div>`;
    
    layer.bindPopup(popupContent);
};

/**
 * Show detailed feature information in side panel
 */
GTAgropticsLeaflet.showFeatureInfo = function(featureData) {
    let content = '';
    
    // Basic info
    content += `<div class="info-item">`;
    content += `<div class="info-label">Feature ID</div>`;
    content += `<div class="info-value"><code>${featureData.id}</code></div>`;
    content += `</div>`;
    
    content += `<div class="info-item">`;
    content += `<div class="info-label">Type</div>`;
    content += `<div class="info-value">${featureData.type.toUpperCase()}</div>`;
    content += `</div>`;
    
    content += `<div class="info-item">`;
    content += `<div class="info-label">Created At</div>`;
    content += `<div class="info-value">${new Date(featureData.createdAt).toLocaleString()}</div>`;
    content += `</div>`;
    
    content += `<div class="info-item">`;
    content += `<div class="info-label">Updated At</div>`;
    content += `<div class="info-value">${new Date(featureData.updatedAt).toLocaleString()}</div>`;
    content += `</div>`;
    
    // Properties
    content += `<div class="info-item">`;
    content += `<div class="info-label">Properties</div>`;
    content += `<div class="info-value">`;
    for (const [key, value] of Object.entries(featureData.properties)) {
        if (typeof value !== 'object') {
            content += `<strong>${key}:</strong> ${value}<br>`;
        }
    }
    content += `</div></div>`;
    
    // Geometry
    content += `<div class="info-item">`;
    content += `<div class="info-label">Geometry Type</div>`;
    content += `<div class="info-value">${featureData.geometry.type}</div>`;
    content += `</div>`;
    
    // Coordinates
    content += `<div class="info-item">`;
    content += `<div class="info-label">Coordinates</div>`;
    content += `<div class="coordinates-list">`;
    const coords = JSON.stringify(featureData.geometry.coordinates, null, 2);
    content += `<pre>${coords}</pre>`;
    content += `</div></div>`;
    
    this.showInfoPanel(content);
};

/**
 * Enable drawing mode
 */
GTAgropticsLeaflet.enableDraw = function(type = 'polygon') {
    console.log('✏️ Enabling draw mode:', type);
    // Drawing is handled by Leaflet.draw controls
    this.showToast(`Click on the map to start drawing a ${type}`, 'success');
};

/**
 * Disable drawing mode
 */
GTAgropticsLeaflet.disableDraw = function() {
    console.log('🛑 Disabling draw mode');
    // Drawing is handled by Leaflet.draw controls
};
