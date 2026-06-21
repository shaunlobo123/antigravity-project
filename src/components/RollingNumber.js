import React, { useEffect, useRef, memo } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

const DigitColumn = memo(({ digit, height, fontSize, fontWeight, color, active }) => {
  const animValue = useRef(new Animated.Value(digit)).current;
  const lastDigit = useRef(digit);

  useEffect(() => {
    if (lastDigit.current !== digit) {
      if (active) {
        Animated.timing(animValue, {
          toValue: digit,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          lastDigit.current = digit;
        });
      } else {
        animValue.setValue(digit);
        lastDigit.current = digit;
      }
    } else {
      // If digit hasn't changed but active state changed, sync value instantly without animating
      animValue.setValue(digit);
    }
  }, [digit, active, animValue]);

  const translateY = animValue.interpolate({
    inputRange: [0, 9],
    outputRange: [0, -9 * height],
  });

  return (
    <View style={{ width: fontSize * 0.62, height, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <View key={num} style={{ height, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize, fontWeight, color, lineHeight: height }}>
              {num}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
});

DigitColumn.displayName = 'DigitColumn';

const RollingNumber = memo(({ value, height = 30, fontSize = 24, fontWeight = '900', color = '#d97706', active = true }) => {
  const valueStr = String(value);
  const chars = valueStr.split('');

  return (
    <View style={{ flexDirection: 'row', height, overflow: 'hidden', alignItems: 'center' }}>
      {chars.map((char, index) => {
        const parsed = parseInt(char, 10);
        if (isNaN(parsed)) {
          return (
            <Text key={index} style={{ fontSize, fontWeight, color, lineHeight: height }}>
              {char}
            </Text>
          );
        }
        return (
          <DigitColumn
            key={index}
            digit={parsed}
            height={height}
            fontSize={fontSize}
            fontWeight={fontWeight}
            color={color}
            active={active}
          />
        );
      })}
    </View>
  );
});

RollingNumber.displayName = 'RollingNumber';

export default RollingNumber;
