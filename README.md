# Color Picker Mobile

A React Native application that allows users to detect and analyze colors from images, with specialized features for skin tone detection and analysis.

## Features

- **Real-time Camera Color Detection**: Use your device's camera to detect colors in real-time
- **Image Color Extraction**: Pick images from your gallery and extract dominant colors
- **Skin Tone Analysis**: Advanced skin tone detection with professional tone matching
- **Native Android Integration**: Optimized color extraction using native Android modules

## Tech Stack

- **React Native** 0.80.0
- **TypeScript**
- **React Native Vision Camera** for camera functionality
- **React Native Image Picker** for gallery access
- **Native Android Module** for optimized color extraction
- **React Native Reanimated** for smooth animations

## Prerequisites

- Node.js >= 18
- npm or Yarn
- Android Studio (for Android development)
- Xcode (for iOS development)
- React Native development environment set up ([Guide](https://reactnative.dev/docs/set-up-your-environment))

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd ColorPickerMobile080
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. For iOS, install CocoaPods dependencies:
```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

## Running the Application

### Start Metro Bundler

First, start the Metro development server:

```bash
npm start
# or
yarn start
```

### Run on Android

```bash
npm run android
# or
yarn android
```

### Run on iOS

```bash
npm run ios
# or
yarn ios
```

## Project Structure

```
ColorPickerMobile080/
├── src/
│   ├── components/
│   │   └── ColorCamera.tsx      # Camera component for real-time color detection
│   ├── native/
│   │   └── ColorExtractor.ts    # TypeScript interface for native module
│   ├── utils/
│   │   ├── imageColorExtractor.ts    # Image color extraction utilities
│   │   ├── simpleColorDetector.ts    # Basic color detection algorithms
│   │   └── toneEvaluator.ts          # Skin tone evaluation logic
│   ├── ColorPickerApp.tsx       # Main application component
│   └── toneProfiles.json        # Skin tone profile data
├── android/
│   └── app/src/main/java/com/colorpickermobile080/
│       ├── ColorExtractorModule.java    # Native Android color extraction
│       └── ColorExtractorPackage.java   # Native module package
├── ios/                          # iOS specific code
└── App.tsx                       # App entry point
```

## Key Components

### ColorPickerApp
The main application component that manages the overall app state and navigation between different features.

### ColorCamera
Implements real-time color detection using the device camera with Vision Camera integration.

### Native Color Extractor
Android native module that provides optimized color extraction from images using Android's Palette API.

### Tone Evaluator
Advanced skin tone matching system that compares detected colors against professional skin tone profiles.

## Development

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

### Testing

Run the test suite:

```bash
npm test
```

### Building for Production

#### Android

Generate a release APK:

```bash
cd android
./gradlew assembleRelease
```

The APK will be available at `android/app/build/outputs/apk/release/`

#### iOS

1. Open the project in Xcode:
```bash
cd ios
open ColorPickerMobile080.xcworkspace
```

2. Select your target device
3. Choose Product > Archive from the menu

## Troubleshooting

### Android Build Issues

If you encounter Gradle issues:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS Build Issues

Clear build cache and reinstall pods:
```bash
cd ios
rm -rf Pods Podfile.lock
bundle exec pod install
cd ..
npm run ios
```

### Metro Bundler Issues

Reset Metro cache:
```bash
npx react-native start --reset-cache
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the repository.

## Learn More

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Vision Camera Documentation](https://react-native-vision-camera.com/)
- [React Native Image Picker](https://github.com/react-native-image-picker/react-native-image-picker)