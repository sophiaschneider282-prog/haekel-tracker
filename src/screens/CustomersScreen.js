import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView,
  Platform, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';
import { loadOrders } from '../storage';
import { useFocusEffect } from '../hooks/useFocusEffect';

const KEY = 'haekel_customers';

async function loadCustomers() {
  try { const j = await AsyncStorage.getItem(KEY); return j ? JSON.parse(j) : []; } catch { return []; }
}
async function saveCustomers(data) { await AsyncStorage.setItem(KEY, JSON.stringify(data)); }

const EMPTY = { name: '', phone: '', email: '', notes: '' };
const STATUS_COLOR = { offen: '#FF9800', 'in Arbeit': '#C2185B', fertig: '#4CAF50' };

export default function CustomersScreen() {
  const { colors: C } = useTheme();
  const s = makeStyles(C);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  useFocusEffect(useCallback(() => {
    loadCustomers().then(setCustomers);
    loadOrders().then(setOrders);
  }, []));

  const ordersFor = (name) => orders.filter(o => o.customer?.trim().toLowerCase() === name.trim().toLowerCase());

  const openNew = () => { setForm(EMPTY); setEditId(null); setModalVisible(true); };
  const openEdit = (c) => {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', notes: c.notes || '' });
    setEditId(c.id);
    setDetailCustomer(null);
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Pflichtfeld', 'Bitte einen Namen eingeben.'); return; }
    const entry = {
      id: editId || Date.now().toString(),
      name: form.name.trim(), phone: form.phone.trim(),
      email: form.email.trim(), notes: form.notes.trim(),
    };
    const updated = editId ? customers.map(c => c.id === editId ? entry : c) : [entry, ...customers];
    await saveCustomers(updated);
    setCustomers(updated);
    setModalVisible(false);
  };

  const del = (id) => Alert.alert('Kunde löschen?', '', [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: async () => {
      const updated = customers.filter(c => c.id !== id);
      await saveCustomers(updated); setCustomers(updated);
      setDetailCustomer(null);
    }}
  ]);

  // Kunden aus Aufträgen die noch nicht in der Liste sind
  const orderCustomers = [...new Set(orders.map(o => o.customer).filter(Boolean))];
  const knownNames = customers.map(c => c.name.toLowerCase());
  const unknownCustomers = orderCustomers.filter(n => !knownNames.includes(n.toLowerCase()));

  const allCustomers = [
    ...customers,
    ...unknownCustomers.map(n => ({ id: 'auto_' + n, name: n, auto: true })),
  ];

  return (
    <View style={s.container}>
      <FlatList
        data={allCustomers}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        renderItem={({ item }) => {
          const cos = ordersFor(item.name);
          const total = cos.reduce((sum, o) => {
            const mat = (o.materials || []).reduce((a, m) => a + m.cost, 0);
            return sum + mat;
          }, 0);
          const open = cos.filter(o => o.status !== 'fertig').length;
          return (
            <TouchableOpacity style={s.card} onPress={() => setDetailCustomer(item)}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.name}>{item.name}</Text>
                    {item.auto && (
                      <View style={[s.badge, { backgroundColor: C.border }]}>
                        <Text style={[s.badgeText, { color: C.textLight }]}>aus Auftrag</Text>
                      </View>
                    )}
                  </View>
                  {item.phone ? <Text style={s.meta}>📞 {item.phone}</Text> : null}
                  {item.email ? <Text style={s.meta}>✉️ {item.email}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.totalPrice}>{total.toFixed(2)} €</Text>
                  <Text style={s.orderCount}>{cos.length} Auftrag{cos.length !== 1 ? 'e' : ''}</Text>
                  {open > 0 && <Text style={[s.openBadge, { color: C.warning }]}>{open} offen</Text>}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👤</Text>
            <Text style={s.emptyLabel}>Noch keine Kunden</Text>
            <Text style={s.emptyHint}>Kunden werden automatisch aus Aufträgen erkannt oder manuell hinzugefügt</Text>
          </View>
        }
      />

      <TouchableOpacity style={s.fab} onPress={openNew}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Kunden-Detail Modal */}
      <Modal visible={!!detailCustomer} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => setDetailCustomer(null)}>
            <Text style={s.cancel}>Schließen</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>{detailCustomer?.name}</Text>
          <TouchableOpacity onPress={() => openEdit(detailCustomer)}>
            <Text style={[s.saveBtn]}>✏️ Bearbeiten</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Kontaktdaten */}
          {(detailCustomer?.phone || detailCustomer?.email || detailCustomer?.notes) && (
            <View style={[s.infoBox, { backgroundColor: C.card, borderColor: C.border }]}>
              {detailCustomer?.phone ? <Text style={s.infoRow}>📞 {detailCustomer.phone}</Text> : null}
              {detailCustomer?.email ? <Text style={s.infoRow}>✉️ {detailCustomer.email}</Text> : null}
              {detailCustomer?.notes ? <Text style={[s.infoRow, { fontStyle: 'italic', color: C.textLight }]}>{detailCustomer.notes}</Text> : null}
            </View>
          )}

          {/* Statistik */}
          {(() => {
            const cos = detailCustomer ? ordersFor(detailCustomer.name) : [];
            const total = cos.reduce((sum, o) => sum + (o.materials || []).reduce((a, m) => a + m.cost, 0), 0);
            return (
              <View style={[s.statsRow, { backgroundColor: C.primaryLight, borderColor: C.border }]}>
                <View style={s.statItem}>
                  <Text style={[s.statVal, { color: C.primary }]}>{cos.length}</Text>
                  <Text style={[s.statLabel, { color: C.textLight }]}>Aufträge</Text>
                </View>
                <View style={[s.statDivider, { backgroundColor: C.border }]} />
                <View style={s.statItem}>
                  <Text style={[s.statVal, { color: C.primary }]}>{cos.filter(o => o.status === 'fertig').length}</Text>
                  <Text style={[s.statLabel, { color: C.textLight }]}>Fertig</Text>
                </View>
                <View style={[s.statDivider, { backgroundColor: C.border }]} />
                <View style={s.statItem}>
                  <Text style={[s.statVal, { color: C.primary }]}>{total.toFixed(2)} €</Text>
                  <Text style={[s.statLabel, { color: C.textLight }]}>Materialwert</Text>
                </View>
              </View>
            );
          })()}

          {/* Auftragsliste */}
          <Text style={[s.sectionTitle, { color: C.primary }]}>Aufträge</Text>
          {detailCustomer && ordersFor(detailCustomer.name).length === 0 && (
            <Text style={[s.meta, { color: C.textLight, marginTop: 8 }]}>Keine Aufträge gefunden</Text>
          )}
          {detailCustomer && ordersFor(detailCustomer.name).map(o => {
            const mat = (o.materials || []).reduce((a, m) => a + m.cost, 0);
            return (
              <View key={o.id} style={[s.orderRow, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.orderName, { color: C.text }]}>{o.name}</Text>
                  <Text style={[s.meta, { color: C.textLight }]}>
                    {new Date(o.createdAt).toLocaleDateString('de-DE')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[s.badge, { backgroundColor: STATUS_COLOR[o.status] }]}>
                    <Text style={[s.badgeText, { color: '#fff' }]}>{o.status}</Text>
                  </View>
                  <Text style={[s.meta, { color: C.textLight }]}>{mat.toFixed(2)} €</Text>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[s.delBtn, { borderColor: C.danger }]}
            onPress={() => del(detailCustomer?.id)}>
            <Text style={[s.delBtnText, { color: C.danger }]}>Kunde löschen</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Neu/Bearbeiten Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              <View style={[s.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={s.cancel}>Abbrechen</Text></TouchableOpacity>
                <Text style={s.modalTitle}>{editId ? 'Bearbeiten' : 'Neuer Kunde'}</Text>
                <TouchableOpacity onPress={save}><Text style={s.saveBtn}>Speichern</Text></TouchableOpacity>
              </View>
              <ScrollView style={[s.modalBody, { backgroundColor: C.background }]} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <Text style={s.label}>Name *</Text>
                <TextInput style={s.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="z.B. Maria Müller" placeholderTextColor={C.textLight} />
                <Text style={s.label}>Telefon</Text>
                <TextInput style={s.input} value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="z.B. 0176 12345678" placeholderTextColor={C.textLight} keyboardType="phone-pad" />
                <Text style={s.label}>E-Mail</Text>
                <TextInput style={s.input} value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="z.B. maria@email.de" placeholderTextColor={C.textLight} keyboardType="email-address" autoCapitalize="none" />
                <Text style={s.label}>Notizen</Text>
                <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="z.B. mag Pastellfarben..." placeholderTextColor={C.textLight} multiline />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  card: { backgroundColor: C.card, borderRadius: 14, marginHorizontal: 12, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: C.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { fontSize: 17, fontWeight: '700', color: C.text },
  meta: { fontSize: 13, color: C.textLight, marginTop: 3 },
  totalPrice: { fontSize: 16, fontWeight: '700', color: C.primary },
  orderCount: { fontSize: 12, color: C.textLight, marginTop: 2 },
  openBadge: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 60 },
  emptyLabel: { fontSize: 18, fontWeight: '700', color: C.text, marginTop: 12 },
  emptyHint: { fontSize: 14, color: C.textLight, marginTop: 6, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: C.primary, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300', lineHeight: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1 },
  cancel: { color: C.textLight, fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  saveBtn: { color: C.primary, fontSize: 16, fontWeight: '700' },
  modalBody: { flex: 1, padding: 20 },
  label: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 13, fontSize: 15, backgroundColor: C.card, color: C.text },
  infoBox: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16 },
  infoRow: { fontSize: 15, color: C.text, marginBottom: 6 },
  statsRow: { flexDirection: 'row', borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, marginHorizontal: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  orderRow: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  orderName: { fontSize: 15, fontWeight: '600' },
  delBtn: { marginTop: 24, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  delBtnText: { fontSize: 15, fontWeight: '600' },
});
