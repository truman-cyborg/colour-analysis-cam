// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Reanimated v3+ moved the plugin here:
    'react-native-worklets/plugin', // keep this last
  ],
};
