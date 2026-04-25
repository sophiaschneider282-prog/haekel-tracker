import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, PanResponder, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';

const ACTION_WIDTH = 140;
const THRESHOLD = 60;

export default function SwipeableCard({ children, onDelete, onDuplicate }) {
  const { colors: C } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  const snap = (toValue) =>
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) translateX.setValue(Math.max(g.dx, -ACTION_WIDTH));
      else translateX.setValue(Math.min(g.dx, 0));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -THRESHOLD || g.vx < -0.4) snap(-ACTION_WIDTH);
      else snap(0);
    },
    onPanResponderTerminate: () => snap(0),
  })).current;

  const close = () => snap(0);

  return (
    <View style={styles.wrapper}>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: C.primary }]}
          onPress={() => { close(); setTimeout(onDuplicate, 150); }}>
          <Text style={styles.icon}>⧉</Text>
          <Text style={styles.label}>Kopieren</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: C.danger }]}
          onPress={() => { close(); setTimeout(onDelete, 150); }}>
          <Text style={styles.icon}>🗑</Text>
          <Text style={styles.label}>Löschen</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', marginHorizontal: 12, marginBottom: 8 },
  actions: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row', borderRadius: 16, overflow: 'hidden' },
  btn: { width: 70, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  label: { fontSize: 11, color: '#fff', fontWeight: '600', marginTop: 2 },
});
