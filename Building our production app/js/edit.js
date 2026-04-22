/**
 * Editing functionality for GTAgropticsLeaflet
 */

/**
 * Handle features edited event
 */
GTAgropticsLeaflet.onFeaturesEdited = function(e) {
    const layers = e.layers;
    let editedCount = 0;
    
    layers.eachLayer((layer) => {
        const featureId = layer.featureId;
        if (featureId) {
            // Find feature in storage
            const featureIndex = this.features.findIndex(f => f.id === featureId);
            if (featureIndex !== -1) {
                const feature = this.features[featureIndex];
                
                // Update timestamp
                feature.updatedAt = new Date().toISOString();
                
                // Recalculate geometry properties
                const geometryData = this.calculateGeometryProperties(layer, feature.type);
                feature.geometry = geometryData.geometry;
                feature.properties = {
                    ...feature.properties,
                    ...geometryData.properties
                };
                
                // Update popup
                this.bindFeaturePopup(layer, feature);
                
                editedCount++;
                console.log('✏️ Feature updated:', feature.id);
            }
        }
    });
    
    if (editedCount > 0) {
        this.showToast(`${editedCount} feature(s) updated successfully!`, 'success');
        console.log(`✅ ${editedCount} features edited`);
    }
};

/**
 * Handle features deleted event
 */
GTAgropticsLeaflet.onFeaturesDeleted = function(e) {
    const layers = e.layers;
    let deletedCount = 0;
    
    layers.eachLayer((layer) => {
        const featureId = layer.featureId;
        if (featureId) {
            // Remove from storage
            const featureIndex = this.features.findIndex(f => f.id === featureId);
            if (featureIndex !== -1) {
                this.features.splice(featureIndex, 1);
                deletedCount++;
                console.log('🗑️ Feature deleted:', featureId);
            }
        }
    });
    
    if (deletedCount > 0) {
        this.showToast(`${deletedCount} feature(s) deleted successfully!`, 'success');
        console.log(`✅ ${deletedCount} features deleted`);
    }
};

/**
 * Enable edit mode
 */
GTAgropticsLeaflet.enableEdit = function() {
    console.log('✏️ Edit mode enabled');
    this.isEditing = true;
    this.showToast('Edit mode enabled. Click on features to edit or delete.', 'success');
};

/**
 * Disable edit mode
 */
GTAgropticsLeaflet.disableEdit = function() {
    console.log('🛑 Edit mode disabled');
    this.isEditing = false;
};

/**
 * Delete specific feature by ID
 */
GTAgropticsLeaflet.deleteFeature = function(featureId) {
    console.log('🗑️ Deleting feature:', featureId);
    
    // Find and remove from map
    let layerToRemove = null;
    this.drawnItems.eachLayer((layer) => {
        if (layer.featureId === featureId) {
            layerToRemove = layer;
        }
    });
    
    if (layerToRemove) {
        this.drawnItems.removeLayer(layerToRemove);
        
        // Remove from storage
        const featureIndex = this.features.findIndex(f => f.id === featureId);
        if (featureIndex !== -1) {
            this.features.splice(featureIndex, 1);
            this.showToast('Feature deleted successfully!', 'success');
            console.log('✅ Feature deleted:', featureId);
            return true;
        }
    }
    
    console.warn('⚠️ Feature not found:', featureId);
    return false;
};

/**
 * Update feature properties
 */
GTAgropticsLeaflet.updateFeatureProperties = function(featureId, properties) {
    console.log('📝 Updating feature properties:', featureId);
    
    const featureIndex = this.features.findIndex(f => f.id === featureId);
    if (featureIndex !== -1) {
        const feature = this.features[featureIndex];
        
        // Update properties
        feature.properties = {
            ...feature.properties,
            ...properties
        };
        
        // Update timestamp
        feature.updatedAt = new Date().toISOString();
        
        // Update layer style if color properties changed
        this.drawnItems.eachLayer((layer) => {
            if (layer.featureId === featureId) {
                if (properties.color) {
                    layer.setStyle({ color: properties.color });
                }
                if (properties.fillColor) {
                    layer.setStyle({ fillColor: properties.fillColor });
                }
                if (properties.fillOpacity !== undefined) {
                    layer.setStyle({ fillOpacity: properties.fillOpacity });
                }
                if (properties.weight) {
                    layer.setStyle({ weight: properties.weight });
                }
                
                // Update popup
                this.bindFeaturePopup(layer, feature);
            }
        });
        
        this.showToast('Feature properties updated!', 'success');
        console.log('✅ Feature properties updated:', feature);
        return true;
    }
    
    console.warn('⚠️ Feature not found:', featureId);
    return false;
};

/**
 * Clear all features
 */
GTAgropticsLeaflet.clearAll = function() {
    console.log('🗑️ Clearing all features...');
    
    // Clear from map
    this.drawnItems.clearLayers();
    
    // Clear from storage
    const count = this.features.length;
    this.features = [];
    
    // Hide info panel
    this.hideInfoPanel();
    
    this.showToast(`${count} feature(s) cleared!`, 'success');
    console.log(`✅ All features cleared (${count} total)`);
};

/**
 * Get feature by ID
 */
GTAgropticsLeaflet.getFeatureById = function(featureId) {
    return this.features.find(f => f.id === featureId);
};

/**
 * Get all features of a specific type
 */
GTAgropticsLeaflet.getFeaturesByType = function(type) {
    return this.features.filter(f => f.type === type);
};

/**
 * Count features by type
 */
GTAgropticsLeaflet.countFeaturesByType = function() {
    const counts = {};
    this.features.forEach(f => {
        counts[f.type] = (counts[f.type] || 0) + 1;
    });
    return counts;
};
