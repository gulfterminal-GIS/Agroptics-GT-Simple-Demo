/**
 * Data management functionality for GTAgropticsLeaflet
 * Handles getting, setting, importing, and exporting data
 */

/**
 * Get all features with complete data
 * Returns everything needed for backend storage
 */
GTAgropticsLeaflet.getAllFeatures = function() {
    console.log('📊 Getting all features...');
    
    const data = {
        timestamp: new Date().toISOString(),
        mapPosition: this.getMapPosition(),
        totalFeatures: this.features.length,
        featuresByType: this.countFeaturesByType(),
        features: this.features.map(feature => ({
            ...feature,
            // Ensure all data is included
            fullGeometry: feature.geometry,
            allProperties: feature.properties,
            metadata: {
                id: feature.id,
                type: feature.type,
                createdAt: feature.createdAt,
                updatedAt: feature.updatedAt
            }
        }))
    };
    
    console.log('✅ Retrieved', data.totalFeatures, 'features');
    return data;
};

/**
 * Get features in GeoJSON format
 */
GTAgropticsLeaflet.getFeaturesAsGeoJSON = function() {
    console.log('🗺️ Converting features to GeoJSON...');
    
    const geojson = {
        type: 'FeatureCollection',
        features: this.features.map(feature => ({
            type: 'Feature',
            id: feature.id,
            geometry: feature.geometry,
            properties: {
                ...feature.properties,
                id: feature.id,
                featureType: feature.type,
                createdAt: feature.createdAt,
                updatedAt: feature.updatedAt
            }
        }))
    };
    
    console.log('✅ GeoJSON created with', geojson.features.length, 'features');
    return geojson;
};

/**
 * Set/Import features from backend
 * @param {Array} featuresData - Array of feature objects
 */
GTAgropticsLeaflet.setFeatures = function(featuresData) {
    console.log('📥 Setting features from backend...', featuresData.length, 'features');
    
    if (!Array.isArray(featuresData)) {
        console.error('❌ Invalid features data: expected array');
        return false;
    }
    
    // Clear existing features
    this.clearAll();
    
    // Convert to GeoJSON and display
    const geojson = {
        type: 'FeatureCollection',
        features: featuresData.map(feature => ({
            type: 'Feature',
            id: feature.id,
            geometry: feature.geometry || feature.fullGeometry,
            properties: feature.properties || feature.allProperties || {}
        }))
    };
    
    this.displayGeoJSON(geojson);
    
    console.log('✅ Features set successfully');
    this.showToast(`${featuresData.length} features loaded from backend`, 'success');
    return true;
};

/**
 * Export all data as JSON file
 */
GTAgropticsLeaflet.exportAllData = function() {
    console.log('💾 Exporting all data...');
    
    const data = this.getAllFeatures();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `gt-agroptics-data-${timestamp}.json`;
    
    this.downloadFile(blob, filename);
    
    this.showToast(`Data exported: ${filename}`, 'success');
    console.log('✅ Data exported:', filename);
};

/**
 * Export features as GeoJSON file
 */
GTAgropticsLeaflet.exportGeoJSON = function() {
    console.log('💾 Exporting GeoJSON...');
    
    const geojson = this.getFeaturesAsGeoJSON();
    const jsonString = JSON.stringify(geojson, null, 2);
    const blob = new Blob([jsonString], { type: 'application/geo+json' });
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `gt-agroptics-features-${timestamp}.geojson`;
    
    this.downloadFile(blob, filename);
    
    this.showToast(`GeoJSON exported: ${filename}`, 'success');
    console.log('✅ GeoJSON exported:', filename);
};

/**
 * Download file helper
 */
GTAgropticsLeaflet.downloadFile = function(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Get feature data by ID
 * Returns complete feature data for backend
 */
GTAgropticsLeaflet.getFeatureData = function(featureId) {
    console.log('📋 Getting feature data:', featureId);
    
    const feature = this.getFeatureById(featureId);
    if (feature) {
        return {
            ...feature,
            fullData: {
                id: feature.id,
                type: feature.type,
                geometry: feature.geometry,
                properties: feature.properties,
                createdAt: feature.createdAt,
                updatedAt: feature.updatedAt,
                coordinates: feature.geometry.coordinates,
                bounds: this.getFeatureBounds(featureId)
            }
        };
    }
    
    console.warn('⚠️ Feature not found:', featureId);
    return null;
};

/**
 * Get feature bounds
 */
GTAgropticsLeaflet.getFeatureBounds = function(featureId) {
    let bounds = null;
    
    this.drawnItems.eachLayer((layer) => {
        if (layer.featureId === featureId) {
            if (layer.getBounds) {
                const b = layer.getBounds();
                bounds = {
                    north: b.getNorth(),
                    south: b.getSouth(),
                    east: b.getEast(),
                    west: b.getWest()
                };
            } else if (layer.getLatLng) {
                const ll = layer.getLatLng();
                bounds = {
                    center: [ll.lat, ll.lng]
                };
            }
        }
    });
    
    return bounds;
};

/**
 * Get statistics about all features
 */
GTAgropticsLeaflet.getStatistics = function() {
    console.log('📊 Calculating statistics...');
    
    const stats = {
        totalFeatures: this.features.length,
        byType: this.countFeaturesByType(),
        totalArea: 0,
        totalLength: 0,
        averageArea: 0,
        averageLength: 0,
        oldestFeature: null,
        newestFeature: null
    };
    
    let areaCount = 0;
    let lengthCount = 0;
    
    this.features.forEach(feature => {
        // Calculate totals
        if (feature.properties.area_sqm) {
            stats.totalArea += parseFloat(feature.properties.area_sqm);
            areaCount++;
        }
        if (feature.properties.length_meters) {
            stats.totalLength += parseFloat(feature.properties.length_meters);
            lengthCount++;
        }
        
        // Find oldest and newest
        if (!stats.oldestFeature || feature.createdAt < stats.oldestFeature.createdAt) {
            stats.oldestFeature = feature;
        }
        if (!stats.newestFeature || feature.createdAt > stats.newestFeature.createdAt) {
            stats.newestFeature = feature;
        }
    });
    
    // Calculate averages
    if (areaCount > 0) {
        stats.averageArea = stats.totalArea / areaCount;
        stats.totalAreaHectares = (stats.totalArea / 10000).toFixed(4);
        stats.averageAreaHectares = (stats.averageArea / 10000).toFixed(4);
    }
    
    if (lengthCount > 0) {
        stats.averageLength = stats.totalLength / lengthCount;
        stats.totalLengthKm = (stats.totalLength / 1000).toFixed(3);
        stats.averageLengthKm = (stats.averageLength / 1000).toFixed(3);
    }
    
    console.log('✅ Statistics calculated:', stats);
    return stats;
};

/**
 * Prepare data for backend API
 * Returns data in format ready for POST/PUT requests
 */
GTAgropticsLeaflet.prepareForBackend = function() {
    console.log('📤 Preparing data for backend...');
    
    const data = {
        timestamp: new Date().toISOString(),
        mapState: {
            center: this.getMapPosition().center,
            zoom: this.getMapPosition().zoom
        },
        features: this.features.map(feature => ({
            id: feature.id,
            type: feature.type,
            geometry: feature.geometry,
            properties: feature.properties,
            createdAt: feature.createdAt,
            updatedAt: feature.updatedAt
        })),
        statistics: this.getStatistics()
    };
    
    console.log('✅ Data prepared for backend');
    return data;
};

/**
 * Receive and process data from backend
 * @param {Object} backendData - Data received from backend API
 */
GTAgropticsLeaflet.receiveFromBackend = function(backendData) {
    console.log('📥 Receiving data from backend...');
    
    try {
        // Set map position if provided
        if (backendData.mapState) {
            this.setMapPosition(backendData.mapState.center, backendData.mapState.zoom);
        }
        
        // Load features if provided
        if (backendData.features && Array.isArray(backendData.features)) {
            this.setFeatures(backendData.features);
        }
        
        console.log('✅ Backend data processed successfully');
        return true;
    } catch (error) {
        console.error('❌ Error processing backend data:', error);
        this.showToast('Error processing backend data', 'error');
        return false;
    }
};
