# load required packages
library(terra)

setwd("C:/Users/rocio/Downloads/")

# import raster
landsat_median <- rast("landsat8_median_2020.tif")
landsat_median

# visualize RGB (check the order of the bands)
plotRGB(landsat_median, r = 1, g = 2, b = 3, stretch = "lin", main = "landsat (median)")
