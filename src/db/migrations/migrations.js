// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_colossal_zaran.sql';
import m0001 from './0001_slim_maggott.sql';
import m0002 from './0002_burly_legion.sql';
import m0003 from './0003_busy_eddie_brock.sql';
import m0004 from './0004_nebulous_sister_grimm.sql';
import m0005 from './0005_rapid_nico_minoru.sql';
import m0006 from './0006_aspiring_joshua_kane.sql';
import m0007 from './0007_true_warbird.sql';
import m0008 from './0008_tiny_hercules.sql';
import m0009 from './0009_freezing_peter_quill.sql';

/**
 * Migrasyon SQL ifadelerinde 'CREATE TABLE' ve 'CREATE UNIQUE INDEX' komutlarına
 * 'IF NOT EXISTS' ekleyerek, cihazda tablo önceden oluşmuşsa dahi çökme yaşanmasını engeller.
 */
function ensureSafeSql(sqlStr) {
  if (typeof sqlStr !== 'string') return sqlStr;
  return sqlStr
    .replace(/CREATE TABLE\s+(?!IF NOT EXISTS)(`?\w+`?)/gi, 'CREATE TABLE IF NOT EXISTS $1')
    .replace(/CREATE UNIQUE INDEX\s+(?!IF NOT EXISTS)(`?\w+`?)/gi, 'CREATE UNIQUE INDEX IF NOT EXISTS $1')
    .replace(/CREATE INDEX\s+(?!IF NOT EXISTS)(`?\w+`?)/gi, 'CREATE INDEX IF NOT EXISTS $1');
}

export default {
  journal,
  migrations: {
    m0000: ensureSafeSql(m0000),
    m0001: ensureSafeSql(m0001),
    m0002: ensureSafeSql(m0002),
    m0003: ensureSafeSql(m0003),
    m0004: ensureSafeSql(m0004),
    m0005: ensureSafeSql(m0005),
    m0006: ensureSafeSql(m0006),
    m0007: ensureSafeSql(m0007),
    m0008: ensureSafeSql(m0008),
    m0009: ensureSafeSql(m0009),
  },
};