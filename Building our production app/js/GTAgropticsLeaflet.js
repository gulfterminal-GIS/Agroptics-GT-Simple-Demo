/**
 * GT Agroptics Leaflet - Main Application Object
 * All functionality is namespaced under GTAgropticsLeaflet to avoid conflicts
 */

const GTAgropticsLeaflet = {
    // Core properties
    map: null,
    drawnItems: null,
    drawControl: null,
    config: {
        center: [36.7783, -119.4179], // Default: California Central Valley
        zoom: 10,
        satellite: true
    },
    
    // Feature storage
    features: [],
    featureIdCounter: 1,
    
    // State
    isDrawing: false,
    isEditing: false,
    
    /**
     * Initialize the application
     * @param {Object} config - Configuration object from backend
     * @param {Array} config.center - [lat, lng]
     * @param {Number} config.zoom - Zoom level
     * @param {Boolean} config.satellite - Use satellite basemap
     */
    init: function(config) {
        console.log('🚀 Initializing GT Agroptics Leaflet...');
        
        // Merge config with defaults
        if (config) {
            this.config = { ...this.config, ...config };
        }
        
        // Initialize map
        this.initMap();
        
        // Initialize drawing layer
        this.initDrawingLayer();
        
        // Initialize draw controls
        this.initDrawControls();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup UI event handlers
        this.setupUIHandlers();
        
        console.log('✅ GT Agroptics Leaflet initialized successfully');
        this.showToast('Application ready!', 'success');
    },
    
    /**
     * Initialize the Leaflet map
     */
    initMap: function() {
        console.log('🗺️ Initializing map...');
        
        // Create map with default zoom control
        this.map = L.map('map', {
            center: this.config.center,
            zoom: this.config.zoom,
            zoomControl: true
        });
        
        // Add basemap
        if (this.config.satellite) {
            // Satellite imagery
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri',
                maxZoom: 19
            }).addTo(this.map);
            
            // Add labels overlay
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                attribution: '',
                maxZoom: 19
            }).addTo(this.map);
        } else {
            // OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);
        }
        
        console.log('✅ Map initialized at', this.config.center);
    },
    
    /**
     * Initialize drawing layer
     */
    initDrawingLayer: function() {
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);
        console.log('✅ Drawing layer initialized');
    },
    
    /**
     * Initialize draw controls
     */
    initDrawControls: function() {
        this.drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                polyline: {
                    shapeOptions: {
                        color: '#4CAF50',
                        weight: 3
                    },
                    metric: true,
                    feet: false
                },
                polygon: {
                    allowIntersection: false,
                    shapeOptions: {
                        color: '#2196F3',
                        fillOpacity: 0.3
                    },
                    metric: true,
                    feet: false
                },
                circle: {
                    shapeOptions: {
                        color: '#FF9800',
                        fillOpacity: 0.3
                    },
                    metric: true,
                    feet: false
                },
                rectangle: {
                    shapeOptions: {
                        color: '#9C27B0',
                        fillOpacity: 0.3
                    },
                    metric: true,
                    feet: false
                },
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: this.drawnItems,
                remove: true
            }
        });
        
        this.map.addControl(this.drawControl);
        
        // Fix for Leaflet.draw delete handler bug
        // Override the _save method to prevent null handler errors
        const self = this;
        this.map.on(L.Draw.Event.TOOLBAROPENED, function(e) {
            if (e.toolbar && e.toolbar._modes && e.toolbar._modes.remove) {
                const deleteHandler = e.toolbar._modes.remove.handler;
                if (deleteHandler && deleteHandler._save) {
                    const originalSave = deleteHandler._save;
                    deleteHandler._save = function() {
                        try {
                            originalSave.call(this);
                        } catch (err) {
                            // Silently catch the null handler error
                            console.log('Delete operation completed');
                            // Manually disable the handler
                            if (this.enabled()) {
                                this.disable();
                            }
                        }
                    };
                }
            }
        });
        
        console.log('✅ Draw controls initialized');
    },
    
    /**
     * Setup map event listeners
     */
    setupEventListeners: function() {
        const self = this;
        
        // Draw created
        this.map.on(L.Draw.Event.CREATED, function(e) {
            self.onFeatureCreated(e);
        });
        
        // Draw edited
        this.map.on(L.Draw.Event.EDITED, function(e) {
            self.onFeaturesEdited(e);
        });
        
        // Draw deleted
        this.map.on(L.Draw.Event.DELETED, function(e) {
            self.onFeaturesDeleted(e);
        });
        
        // Draw started
        this.map.on(L.Draw.Event.DRAWSTART, function() {
            self.isDrawing = true;
            console.log('✏️ Drawing started');
        });
        
        // Draw stopped
        this.map.on(L.Draw.Event.DRAWSTOP, function() {
            self.isDrawing = false;
            console.log('✏️ Drawing stopped');
        });
        
        // Edit start
        this.map.on(L.Draw.Event.EDITSTART, function() {
            self.isEditing = true;
            console.log('✏️ Edit mode started');
        });
        
        // Edit stop
        this.map.on(L.Draw.Event.EDITSTOP, function() {
            self.isEditing = false;
            console.log('✏️ Edit mode stopped');
        });
        
        // Delete start
        this.map.on(L.Draw.Event.DELETESTART, function() {
            console.log('🗑️ Delete mode started');
        });
        
        // Delete stop - Fix for the handler bug
        this.map.on(L.Draw.Event.DELETESTOP, function() {
            console.log('🗑️ Delete mode stopped');
            // Force close any remaining action bars
            setTimeout(function() {
                const actionBars = document.querySelectorAll('.leaflet-draw-actions');
                actionBars.forEach(function(bar) {
                    bar.style.display = 'none';
                });
            }, 50);
        });
        
        console.log('✅ Event listeners setup complete');
    },
    
    /**
     * Setup UI button handlers
     */
    setupUIHandlers: function() {
        const self = this;
        
        // Display Fields button
        document.getElementById('displayFieldsBtn').addEventListener('click', function() {
            self.displaySampleFields();
        });
        
        // Upload File button
        document.getElementById('uploadFileBtn').addEventListener('click', function() {
            document.getElementById('fileInput').click();
        });
        
        // File input change
        document.getElementById('fileInput').addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                self.uploadFile(e.target.files[0]);
            }
        });
        
        // Close info panel
        document.getElementById('closeInfoPanel').addEventListener('click', function() {
            self.hideInfoPanel();
        });
        
        console.log('✅ UI handlers setup complete');
    },
    
    /**
     * Show toast notification
     */
    showToast: function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    },
    
    /**
     * Show info panel
     */
    showInfoPanel: function(content) {
        const panel = document.getElementById('infoPanel');
        const contentDiv = document.getElementById('infoPanelContent');
        contentDiv.innerHTML = content;
        panel.classList.remove('hidden');
    },
    
    /**
     * Hide info panel
     */
    hideInfoPanel: function() {
        document.getElementById('infoPanel').classList.add('hidden');
    },
    
    /**
     * Get current map position
     * @returns {Object} Current map center and zoom
     */
    getMapPosition: function() {
        const center = this.map.getCenter();
        return {
            center: [center.lat, center.lng],
            zoom: this.map.getZoom()
        };
    },
    
    /**
     * Set map position (from backend)
     * @param {Array} center - [lat, lng]
     * @param {Number} zoom - Zoom level
     */
    setMapPosition: function(center, zoom) {
        if (center && Array.isArray(center) && center.length === 2) {
            this.map.setView(center, zoom || this.config.zoom);
            console.log('📍 Map position updated:', center, zoom);
        }
    }
};
