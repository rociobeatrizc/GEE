// ==============================================
// Landsat 8 Collection 2, Level 2 - Cloud Masking and Visualization
// https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2
// ==============================================

// ==============================================
// Function to mask clouds and saturated pixels
// using the QA_PIXEL and QA_RADSAT bands
// ==============================================
function maskL8sr(image) {
  // QA_PIXEL bits:
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Cirrus
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL')
                    .bitwiseAnd(parseInt('11111', 2)) // selects the first 5 bits
                    .eq(0); // keeps pixels where all 5 bits are 0 (clear)

  // Mask saturated pixels (QA_RADSAT = 0 means not saturated)
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply scaling factors to reflectance and temperature bands
  var opticalBands = image.select('SR_B.')
                          .multiply(0.0000275)
                          .add(-0.2);
  var thermalBands = image.select('ST_B.*')
                          .multiply(0.00341802)
                          .add(149.0);

  // Return image with scaled bands and applied masks
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true)
              .updateMask(qaMask)
              .updateMask(saturationMask);
}


// ==============================================
// Load and Prepare Image Collection
// always check: name of the bands, temporal resolution, spatial resolution
// ==============================================


// Load Landsat 8 Surface Reflectance Tier 1 data
var collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                   .filterDate('2020-01-01', '2021-01-01') // filter by date
                   .map(maskL8sr)                           // apply cloud mask
                   .filterBounds(aoi);                      // filter by AOI

// ==============================================
// Create a median composite image from the collection
// useful when you are working on areas with unstable weather conditions
// or if your aoi intersects many tiles
// the output image is statistically computed
// ==============================================

var composite = collection.median().clip(aoi);

// ==============================================
// Visualization
// ==============================================

// Center the map view on the Area of Interest
Map.centerObject(aoi, 10);

// Display the full image collection (only the first image is shown by default)
Map.addLayer(collection, {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'], // Red, Green, Blue
  min: 0,
  max: 0.3
}, 'First image of collection');

// Display the median composite image
Map.addLayer(composite, {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.3
}, 'Median composite');


// ==============================================
// Export to Google Drive
// ==============================================
Export.image.toDrive({
  image: composite.select(['SR_B4', 'SR_B3', 'SR_B2']), // select bands (Red, Green, Blue)
  description: 'Landsat8_Median_Composite',
  folder: 'GEE_exports',  // name of your Google Drive folder
  fileNamePrefix: 'landsat8_median_2020',
  region: aoi,            // area to export
  scale: 30,              // spatial resolution (meters)
  crs: 'EPSG:4326',       // coordinate reference system
  maxPixels: 1e13         // needed for large areas
});
