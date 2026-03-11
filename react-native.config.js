module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: null, // we handle it manually via Info.plist
      },
    },
  },
  assets: ['./node_modules/react-native-vector-icons/Fonts'],
};
