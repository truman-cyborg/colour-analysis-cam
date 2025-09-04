import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  // useFrameProcessor,
} from 'react-native-vision-camera';
// import { runOnJS } from 'react-native-reanimated';
import ColorExtractor from '../native/ColorExtractor';
import { evaluateTone, ToneResult } from '../utils/toneEvaluator';
import toneProfiles from '../toneProfiles.json';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CapturedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  timestamp: Date;
}

export const ColorCamera: React.FC = () => {
  const [capturedColors, setCapturedColors] = useState<CapturedColor[]>([]);
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toneResult, setToneResult] = useState<ToneResult | null>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);
  const previewInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Take a snapshot to preview the color using native module
  const previewColor = useCallback(async () => {
    if (!camera.current || isCapturing || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Take a low-quality snapshot for fast processing
      const snapshot = await camera.current.takeSnapshot({
        quality: 20,
        skipMetadata: true,
      });
      
      // Use native module to extract actual color from image
      if (ColorExtractor) {
        const colorResult = await ColorExtractor.extractColorFromImage(`file://${snapshot.path}`);
        
        if (colorResult) {
          setCurrentColor(colorResult.hex);
          
          // Evaluate tone
          const evaluation = evaluateTone(colorResult.hex, toneProfiles.summer_cool_muted);
          setToneResult(evaluation);
          
          // Log for debugging
          console.log('Extracted color:', colorResult.hex, 'Score:', evaluation.score, 'Match:', evaluation.matchLevel);
        }
      } else {
        // Fallback if native module not available
        console.warn('Native ColorExtractor not available');
        setCurrentColor('#808080'); // Default gray
      }
    } catch (error) {
      console.log('Preview error:', error);
      setCurrentColor('#000000'); // Default to black on error
    } finally {
      setIsProcessing(false);
    }
  }, [isCapturing, isProcessing]);

  const captureColor = async () => {
    if (!camera.current) return;
    
    try {
      setIsCapturing(true);
      
      // Take a higher quality photo for accurate color capture
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'balanced',
      });
      
      // Extract the actual color using native module
      if (ColorExtractor) {
        const colorResult = await ColorExtractor.extractColorFromImage(`file://${photo.path}`);
        
        if (colorResult) {
          const newColor: CapturedColor = {
            hex: colorResult.hex,
            rgb: colorResult.rgb,
            timestamp: new Date(),
          };
          
          setCapturedColors(prev => [...prev, newColor]);
          setCurrentColor(colorResult.hex);
          
          // Evaluate tone for captured color
          const evaluation = evaluateTone(colorResult.hex, toneProfiles.summer_cool_muted);
          setToneResult(evaluation);
          
          // Show different message for dark (covered) camera
          if (colorResult.isDark) {
            Alert.alert('Color Captured!', `Captured: ${colorResult.hex} (Dark/Covered)`);
          } else {
            Alert.alert(
              'Color Captured!', 
              `Captured: ${colorResult.hex}\nScore: ${evaluation.score}\nMatch: ${evaluation.matchLevel}`
            );
          }
        }
      } else {
        // Fallback if native module not available
        const newColor: CapturedColor = {
          hex: currentColor,
          rgb: hexToRgb(currentColor),
          timestamp: new Date(),
        };
        
        setCapturedColors(prev => [...prev, newColor]);
        Alert.alert('Color Captured!', `Captured: ${currentColor} (Native module not available)`);
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to capture color');
    } finally {
      setIsCapturing(false);
    }
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
  };

  // Start/stop preview mode
  const togglePreviewMode = useCallback(() => {
    setIsPreviewMode(prev => !prev);
  }, []);

  // Handle preview mode - take snapshots periodically
  useEffect(() => {
    if (isPreviewMode && camera.current) {
      // Take a snapshot every second for color preview
      previewInterval.current = setInterval(() => {
        previewColor();
      }, 1000);
    } else {
      if (previewInterval.current) {
        clearInterval(previewInterval.current);
        previewInterval.current = null;
      }
    }
    
    return () => {
      if (previewInterval.current) {
        clearInterval(previewInterval.current);
      }
    };
  }, [isPreviewMode, previewColor]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>No camera device found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        // frameProcessor={frameProcessor}
      />
      
      {/* Center focus indicator */}
      <View style={styles.focusContainer}>
        <View style={styles.focusSquare}>
          <View style={[styles.focusCorner, styles.topLeft]} />
          <View style={[styles.focusCorner, styles.topRight]} />
          <View style={[styles.focusCorner, styles.bottomLeft]} />
          <View style={[styles.focusCorner, styles.bottomRight]} />
          <View style={styles.focusCenter} />
        </View>
      </View>

      {/* Current color display */}
      <View style={styles.colorDisplay}>
        <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
        <View style={styles.colorInfo}>
          <Text style={styles.colorText}>{currentColor}</Text>
          {isProcessing && <Text style={styles.processingText}>Processing...</Text>}
          {toneResult && (
            <>
              <Text style={styles.toneScoreText}>Score: {toneResult.score}</Text>
              <Text style={styles.toneMatchText}>{toneResult.matchLevel}</Text>
            </>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.previewButton, isPreviewMode && styles.previewButtonActive]}
          onPress={togglePreviewMode}
        >
          <Text style={styles.previewButtonText}>
            {isPreviewMode ? 'Live' : 'Tap to Start'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Capture button */}
      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          onPress={captureColor}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>

      {/* Captured colors */}
      {capturedColors.length > 0 && (
        <View style={styles.capturedColorsContainer}>
          <Text style={styles.capturedTitle}>Captured Colors</Text>
          <View style={styles.capturedColorsList}>
            {capturedColors.slice(-5).map((color, index) => (
              <View
                key={index}
                style={[styles.capturedColor, { backgroundColor: color.hex }]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Tone Analysis Details */}
      {toneResult && (
        <View style={styles.toneDetailsContainer}>
          <Text style={styles.toneTitle}>{toneResult.toneLabel}</Text>
          <View style={styles.toneMetrics}>
            <Text style={styles.toneMetricText}>L: {toneResult.lab.L.toFixed(1)}</Text>
            <Text style={styles.toneMetricText}>Chroma: {toneResult.chroma}</Text>
            <Text style={styles.toneMetricText}>Hue: {toneResult.hue}°</Text>
          </View>
          {toneResult.notes.length > 0 && (
            <View style={styles.toneNotes}>
              {toneResult.notes.map((note, idx) => (
                <Text key={idx} style={styles.toneNoteText}>• {note}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginHorizontal: 50,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  focusContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusSquare: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  focusCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: 'white',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  focusCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 10,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 5,
    marginTop: -5,
    marginLeft: -5,
  },
  colorDisplay: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  colorInfo: {
    flex: 1,
    marginRight: 10,
  },
  colorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  processingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
  },
  previewButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  previewButtonActive: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  previewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  captureContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  capturedColorsContainer: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 10,
  },
  capturedTitle: {
    color: 'white',
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'center',
  },
  capturedColorsList: {
    flexDirection: 'row',
  },
  capturedColor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  toneScoreText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  toneMatchText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  toneDetailsContainer: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 10,
    minWidth: 250,
  },
  toneTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  toneMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  toneMetricText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
  },
  toneNotes: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 6,
  },
  toneNoteText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginBottom: 2,
  },
});