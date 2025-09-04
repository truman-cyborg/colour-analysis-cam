import { NativeModules } from 'react-native';

interface ColorResult {
  hex: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
  isDark: boolean;
  brightness: number;
}

interface IColorExtractor {
  extractColorFromImage(imagePath: string): Promise<ColorResult>;
  extractDominantColors(imagePath: string, colorCount: number): Promise<ColorResult>;
}

const { ColorExtractor } = NativeModules;

if (!ColorExtractor) {
  console.warn('ColorExtractor native module is not available. Make sure to rebuild the app.');
}

export default ColorExtractor as IColorExtractor;