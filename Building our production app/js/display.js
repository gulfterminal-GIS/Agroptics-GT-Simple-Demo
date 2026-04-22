/**
 * Display functionality for GTAgropticsLeaflet
 * Handles loading and displaying GeoJSON files
 */

/**
 * Display sample fields from static GeoJSON
 */
GTAgropticsLeaflet.displaySampleFields = function() {
    console.log('📍 Loading sample fields...');
    this.loadGeoJSON('data/sample-fields.geojson');
};

/**
 * Load GeoJSON from URL
 */
GTAgropticsLeaflet.loadGeoJSON = function(url) {
    console.log('📥 Loading GeoJSON from:', url);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            this.displayGeoJSON(data);
            this.showToast('GeoJSON loaded successfully!', 'success');
        })
        .catch(error => {
            console.error('❌ Error loading GeoJSON:', error);
            this.showToast('Error loading GeoJSON file', 'error');
        });
};

/**
 * Display GeoJSON data on map
 */
GTAgropticsLeaflet.displayGeoJSON = function(geojsonData) {
    console.log('🗺️ Displaying GeoJSON data...');
    
    let featureCount = 0;
    
    // Create GeoJSON layer
    const geojsonLayer = L.geoJSON(geojsonData, {
        style: (feature) => {
            return {
                color: feature.properties.color || '#4CAF50',
                fillColor: feature.properties.fillColor || '#4CAF50',
                fillOpacity: feature.properties.fillOpacity || 0.3,
                weight: feature.properties.weight || 2
            };
        },
        pointToLayer: (feature, latlng) => {
            if (feature.geometry.radius) {
                return L.circle(latlng, {
                    radius: feature.geometry.radius,
                    color: feature.properties.color || '#FF9800',
                    fillColor: feature.properties.fillColor || '#FF9800',
                    fillOpacity: feature.properties.fillOpacity || 0.3
                });
            }
            return L.marker(latlng);
        },
        onEachFeature: (feature, layer) => {
            featureCount++;
            
            // Generate ID if not exists
            if (!feature.properties.id) {
                feature.properties.id = 'imported_' + this.featureIdCounter++;
            }
            
            // Store feature ID in layer
            layer.featureId = feature.properties.id;
            
            // Create feature data object
            const featureData = {
                id: feature.properties.id,
                type: this.getGeometryType(feature.geometry.type),
                createdAt: feature.properties.createdAt || new Date().toISOString(),
                updatedAt: feature.properties.updatedAt || new Date().toISOString(),
                geometry: feature.geometry,
                properties: feature.properties
            };
            
            // Store feature
            const existingIndex = this.features.findIndex(f => f.id === featureData.id);
            if (existingIndex !== -1) {
                this.features[existingIndex] = featureData;
            } else {
                this.features.push(featureData);
            }
            
            // Bind popup
            this.bindFeaturePopup(layer, featureData);
            
            // Add click handler
            layer.on('click', () => {
                this.showFeatureInfo(featureData);
            });
        }
    });
    
    // Add to drawn items so it can be edited
    geojsonLayer.eachLayer((layer) => {
        this.drawnItems.addLayer(layer);
    });
    
    // Fit map to bounds
    if (featureCount > 0) {
        this.map.fitBounds(this.drawnItems.getBounds(), { padding: [50, 50] });
    }
    
    console.log(`✅ Displayed ${featureCount} features from GeoJSON`);
};

/**
 * Convert GeoJSON geometry type to layer type
 */
GTAgropticsLeaflet.getGeometryType = function(geojsonType) {
    const typeMap = {
        'Point': 'circle',
        'LineString': 'polyline',
        'Polygon': 'polygon',
        'MultiPoint': 'circle',
        'MultiLineString': 'polyline',
        'MultiPolygon': 'polygon'
    };
    return typeMap[geojsonType] || 'polygon';
};

/**
 * Upload and display GIS file
 */
GTAgropticsLeaflet.uploadFile = function(file) {
    console.log('📤 Uploading file:', file.name);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            
            // Check file type
            if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
                const geojsonData = JSON.parse(content);
                this.displayGeoJSON(geojsonData);
                this.showToast(`File "${file.name}" loaded successfully!`, 'success');
            } else if (file.name.endsWith('.kml')) {
                // Convert KML to GeoJSON (basic implementation)
                this.parseKML(content);
            } else {
                this.showToast('Unsupported file format. Please use GeoJSON or KML.', 'error');
            }
        } catch (error) {
            console.error('❌ Error parsing file:', error);
            this.showToast('Error parsing file. Please check the file format.', 'error');
        }
    };
    
    reader.onerror = () => {
        console.error('❌ Error reading file');
        this.showToast('Error reading file', 'error');
    };
    
    reader.readAsText(file);
};

/**
 * Parse KML file (basic implementation)
 */
GTAgropticsLeaflet.parseKML = function(kmlString) {
    console.log('📄 Parsing KML...');
    
    try {
        // Use Leaflet's built-in KML parser if available
        // For production, consider using a library like togeojson
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlString, 'text/xml');
        
        // Basic KML parsing - extract Placemarks
        const placemarks = kmlDoc.getElementsByTagName('Placemark');
        
        if (placemarks.length === 0) {
            this.showToast('No features found in KML file', 'warning');
            return;
        }
        
        // Convert to GeoJSON (simplified)
        const geojson = {
            type: 'FeatureCollection',
            features: []
        };
        
        for (let i = 0; i < placemarks.length; i++) {
            const placemark = placemarks[i];
            const name = placemark.getElementsByTagName('name')[0]?.textContent || `Feature ${i + 1}`;
            const description = placemark.getElementsByTagName('description')[0]?.textContent || '';
            
            // Extract coordinates (simplified - only handles Polygon for now)
            const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent;
            if (coordinates) {
                const coords = coordinates.trim().split(/\s+/).map(coord => {
                    const [lng, lat] = coord.split(',').map(Number);
                    return [lng, lat];
                });
                
                geojson.features.push({
                    type: 'Feature',
                    properties: {
                        name: name,
                        description: description
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coords]
                    }
                });
            }
        }
        
        if (geojson.features.length > 0) {
            this.displayGeoJSON(geojson);
            this.showToast(`KML file loaded: ${geojson.features.length} features`, 'success');
        } else {
            this.showToast('No valid features found in KML', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Error parsing KML:', error);
        this.showToast('Error parsing KML file. Consider converting to GeoJSON.', 'error');
    }
};

/**
 * Fit map to all features
 */
GTAgropticsLeaflet.fitToFeatures = function() {
    if (this.drawnItems.getLayers().length > 0) {
        this.map.fitBounds(this.drawnItems.getBounds(), { padding: [50, 50] });
        console.log('🎯 Map fitted to features');
    } else {
        this.showToast('No features to fit', 'warning');
    }
};

/**
 * Toggle feature visibility
 */
GTAgropticsLeaflet.toggleFeatureVisibility = function(featureId, visible) {
    this.drawnItems.eachLayer((layer) => {
        if (layer.featureId === featureId) {
            if (visible) {
                layer.setStyle({ opacity: 1, fillOpacity: layer.options.fillOpacity || 0.3 });
            } else {
                layer.setStyle({ opacity: 0, fillOpacity: 0 });
            }
        }
    });
};
