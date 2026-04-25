import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { loadOrders } from '../storage';
import { useTheme } from '../ThemeContext';

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function DashboardScreen() {
  const { colors: C } = useTheme();
  const [orders, setOrders] = useState([]);

  // reload on focus
  React.useEffect(() => { loadOrders().then(setOrders); }, []);

  const finished = orders.filter(o => o.status === 'fertig');
  const inProgress = orders.filter(o => o.status === 'in Arbeit');
  const open = orders.filter(o => o.status === 'offen');

  const totalRevenue = finished.reduce((s, o) => {
    const mat = (o.materials || []).reduce((a, m) => a + m.cost, 0);
    return s + (o.customPrice != null ? o.customPrice : mat);
  }, 0);

  const totalTime = orders.reduce((s, o) => s + (o.timeSeconds || 0), 0);

  // Materialien zählen
  const matCount = {};
  orders.forEach(o => (o.materials || []).forEach(m => {
    matCount[m.name] = (matCount[m.name] || 0) + 1;
  }));
  const topMat = Object.entries(matCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Monatsübersicht (letzte 6 Monate)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
    const monthOrders = finished.filter(o => o.createdAt?.startsWith(key));
    const revenue = monthOrders.reduce((s, o) => {
      const mat = (o.materials || []).reduce((a, m) => a + m.cost, 0);
      return s + (o.customPrice != null ? o.customPrice : mat);
    }, 0);
    months.push({ label, revenue, count: monthOrders.length });
  }
  const maxRevenue = Math.max(...months.map(m => m.revenue), 1);

  const s = makeStyles(C);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Übersicht Karten */}
      <View style={s.cardRow}>
        <View style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.statValue, { color: C.primary }]}>{totalRevenue.toFixed(0)} €</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Umsatz (fertig)</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.statValue, { color: C.primary }]}>{formatDuration(totalTime)}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Gesamtzeit</Text>
        </View>
      </View>
      <View style={s.cardRow}>
        <View style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.statValue, { color: C.success }]}>{finished.length}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Fertig</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.statValue, { color: C.warning }]}>{inProgress.length}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>In Arbeit</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.statValue, { color: C.textLight }]}>{open.length}</Text>
          <Text style={[s.statLabel, { color: C.textLight }]}>Offen</Text>
        </View>
      </View>

      {/* Monatsübersicht */}
      <Text style={[s.sectionTitle, { color: C.primary }]}>Letzte 6 Monate</Text>
      <View style={[s.chartBox, { backgroundColor: C.card, borderColor: C.border }]}>
        {months.map(m => (
          <View key={m.label} style={s.chartRow}>
            <Text style={[s.chartLabel, { color: C.textLight }]}>{m.label}</Text>
            <View style={[s.chartTrack, { backgroundColor: C.border }]}>
              <View style={[s.chartBar, { backgroundColor: C.primary, width: `${(m.revenue / maxRevenue) * 100}%` }]} />
            </View>
            <Text style={[s.chartValue, { color: C.text }]}>{m.revenue.toFixed(0)} €</Text>
          </View>
        ))}
      </View>

      {/* Top Materialien */}
      {topMat.length > 0 && <>
        <Text style={[s.sectionTitle, { color: C.primary }]}>Meistgenutzte Materialien</Text>
        <View style={[s.listBox, { backgroundColor: C.card, borderColor: C.border }]}>
          {topMat.map(([name, count], i) => (
            <View key={name} style={[s.listRow, i < topMat.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <Text style={[s.listName, { color: C.text }]}>{name}</Text>
              <Text style={[s.listCount, { color: C.primary }]}>{count}x</Text>
            </View>
          ))}
        </View>
      </>}
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background, padding: 16 },
  cardRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  chartBox: { borderRadius: 14, padding: 14, borderWidth: 1 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chartLabel: { width: 44, fontSize: 12 },
  chartTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden', marginHorizontal: 8 },
  chartBar: { height: 10, borderRadius: 5 },
  chartValue: { width: 44, fontSize: 12, textAlign: 'right' },
  listBox: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  listName: { fontSize: 15 },
  listCount: { fontSize: 15, fontWeight: '700' },
});
