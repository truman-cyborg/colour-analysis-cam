// Simple color detection based on image properties
// This provides a rough estimation of the dominant color

interface ColorResult {
  hex: string;
  rgb: { r: number; g: number; b: number };
}

// Map of common colors based on rough heuristics
const COLOR_PROFILES = {
  black: { r: 0, g: 0, b: 0 },
  darkGray: { r: 64, g: 64, b: 64 },
  gray: { r: 128, g: 128, b: 128 },
  lightGray: { r: 192, g: 192, b: 192 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 255, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  cyan: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },
};

export const detectSimpleColor = (metadata?: any): ColorResult => {
  // For a covered camera, return black
  if (!metadata || metadata.isCovered) {
    return {
      hex: '#000000',
      rgb: COLOR_PROFILES.black
    };
  }
  
  // Use exposure or brightness metadata if available
  const exposure = metadata?.exposure || 0;
  const brightness = metadata?.brightness || 0;
  
  // Map exposure/brightness to grayscale
  let gray = 0;
  if (exposure < -2) {
    gray = 0; // Very dark - black
  } else if (exposure < -1) {
    gray = 64; // Dark gray
  } else if (exposure < 0) {
    gray = 128; // Medium gray
  } else if (exposure < 1) {
    gray = 192; // Light gray
  } else {
    gray = 255; // White
  }
  
  return {
    hex: rgbToHex(gray, gray, gray),
    rgb: { r: gray, g: gray, b: gray }
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};