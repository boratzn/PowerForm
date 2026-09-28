import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// §10.2 kural 7: Kişisel rekor rozeti
export function PRBadge() {
  return (
    <View style={styles.badge}>
      <Ionicons name="trophy" size={9} color="#FBBF24" />
      <Text style={styles.text}>PR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderColor: 'rgba(251, 191, 36, 0.6)',
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  text: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FBBF24',
  },
});

