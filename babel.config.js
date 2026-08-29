module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // drizzle-kit'in Expo migrations.js'i .sql dosyalarını import ediyor — Metro'nun
      // bunu JS olarak parse etmeye çalışmaması için ham metin olarak inline ediliyor.
      // https://orm.drizzle.team/quick-sqlite/expo
      ['inline-import', { extensions: ['.sql'] }],
      'react-native-reanimated/plugin',
    ],
  };
};
