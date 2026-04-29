import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { loadOrders, saveOrders } from '../storage';
import { useTheme } from '../ThemeContext';
import { useFocusEffect } from '../hooks/useFocusEffect';
import { calculateDaysRemaining, formatDeadlineBadge, getDeadlineBadgeColor } from '../deadlineCalculator';

function formatDuration(seconds) {
  if (!seconds || seconds < 1) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const makeStyles = (C) => StyleSheet.create({
  filterRow: { flexDirection: 'row', padding: 12, paddingTop: 16, gap: 8, flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: C.border },
  filterBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  filterText: { fontSize: 13, color: C.text },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, backgroundColor: C.card, borderColor: C.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', flex: 1, color: C.text },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardSub: { fontSize: 13, marginTop: 4, color: C.textLight },
  cardFooter: { flexDirection: 'row', gap: 16, marginTop: 10 },
  cardMeta: { fontSize: 13, color: C.textLight },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: C.border, marginTop: 8 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.primary },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 60 },
  emptyLabel: { fontSize: 18, fontWeight: '700', marginTop: 12, color: C.text },
  emptyHint: { fontSize: 14, marginTop: 6, color: C.textLight },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 6, backgroundColor: C.primary },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300', lineHeight: 36 },
});

function DeadlineBadge({ deadline, status, colors }) {
  if (!deadline || status === 'fertig') return null;
  const days = calculateDaysRemaining(deadline);
  const label = formatDeadlineBadge(days);
  const color = getDeadlineBadgeColor(days, colors);
  if (!label) return null;
  return (
    <View style={{ backgroundColor: color, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 }}>
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>📅 {label}</Text>
    </View>
  );
}

export default function OrderListScreen({ navigate }) {
  const { colors: C } = useTheme();
  const s = makeStyles(C);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('alle');
  const [sortMode, setSortMode] = useState('default');

  useFocusEffect(() => { loadOrders().then(setOrders); });

  const deleteOrder = (id) => {
    Alert.alert('Auftrag löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => {
        const updated = orders.filter(o => o.id !== id);
        await saveOrders(updated);
        setOrders(updated);
      }}
    ]);
  };

  const duplicateOrder = async (order) => {
    const copy = {
      ...order,
      id: Date.now().toString(),
      name: order.name + ' (Kopie)',
      status: 'offen',
      timeSeconds: 0,
      timeLogs: [],
      images: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [copy, ...orders];
    await saveOrders(updated);
    setOrders(updated);
  };

  const filtered = filter === 'alle' ? orders : orders.filter(o => o.status === filter);
  const sorted = sortMode === 'deadline'
    ? [...filtered].sort((a, b) => {
        if (!a.deadline && !b.deadline) return a.name.localeCompare(b.name);
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        if (a.deadline === b.deadline) return a.name.localeCompare(b.name);
        return a.deadline < b.deadline ? -1 : 1;
      })
    : filtered;
  const STATUS_COLOR = { offen: C.warning, 'in Arbeit': C.primary, fertig: C.success };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={s.filterRow}>
        {['alle', 'offen', 'in Arbeit', 'fertig'].map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, { borderColor: C.border, backgroundColor: C.card },
              filter === f && { backgroundColor: C.primary, borderColor: C.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && { color: '#fff', fontWeight: '700' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[s.filterBtn, { borderColor: C.border, backgroundColor: C.card },
            sortMode === 'deadline' && { backgroundColor: C.primary, borderColor: C.primary }]}
          onPress={() => setSortMode(m => m === 'deadline' ? 'default' : 'deadline')}
        >
          <Text style={[s.filterText, sortMode === 'deadline' && { color: '#fff', fontWeight: '700' }]}>📅 Deadline</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        renderItem={({ item }) => {
          const totalMat = (item.materials || []).reduce((sum, m) => sum + m.cost, 0);
          return (
            <TouchableOpacity
              style={[s.card, { margin: 8, marginBottom: 0 }]}
              onPress={() => navigate('detail', { orderId: item.id })}
              onLongPress={() => {
                Alert.alert(item.name, '', [
                  { text: 'Duplizieren', onPress: () => duplicateOrder(item) },
                  { text: 'Löschen', style: 'destructive', onPress: () => deleteOrder(item.id) },
                  { text: 'Abbrechen', style: 'cancel' },
                ]);
              }}
            >
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>{item.name}</Text>
                  <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] || C.textLight }]}>
                    <Text style={s.badgeText}>{item.status}</Text>
                  </View>
                  <DeadlineBadge deadline={item.deadline} status={item.status} colors={C} />
                </View>
                {item.customer ? <Text style={s.cardSub}>👤 {item.customer}</Text> : null}
                {item.source ? <Text style={s.cardSub}>📦 {item.source}</Text> : null}
                {item.progress > 0 && (
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${item.progress}%` }]} />
                  </View>
                )}
                <View style={s.cardFooter}>
                  <Text style={s.cardMeta}>⏱ {formatDuration(item.timeSeconds || 0)}</Text>
                  <Text style={s.cardMeta}>🧶 {totalMat.toFixed(2)} €</Text>
                </View>
              </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🧶</Text>
            <Text style={s.emptyLabel}>Noch keine Aufträge</Text>
            <Text style={s.emptyHint}>Tippe auf + um einen neuen Auftrag anzulegen</Text>
          </View>
        }
      />
      <TouchableOpacity style={s.fab} onPress={() => navigate('newOrder')}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
