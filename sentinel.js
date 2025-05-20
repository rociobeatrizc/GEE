var aoi = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[54.311345717544235, 26.49654696478046],
          [54.311345717544235, 24.433560917742728],
          [57.057927748794235, 24.433560917742728],
          [57.057927748794235, 26.49654696478046]]], null, false);


// ==============================================
// Sentinel-2 Surface Reflectance - Cloud Masking and Visualization
// https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED
// ==============================================

// ==============================================
// Function to mask clouds using the QA60 band
// Bits 10 and 11 correspond to opaque clouds and cirrus
// ==============================================
function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Keep only pixels where both cloud and cirrus bits are 0
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
               .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  // Apply the cloud mask and scale reflectance values (0–10000 ➝ 0–1)
  return image.updateMask(mask).divide(10000);
}

// ==============================================
// Load and Prepare the Image Collection
// ==============================================

// Load Sentinel-2 SR Harmonized collection (atmospherical correction already done)
var collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterDate('2020-01-01', '2020-12-31')              // Filter by date
                   .filterBounds(aoi)                                   // Filter by AOI
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) // Only images with <20% cloud cover
                   .map(maskS2clouds);                                  // Apply cloud masking

// Print number of images available after filtering
print('Number of images in collection:', collection.size());

// ==============================================
// Create a median composite from the collection
// Useful when the AOI overlaps multiple scenes or frequent cloud cover
// ==============================================
var composite = collection.median().clip(aoi);

// ==============================================
// Visualization on the Map
// ==============================================

Map.centerObject(aoi, 10); // Zoom to the AOI

// Display the first image of the collection (GEE does this by default)
Map.addLayer(collection, {
  bands: ['B4', 'B3', 'B2'],  // True color: Red, Green, Blue
  min: 0,
  max: 0.3
}, 'First image of collection');

// Display the median composite image
Map.addLayer(composite, {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 0.3
}, 'Median composite');

// ==============================================
// Select the least cloudy image from the collection
// Caution: this image may not cover the entire AOI
// ==============================================

var leastCloudy = collection.sort('CLOUDY_PIXEL_PERCENTAGE').first();

// Display the least cloudy image
Map.addLayer(leastCloudy, {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 0.3,
  gamma: 1.2
}, 'Least cloudy image');

// ==============================================
// Extract image acquisition date from system:index
// Sentinel-2 SR Harmonized does not include 'system:time_start'
// Instead, we parse the acquisition date from the image ID
// Example: '20200101T100319_20200101T100321_T32TQM'
// ==============================================

var index = ee.String(leastCloudy.get('system:index')); // e.g., '20200101T100319_...'
var dateString = index.slice(0, 8);                      // Extract 'YYYYMMDD'

// Format as 'YYYY-MM-DD'
var formattedDate = ee.String(dateString.slice(0, 4))
                      .cat('-')
                      .cat(dateString.slice(4, 6))
                      .cat('-')
                      .cat(dateString.slice(6, 8));

print('Least cloudy image date (from system:index):', formattedDate);


// ==============================================
// Export to Google Drive
// ==============================================

// Export the median composite
Export.image.toDrive({
  image: composite.select(['B4', 'B3', 'B2']),  // Select RGB bands
  description: 'Sentinel2_Median_Composite',
  folder: 'GEE_exports',                        // Folder in Google Drive
  fileNamePrefix: 'sentinel2_median_2020',
  region: aoi,
  scale: 10,                                    // Sentinel-2 resolution
  crs: 'EPSG:4326',
  maxPixels: 1e13
});

// Export the least cloudy image
Export.image.toDrive({
  image: leastCloudy.select(['B4', 'B3', 'B2']),
  description: 'Sentinel2_Least_Cloudy',
  folder: 'GEE_exports',
  fileNamePrefix: 'sentinel2_clear_2020',
  region: aoi,
  scale: 10,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
