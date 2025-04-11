module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      allowUndefined: true,
    }],
    ['babel-plugin-styled-components', {
      ssr: false,
      displayName: true,
      pure: true
    }],
    'react-native-reanimated/plugin',
  ],
};
