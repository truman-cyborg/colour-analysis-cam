import RNFS from 'react-native-fs';

interface ColorResult {
  hex: string;
  rgb: { r: number; g: number; b: number };
}

// Extract color by analyzing image file size and metadata as a proxy
// Darker images tend to compress better (smaller file size)
export const extractColorFromImage = async (imagePath: string): Promise<ColorResult | null> => {
  try {
    // Get file stats to estimate brightness
    const stats = await RNFS.stat(imagePath.replace('file://', ''));
    const fileSize = stats.size;
    
    // Normalize file size to a brightness value (0-255)
    // Smaller files = darker images = lower brightness
    // This is a rough approximation
    const expectedMaxSize = 500000; // 500KB for a bright image
    const expectedMinSize = 50000;  // 50KB for a dark image
    
    const normalizedSize = Math.min(Math.max(fileSize, expectedMinSize), expectedMaxSize);
    const brightnessRatio = (normalizedSize - expectedMinSize) / (expectedMaxSize - expectedMinSize);
    const brightness = Math.round(brightnessRatio * 255);
    
    // For a covered camera or dark scene, brightness should be low
    // Create a grayscale color based on brightness
    const rgb = {
      r: brightness,
      g: brightness,
      b: brightness
    };
    
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    
    console.log('Image analysis:', {
      path: imagePath,
      fileSize,
      brightness,
      hex
    });
    
    return {
      hex: hex,
      rgb: rgb,
    };
  } catch (error) {
    console.error('Error extracting color from image:', error);
    // Return black as fallback
    return {
      hex: '#000000',
      rgb: { r: 0, g: 0, b: 0 }
    };
  }
};

// Convert HSL to RGB
const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return { r, g, b };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
};