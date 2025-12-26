module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
          ],
          alias: {
            '@': './',
            '@components': './components',
            '@style': './style',
            '@hooks': './hooks',
            '@types': './types',
          },
        },
      ],
      '@babel/plugin-proposal-export-namespace-from',
      // IMPORTANT: react-native-reanimated/plugin doit toujours être le dernier.
      'react-native-reanimated/plugin',
    ],
  };
};
