const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// drizzle-kit'in Expo hedefi için ürettiği migrations.js, .sql dosyalarını doğrudan
// import ediyor (bkz. src/db/migrations/migrations.js) — Metro'nun bunları ham metin
// modülü olarak tanıması gerekiyor: https://orm.drizzle.team/quick-sqlite/expo
config.resolver.sourceExts.push('sql');

module.exports = withNativeWind(config, { input: './global.css' });
