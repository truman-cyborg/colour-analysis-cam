package com.colorpickermobile080;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;

public class ColorExtractorModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ColorExtractor";
    
    public ColorExtractorModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ColorExtractor";
    }

    @ReactMethod
    public void extractColorFromImage(String imagePath, Promise promise) {
        try {
            // Remove file:// prefix if present
            String cleanPath = imagePath.replace("file://", "");
            
            // Load the image
            File imageFile = new File(cleanPath);
            if (!imageFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Image file not found: " + cleanPath);
                return;
            }

            // Decode the image with lower resolution for faster processing
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = 8; // Scale down by factor of 8 for faster processing
            
            Bitmap bitmap = BitmapFactory.decodeFile(cleanPath, options);
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image");
                return;
            }

            // Get center pixel color
            int centerX = bitmap.getWidth() / 2;
            int centerY = bitmap.getHeight() / 2;
            
            // Sample a small area around the center for better accuracy
            int sampleSize = Math.min(bitmap.getWidth(), bitmap.getHeight()) / 10;
            int startX = Math.max(0, centerX - sampleSize / 2);
            int startY = Math.max(0, centerY - sampleSize / 2);
            int endX = Math.min(bitmap.getWidth(), centerX + sampleSize / 2);
            int endY = Math.min(bitmap.getHeight(), centerY + sampleSize / 2);
            
            // Calculate average color in the sample area
            long redSum = 0, greenSum = 0, blueSum = 0;
            int pixelCount = 0;
            
            for (int x = startX; x < endX; x++) {
                for (int y = startY; y < endY; y++) {
                    int pixel = bitmap.getPixel(x, y);
                    redSum += Color.red(pixel);
                    greenSum += Color.green(pixel);
                    blueSum += Color.blue(pixel);
                    pixelCount++;
                }
            }
            
            // Calculate average
            int avgRed = (int) (redSum / pixelCount);
            int avgGreen = (int) (greenSum / pixelCount);
            int avgBlue = (int) (blueSum / pixelCount);
            
            // Convert to hex
            String hexColor = String.format("#%02X%02X%02X", avgRed, avgGreen, avgBlue);
            
            // Create response
            WritableMap result = Arguments.createMap();
            result.putString("hex", hexColor);
            
            WritableMap rgb = Arguments.createMap();
            rgb.putInt("r", avgRed);
            rgb.putInt("g", avgGreen);
            rgb.putInt("b", avgBlue);
            result.putMap("rgb", rgb);
            
            // Also detect if it's likely a covered camera (very dark)
            int brightness = (avgRed + avgGreen + avgBlue) / 3;
            result.putBoolean("isDark", brightness < 30);
            result.putInt("brightness", brightness);
            
            // Recycle bitmap to free memory
            bitmap.recycle();
            
            Log.d(TAG, "Extracted color: " + hexColor + " Brightness: " + brightness);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error extracting color", e);
            promise.reject("EXTRACTION_ERROR", "Failed to extract color: " + e.getMessage());
        }
    }

    @ReactMethod
    public void extractDominantColors(String imagePath, int colorCount, Promise promise) {
        try {
            String cleanPath = imagePath.replace("file://", "");
            
            // Load the image with lower resolution
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = 16; // More aggressive scaling for dominant color extraction
            
            Bitmap bitmap = BitmapFactory.decodeFile(cleanPath, options);
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image");
                return;
            }

            // Simple dominant color extraction using histogram
            int[] pixels = new int[bitmap.getWidth() * bitmap.getHeight()];
            bitmap.getPixels(pixels, 0, bitmap.getWidth(), 0, 0, bitmap.getWidth(), bitmap.getHeight());
            
            // Count color occurrences (simplified - groups similar colors)
            int bucketSize = 32; // Group colors into buckets
            int[][][] colorBuckets = new int[256/bucketSize][256/bucketSize][256/bucketSize];
            
            for (int pixel : pixels) {
                int r = Color.red(pixel) / bucketSize;
                int g = Color.green(pixel) / bucketSize;
                int b = Color.blue(pixel) / bucketSize;
                colorBuckets[r][g][b]++;
            }
            
            // Find the most common color bucket
            int maxCount = 0;
            int dominantR = 0, dominantG = 0, dominantB = 0;
            
            for (int r = 0; r < colorBuckets.length; r++) {
                for (int g = 0; g < colorBuckets[r].length; g++) {
                    for (int b = 0; b < colorBuckets[r][g].length; b++) {
                        if (colorBuckets[r][g][b] > maxCount) {
                            maxCount = colorBuckets[r][g][b];
                            dominantR = r * bucketSize + bucketSize / 2;
                            dominantG = g * bucketSize + bucketSize / 2;
                            dominantB = b * bucketSize + bucketSize / 2;
                        }
                    }
                }
            }
            
            String hexColor = String.format("#%02X%02X%02X", dominantR, dominantG, dominantB);
            
            WritableMap result = Arguments.createMap();
            result.putString("hex", hexColor);
            
            WritableMap rgb = Arguments.createMap();
            rgb.putInt("r", dominantR);
            rgb.putInt("g", dominantG);
            rgb.putInt("b", dominantB);
            result.putMap("rgb", rgb);
            
            bitmap.recycle();
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error extracting dominant colors", e);
            promise.reject("EXTRACTION_ERROR", "Failed to extract dominant colors: " + e.getMessage());
        }
    }
}