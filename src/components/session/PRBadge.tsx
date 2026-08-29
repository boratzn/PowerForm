import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';

// §10.2 kural 7: "Kişisel rekor anında kutlansın... küçük bir animasyon + rozet."
export function PRBadge() {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(withSpring(1.15, { damping: 6 }), withTiming(1, { duration: 150 }));
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style} className="rounded-pill bg-warning px-sm py-[2px]">
      <Text className="text-xs font-bold text-bg-primary">PR 🏆</Text>
    </Animated.View>
  );
}
