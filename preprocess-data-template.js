/**
 * Data Preprocessing Script for Satellite Imagery Demo
 * 
 * This script extracts statistics from GeoTIFF files and generates
 * JSON time-series data for use in the web application.
 * 
 * Requirements:
 * - Node.js installed
 * - Run: npm install geotiff
 * 
 * Usage:
 * node preprocess-data-template.js
 */

const GeoTIFF = require('geotiff');
const fs = require('fs');
const path = require('path');

// Configuration
const FIELDS = ['Field_10', 'Field_11', 'Field_12_and_13'];
const EXPORTS_DIR = 'exports';
const OUTPUT_DIR = 'data';
const INDICES = ['ETc_NDVI', 'NDVI', 'FC', 'GCI', 'MSAVI', 'RECI'];

// Irrigation data from requirements
const IRRIGATION_EVENTS = {
  'Field_10': [
    { date: '2025-06-13', depth: 1.0, type: 'irrigation' },
    { date: '2025-09-09', depth: 1.0, type: 'irrigation' }
  ],
  'Field_11': [
    { date: '2025-06-13', depth: 1.0, type: 'irrigation' },
    { date: '2025-07-07', depth: 1.0, type: 'irrigation' }
  ],
  'Field_12_and_13': [
    { date: '2025-06-13', depth: 1.0, type: 'irrigation' },
    { date: '2025-08-30', depth: 1.0, type: 'irrigation' }
  ]
};

/**
 * Calculate statistics from raster data array
 */
function calculateStatistics(dataArray) {
  // Filter out no-data values (common values: -9999, NaN, Infinity)
  const validData = Array.from(dataArray).filter(v => 
    v !== -9999 && 
    v !== -3.4028234663852886e+38 && // Common no-data value
    !isNaN(v) && 
    isFinite(v)
  );
  
  if (validData.length === 0) {
    return {
      mean: null,
      min: null,
      max: null,
      std: null,
      count: 0
    };
  }
  
  const sum = validData.reduce((a, b) => a + b, 0);
  const mean = sum / validData.length;
  
  const min = Math.min(...validData);
  const max = Math.max(...validData);
  
  const variance = validData.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0
  ) / validData.length;
  const std = Math.sqrt(variance);
  
  // Calculate percentiles
  const sorted = validData.sort((a, b) => a - b);
  const p25 = sorted[Math.floor(validData.length * 0.25)];
  const p50 = sorted[Math.floor(validData.length * 0.50)];
  const p75 = sorted[Math.floor(validData.length * 0.75)];
  
  return {
    mean: parseFloat(mean.toFixed(4)),
    min: parseFloat(min.toFixed(4)),
    max: parseFloat(max.toFixed(4)),
    std: parseFloat(std.toFixed(4)),
    p25: parseFloat(p25.toFixed(4)),
    p50: parseFloat(p50.toFixed(4)),
    p75: parseFloat(p75.toFixed(4)),
    count: validData.length
  };
}

/**
 * Load and process a single GeoTIFF file
 */
async function processGeoTIFF(filePath) {
  try {
    const tiff = await GeoTIFF.fromFile(filePath);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    
    // Get first band (most indices are single-band)
    const data = rasters[0];
    
    // Calculate statistics
    const stats = calculateStatistics(data);
    
    return {
      ...stats,
      width: image.getWidth(),
      height: image.getHeight()
    };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Get all available dates for a field
 */
function getAvailableDates(fieldName) {
  const fieldPath = path.join(EXPORTS_DIR, fieldName);
  
  if (!fs.existsSync(fieldPath)) {
    console.warn(`Field directory not found: ${fieldPath}`);
    return [];
  }
  
  const dates = fs.readdirSync(fieldPath)
    .filter(item => {
      const itemPath = path.join(fieldPath, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .sort(); // Sort dates chronologically
  
  return dates;
}

/**
 * Process all data for a single field
 */
async function processField(fieldName) {
  console.log(`\nProcessing ${fieldName}...`);
  
  const dates = getAvailableDates(fieldName);
  console.log(`Found ${dates.length} dates`);
  
  const timeSeriesData = [];
  
  for (const date of dates) {
    console.log(`  Processing ${date}...`);
    
    const dateData = {
      date: date,
      indices: {}
    };
    
    // Process each vegetation index
    for (const indexName of INDICES) {
      const filePath = path.join(EXPORTS_DIR, fieldName, date, `${indexName}.tif`);
      
      if (fs.existsSync(filePath)) {
        const stats = await processGeoTIFF(filePath);
        
        if (stats) {
          dateData.indices[indexName] = stats;
        }
      } else {
        console.warn(`    File not found: ${indexName}.tif`);
      }
    }
    
    timeSeriesData.push(dateData);
  }
  
  // Add irrigation events
  const fieldData = {
    fieldName: fieldName,
    timeSeries: timeSeriesData,
    irrigationEvents: IRRIGATION_EVENTS[fieldName] || []
  };
  
  return fieldData;
}

/**
 * Save data to JSON file
 */
function saveToJSON(fieldName, data) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const outputPath = path.join(OUTPUT_DIR, `${fieldName}_timeseries.json`);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`✓ Saved to ${outputPath}`);
}

/**
 * Generate a dates manifest file for each field
 */
function generateDatesManifest(fieldName, dates) {
  const manifestPath = path.join(OUTPUT_DIR, `${fieldName}_dates.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(dates, null, 2));
  console.log(`✓ Saved dates manifest to ${manifestPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Satellite Imagery Data Preprocessing');
  console.log('='.repeat(60));
  
  // Check if exports directory exists
  if (!fs.existsSync(EXPORTS_DIR)) {
    console.error(`Error: ${EXPORTS_DIR} directory not found!`);
    console.error('Please ensure the exports folder is in the same directory as this script.');
    process.exit(1);
  }
  
  // Process each field
  for (const fieldName of FIELDS) {
    try {
      const fieldData = await processField(fieldName);
      saveToJSON(fieldName, fieldData);
      
      // Generate dates manifest
      const dates = fieldData.timeSeries.map(d => d.date);
      generateDatesManifest(fieldName, dates);
      
    } catch (error) {
      console.error(`Error processing ${fieldName}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Processing complete!');
  console.log('='.repeat(60));
  console.log(`\nGenerated files in ${OUTPUT_DIR}/ directory:`);
  FIELDS.forEach(field => {
    console.log(`  - ${field}_timeseries.json`);
    console.log(`  - ${field}_dates.json`);
  });
  console.log('\nYou can now use these JSON files in your web application.');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
