import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, FlatList, Image, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { loadOrders, saveOrders, loadSettings, loadMaterials, saveMaterials } from '../storage';
import * as FileSystem from 'expo-file-system/legacy';
import { generateTextExport, generatePDFExport, shareFile } from '../exportGenerator';
import { useTheme } from '../ThemeContext';
import { calculateLaborCost, generatePriceBreakdown } from '../pricingCalculator';
import { linkMaterialToOrder, unlinkMaterialFromOrder, checkStockLevel } from '../materialTracker';
import { useFocusEffect } from '../hooks/useFocusEffect';
import { parseDeadlineInput, formatISOToDisplay, formatDeadlineBadge, getDeadlineBadgeColor, calculateDaysRemaining } from '../deadlineCalculator';

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4, flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  editBtn: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  editLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  editInput: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15 },
  desc: { fontSize: 15, color: C.textLight, marginBottom: 4 },
  meta: { fontSize: 14, color: C.textLight, marginBottom: 4 },
  patternLink: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.primary },
  sectionTitleStandalone: { fontSize: 16, fontWeight: '700', color: C.primary, marginTop: 20, marginBottom: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  collapseIcon: { fontSize: 13, fontWeight: '700' },
  logLink: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.primaryLight },
  logLinkText: { fontSize: 13, fontWeight: '700' },  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  statusBtnText: { color: C.text, fontSize: 14 },
  timerBox: { backgroundColor: C.card, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 12 },
  timerText: { fontSize: 36, fontWeight: '700', color: C.text },
  timerBtns: { flexDirection: 'row', gap: 10 },
  timerStatus: { paddingVertical: 0 },
  resetBtnText: { fontSize: 13, fontWeight: '600' },
  timerBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  timerBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 },
  progressLabel: { fontSize: 13 },
  progressPct: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  notesBox: { borderRadius: 12, padding: 14, borderWidth: 1 },
  notesText: { fontSize: 14, lineHeight: 22 },
  needleBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  needleBtnText: { fontSize: 13, fontWeight: '600' },
  needleTag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  needleTagText: { fontSize: 13, fontWeight: '600' },
  logSession: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  logItem: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logLabel: { fontSize: 14 },
  logValue: { fontSize: 14, fontWeight: '500' },
  logTotalRow: { borderTopWidth: 1, marginTop: 6, paddingTop: 6 },
  logTotal: { fontSize: 15, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  matRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: C.border },
  matInfo: { flex: 1 },
  matName: { fontSize: 15, color: C.text },
  matTags: { flexDirection: 'row', gap: 8, marginTop: 4 },
  matTag: { fontSize: 12, color: C.primary, backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  matCost: { fontSize: 15, color: C.text, fontWeight: '600', marginRight: 12 },
  del: { color: C.danger, fontSize: 18, fontWeight: '700' },
  dbBtn: { backgroundColor: C.primaryLight, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: C.border },
  dbBtnText: { color: C.primary, fontWeight: '700', fontSize: 14 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, fontSize: 15, backgroundColor: C.card, color: C.text },
  addBtn: { backgroundColor: C.primary, borderRadius: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  calcBox: { backgroundColor: C.primaryLight, borderRadius: 16, padding: 16, marginTop: 20, borderWidth: 1, borderColor: C.border },
  calcTitle: { fontSize: 16, fontWeight: '700', color: C.primary, marginBottom: 10 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calcLabel: { fontSize: 15, color: C.text },
  calcValue: { fontSize: 15, color: C.text },
  calcInput: { borderWidth: 1, borderRadius: 8, padding: 6, fontSize: 15, width: 90, textAlign: 'right' },
  calcTotal: { borderTopWidth: 1, borderTopColor: C.primary, marginTop: 6, paddingTop: 8 },
  calcTotalLabel: { fontSize: 17, fontWeight: '700', color: C.primary },
  calcTotalValue: { fontSize: 17, fontWeight: '700', color: C.primary },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  image: { width: 100, height: 100, borderRadius: 10 },
  imgBtnRow: { flexDirection: 'row', gap: 10 },
  imgBtn: { flex: 1, backgroundColor: C.primaryLight, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  imgBtnText: { color: C.primary, fontWeight: '700', fontSize: 14 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card },
  pickerClose: { color: C.textLight, fontSize: 16 },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  pickerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  pickerLeft: { flex: 1 },
  pickerName: { fontSize: 16, fontWeight: '700', color: C.text },
  pickerSub: { fontSize: 13, color: C.textLight, marginTop: 2 },
  pickerTags: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  pickerTag: { fontSize: 12, color: C.primary, backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pickerPrice: { fontSize: 18, fontWeight: '700', color: C.primary, marginLeft: 12 },
  qtyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: 24, paddingBottom: 16 },
  qtyBox: { backgroundColor: C.card, borderRadius: 20, padding: 24 },
  qtyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
  qtySub: { fontSize: 13, color: C.textLight, marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: C.background },
  modeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  modeBtnText: { fontSize: 14, color: C.text },
  modeBtnTextActive: { color: '#fff', fontWeight: '700' },
  qtyLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
  qtyInput: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 24, fontWeight: '700', color: C.text, backgroundColor: C.background, textAlign: 'center' },
  qtyCalc: { fontSize: 16, color: C.primary, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  qtyBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  qtyCancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  qtyCancelText: { color: C.textLight, fontWeight: '600' },
  qtyConfirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  qtyConfirmText: { color: '#fff', fontWeight: '700' },
});

export default function OrderDetailScreen({ navigate, params, showLog, onLogClose, onOpenLog }) {
  const { colors: C } = useTheme();
  const styles = makeStyles(C);
  const { orderId } = params;
  const [order, setOrder] = useState(null);
  const [markup, setMarkup] = useState(50);
  const [timerState, setTimerState] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [sessionStart, setSessionStart] = useState(null);
  const [sessionStartElapsed, setSessionStartElapsed] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', customer: '', description: '', pattern: '', source: '', customPrice: '' });
  const [deadlineError, setDeadlineError] = useState(null);
  const [notesVisible, setNotesVisible] = useState(false);
  const [notesForm, setNotesForm] = useState({ notes: '', needleSize: [] });
  const [matExpanded, setMatExpanded] = useState(true);
  const [calcExpanded, setCalcExpanded] = useState(true);
  const [customerView, setCustomerView] = useState(false);
  const [matName, setMatName] = useState('');
  const [matCost, setMatCost] = useState('');
  const [matGrams, setMatGrams] = useState('');
  const [matMeters, setMatMeters] = useState('');
  const [patternCost, setPatternCost] = useState('');
  const [hourlyWage, setHourlyWage] = useState(0);
  const [dbMaterials, setDbMaterials] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerItem, setPickerItem] = useState(null);
  const [pickerQty, setPickerQty] = useState('1');
  const [pickerMode, setPickerMode] = useState('quantity');
  const intervalRef = useRef(null);

  useEffect(() => {
    loadSettings().then(s => { setMarkup(s.markup); setHourlyWage(s.hourlyWage || 0); });
    loadMaterials().then(setDbMaterials);
    loadOrders().then(orders => {
      const o = orders.find(x => x.id === orderId);
      if (o) { setOrder(o); setElapsed(o.timeSeconds || 0); setPatternCost(o.patternCost != null ? String(o.patternCost) : ''); }
    });    return () => clearInterval(intervalRef.current);
  }, []);

  useFocusEffect(() => {
    loadSettings().then(s => { setMarkup(s.markup); setHourlyWage(s.hourlyWage || 0); });
  });

  const persist = async (updated) => {
    const orders = await loadOrders();
    const idx = orders.findIndex(x => x.id === orderId);
    if (idx >= 0) orders[idx] = updated;
    await saveOrders(orders);
    setOrder(updated);
  };

  const startTimer = () => {
    const now = new Date().toISOString();
    setSessionStart(now);
    setSessionStartElapsed(elapsed);
    setTimerState('running');
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const pauseTimer = () => {
    clearInterval(intervalRef.current);
    setTimerState('paused');
    persist({ ...order, timeSeconds: elapsed });
  };

  const resumeTimer = () => {
    setTimerState('running');
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const stopTimer = () => {
    clearInterval(intervalRef.current);
    const now = new Date().toISOString();
    const sessionSeconds = elapsed - sessionStartElapsed;
    const newSession = {
      id: Date.now().toString(),
      start: sessionStart,
      end: now,
      seconds: sessionSeconds,
    };
    const updated = {
      ...order,
      timeSeconds: elapsed,
      timeLogs: [...(order.timeLogs || []), newSession],
    };
    persist(updated);
    setTimerState('idle');
    setSessionStart(null);
    setSessionStartElapsed(0);
  };

  const resetTimer = () => {
    Alert.alert('Timer zurücksetzen?', 'Die angezeigte Zeit wird auf 0 gesetzt. Die Logs bleiben erhalten.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Zurücksetzen', style: 'destructive', onPress: () => {
        clearInterval(intervalRef.current);
        setTimerState('idle');
        setElapsed(0);
        setSessionStart(null);
        setSessionStartElapsed(0);
        persist({ ...order, timeSeconds: 0 });
      }}
    ]);
  };

  const addMaterial = () => {
    const cost = parseFloat(matCost.replace(',', '.'));
    if (!matName.trim() || isNaN(cost) || cost < 0) {
      Alert.alert('Ungültig', 'Bitte Name und Kosten eingeben.');
      return;
    }
    const newMat = {
      id: Date.now().toString(), name: matName.trim(), cost,
      grams: matGrams ? parseFloat(matGrams.replace(',', '.')) : null,
      meters: matMeters ? parseFloat(matMeters) : null,
    };
    persist({ ...order, materials: [...(order.materials || []), newMat] });
    setMatName(''); setMatCost(''); setMatGrams(''); setMatMeters('');
  };

  const addFromDB = (dbItem) => {
    setPickerItem(dbItem);
    setPickerQty('1');
    if (dbItem.grams) setPickerMode('grams');
    else if (dbItem.meters) setPickerMode('meters');
    else setPickerMode('quantity');
    setPickerVisible(true);
  };

  const confirmFromDB = async () => {
    if (!pickerItem) return;
    const qty = parseFloat(pickerQty) || 1;
    const totalQty = pickerItem.quantity || 1;
    const totalGrams = pickerItem.grams || 1;
    const totalMeters = pickerItem.meters || 1;
    const displayName = [pickerItem.name, pickerItem.brand].filter(Boolean).join(' – ');

    let cost, name;
    if (pickerMode === 'quantity') {
      cost = parseFloat(((pickerItem.price / totalQty) * qty).toFixed(2));
      name = pickerItem.quantity ? `${displayName} (${qty}/${totalQty}x)` : displayName;
    } else if (pickerMode === 'grams') {
      cost = parseFloat(((pickerItem.price / totalGrams) * qty).toFixed(2));
      name = `${displayName} (${qty}g)`;
    } else {
      cost = parseFloat(((pickerItem.price / totalMeters) * qty).toFixed(2));
      name = `${displayName} (${qty}m)`;
    }

    const newMat = {
      id: Date.now().toString(), name, cost,
      grams: pickerMode === 'grams' ? qty : null,
      meters: pickerMode === 'meters' ? qty : null,
      materialId: pickerItem.id,
      quantityUsed: qty,
    };
    const updatedOrder = { ...order, materials: [...(order.materials || []), newMat] };
    await persist(updatedOrder);

    // Update the DB material stock
    const allMaterials = await loadMaterials();
    const matIdx = allMaterials.findIndex(m => m.id === pickerItem.id);
    if (matIdx >= 0) {
      allMaterials[matIdx] = linkMaterialToOrder(allMaterials[matIdx], qty, order.id);
      await saveMaterials(allMaterials);
      setDbMaterials(allMaterials);
    }

    setPickerVisible(false);
    setPickerItem(null);
  };

  const deleteMaterial = (matId) => persist({ ...order, materials: order.materials.filter(m => m.id !== matId) });
  const setStatus = async (status) => {
    if (status === 'fertig') {
      const linkedMats = (order.materials || []).filter(m => m.materialId);
      if (linkedMats.length > 0) {
        Alert.alert(
          'Lagerbestand wiederherstellen?',
          'Soll der Lagerbestand der verwendeten Materialien wiederhergestellt werden?',
          [
            { text: 'Nein', onPress: () => persist({ ...order, status }) },
            {
              text: 'Ja', onPress: async () => {
                await persist({ ...order, status });
                const allMaterials = await loadMaterials();
                let changed = false;
                for (const mat of linkedMats) {
                  const idx = allMaterials.findIndex(m => m.id === mat.materialId);
                  if (idx >= 0) {
                    allMaterials[idx] = unlinkMaterialFromOrder(allMaterials[idx], order.id);
                    changed = true;
                  }
                }
                if (changed) {
                  await saveMaterials(allMaterials);
                  setDbMaterials(allMaterials);
                }
              }
            },
          ]
        );
        return;
      }
    }
    persist({ ...order, status });
  };

  const openEdit = () => {
    setEditForm({
      name: order.name || '',
      customer: order.customer || '',
      description: order.description || '',
      pattern: order.pattern || '',
      source: order.source || '',
      customPrice: order.customPrice != null ? String(order.customPrice) : '',
      deadline: formatISOToDisplay(order.deadline),
    });
    setEditVisible(true);
  };

  const saveEdit = () => {
    if (!editForm.name.trim()) { Alert.alert('Pflichtfeld', 'Name darf nicht leer sein.'); return; }
    const cp = editForm.customPrice.trim();
    let parsedDeadline;
    try {
      parsedDeadline = parseDeadlineInput(editForm.deadline);
    } catch (e) {
      setDeadlineError(e.message);
      return;
    }
    persist({
      ...order,
      name: editForm.name.trim(),
      customer: editForm.customer.trim(),
      description: editForm.description.trim(),
      pattern: editForm.pattern.trim(),
      source: editForm.source.trim(),
      customPrice: cp ? parseFloat(cp) : null,
      deadline: parsedDeadline,
    });
    setDeadlineError(null);
    setEditVisible(false);
  };

  const openNotes = () => {
    setNotesForm({ notes: order.notes || '', needleSize: order.needleSize || [] });
    setNotesVisible(true);
  };

  const saveNotes = () => {
    persist({ ...order, notes: notesForm.notes.trim(), needleSize: notesForm.needleSize });
    setNotesVisible(false);
  };

  const duplicateOrder = async () => {
    const orders = await loadOrders();
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
    await saveOrders([copy, ...orders]);
    Alert.alert('Dupliziert', `"${copy.name}" wurde erstellt.`);
  };

  const pickImage = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Kein Zugriff', 'Bitte Berechtigung in den Einstellungen erlauben.'); return; }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false, allowsMultipleSelection: false });
    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      persist({ ...order, images: [...(order.images || []), uri] });
    }
  };

  const deleteImage = (uri) => {
    Alert.alert('Bild entfernen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Entfernen', style: 'destructive', onPress: () =>
        persist({ ...order, images: (order.images || []).filter(i => i !== uri) })
      }
    ]);
  };

  const handleExport = async () => {
    try {
      const settings = await loadSettings();
      Alert.alert('📤 Auftrag exportieren', '', [
        {
          text: 'Als PDF',
          onPress: async () => {
            try {
              const uri = await generatePDFExport(order, settings);
              await shareFile(uri, 'application/pdf');
            } catch (e) {
              Alert.alert('Fehler', e.message);
            }
          },
        },
        {
          text: 'Als Text',
          onPress: async () => {
            try {
              const text = generateTextExport(order, settings);
              const path = FileSystem.documentDirectory + 'export-' + Date.now() + '.txt';
              await FileSystem.writeAsStringAsync(path, text);
              await shareFile(path, 'text/plain');
            } catch (e) {
              Alert.alert('Fehler', e.message);
            }
          },
        },
        { text: 'Abbrechen', style: 'cancel' },
      ]);
    } catch (e) {
      Alert.alert('Fehler', e.message);
    }
  };

  if (!order) return <View style={styles.container}><Text>Lädt...</Text></View>;

  const statusColors = { offen: C.warning, 'in Arbeit': C.primary, fertig: C.success };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={styles.titleRow}>
        <Text style={styles.title}>{order.name}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={openNotes} style={[styles.editBtn, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.editBtnText, { color: C.primary }]}>📝</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEdit} style={[styles.editBtn, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.editBtnText, { color: C.primary }]}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExport} style={[styles.editBtn, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.editBtnText, { color: C.primary }]}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>
      {order.description ? <Text style={styles.desc}>{order.description}</Text> : null}
      {order.customer ? <Text style={styles.meta}>👤 {order.customer}</Text> : null}
      {order.source ? <Text style={styles.meta}>📦 {order.source}</Text> : null}
      {order.pattern ? (
        <TouchableOpacity
          onPress={() => {
            const url = order.pattern.startsWith('http') ? order.pattern : null;
            if (url) Linking.openURL(url).catch(() => Alert.alert('Fehler', 'Link konnte nicht geöffnet werden.'));
          }}
          disabled={!order.pattern.startsWith('http')}
        >
          <Text style={[styles.patternLink, { color: order.pattern.startsWith('http') ? C.primary : C.textLight }]}>
            📖 {order.pattern.startsWith('http') ? 'Anleitung öffnen ↗' : order.pattern}
          </Text>
        </TouchableOpacity>
      ) : null}

      {order.deadline && (
        <Text style={[styles.meta, { color: getDeadlineBadgeColor(calculateDaysRemaining(order.deadline), C) || C.textLight }]}>
          📅 {formatISOToDisplay(order.deadline)} · {formatDeadlineBadge(calculateDaysRemaining(order.deadline))}
        </Text>
      )}

      <Text style={styles.sectionTitleStandalone}>Status</Text>
      <View style={styles.row}>
        {['offen', 'in Arbeit', 'fertig'].map(s => (
          <TouchableOpacity key={s} style={[styles.statusBtn, order.status === s && { backgroundColor: statusColors[s] }]} onPress={() => setStatus(s)}>
            <Text style={[styles.statusBtnText, order.status === s && { color: '#fff' }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fortschritt */}
      <View style={styles.progressRow}>
        <Text style={[styles.progressLabel, { color: C.textLight }]}>Fortschritt</Text>
        <Text style={[styles.progressPct, { color: C.primary }]}>{order.progress ?? 0}%</Text>
      </View>
      <Slider
        style={{ width: '100%', height: 36 }}
        minimumValue={0}
        maximumValue={100}
        step={5}
        value={order.progress ?? 0}
        minimumTrackTintColor={C.primary}
        maximumTrackTintColor={C.border}
        thumbTintColor={C.primary}
        onSlidingComplete={v => persist({ ...order, progress: Math.round(v) })}
      />
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Zeiterfassung</Text>
        <TouchableOpacity onPress={onOpenLog} style={styles.logLink}>
          <Text style={[styles.logLinkText, { color: C.primary }]}>Log</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.timerBox}>
        <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
        <View style={styles.timerBtns}>
          {timerState === 'idle' && (
            <TouchableOpacity style={[styles.timerBtn, { backgroundColor: C.success }]} onPress={startTimer}>
              <Text style={styles.timerBtnText}>▶ Start</Text>
            </TouchableOpacity>
          )}
          {timerState === 'running' && (<>
            <TouchableOpacity style={[styles.timerBtn, { backgroundColor: C.warning }]} onPress={pauseTimer}>
              <Text style={styles.timerBtnText}>⏸ Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.timerBtn, { backgroundColor: C.danger }]} onPress={stopTimer}>
              <Text style={styles.timerBtnText}>⏹ Stopp</Text>
            </TouchableOpacity>
          </>)}
          {timerState === 'paused' && (<>
            <TouchableOpacity style={[styles.timerBtn, { backgroundColor: C.success }]} onPress={resumeTimer}>
              <Text style={styles.timerBtnText}>▶ Weiter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.timerBtn, { backgroundColor: C.danger }]} onPress={stopTimer}>
              <Text style={styles.timerBtnText}>⏹ Stopp</Text>
            </TouchableOpacity>
          </>)}
        </View>
        {timerState === 'paused' && (
          <Text style={[styles.timerStatus, { color: C.warning }]}>Pausiert</Text>
        )}
        {(timerState !== 'idle' || elapsed > 0) && (
          <TouchableOpacity onPress={resetTimer} style={styles.timerStatus}>
            <Text style={[styles.resetBtnText, { color: C.textLight }]}>↺ Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Zeit-Log Modal */}
      <Modal visible={!!showLog} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.pickerHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={onLogClose}>
            <Text style={styles.pickerClose}>Schließen</Text>
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>Zeitverlauf</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={{ flex: 1, backgroundColor: C.background }}>
          {(order?.timeLogs || []).length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: C.textLight }]}>Noch keine abgeschlossenen Sessions</Text>
            </View>
          ) : (
            <FlatList
              data={[...(order?.timeLogs || [])].reverse()}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item, index }) => {
                const start = new Date(item.start);
                const end = new Date(item.end);
                const total = [...(order?.timeLogs || [])].reverse().length;
                return (
                  <View style={[styles.logItem, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Text style={[styles.logSession, { color: C.primary }]}>Session {total - index}</Text>
                    <View style={styles.logRow}>
                      <Text style={[styles.logLabel, { color: C.textLight }]}>Start</Text>
                      <Text style={[styles.logValue, { color: C.text }]}>
                        {start.toLocaleDateString('de-DE')} {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={styles.logRow}>
                      <Text style={[styles.logLabel, { color: C.textLight }]}>Ende</Text>
                      <Text style={[styles.logValue, { color: C.text }]}>
                        {end.toLocaleDateString('de-DE')} {end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={[styles.logRow, styles.logTotalRow, { borderTopColor: C.border }]}>
                      <Text style={[styles.logLabel, { color: C.textLight }]}>Dauer</Text>
                      <Text style={[styles.logTotal, { color: C.primary }]}>{formatDuration(item.seconds)}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>

      <TouchableOpacity style={styles.sectionRow} onPress={() => setMatExpanded(e => !e)}>
        <Text style={styles.sectionTitle}>Materialkosten</Text>
        <Text style={[styles.collapseIcon, { color: C.primary }]}>{matExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {matExpanded && <>
        {(order.materials || []).map(m => (
        <View key={m.id} style={styles.matRow}>
          <View style={styles.matInfo}>
            <Text style={styles.matName}>{m.name}</Text>
            {(m.grams || m.meters) ? (
              <View style={styles.matTags}>
                {m.grams ? <Text style={styles.matTag}>⚖️ {m.grams}g</Text> : null}
                {m.meters ? <Text style={styles.matTag}>📏 {m.meters}m</Text> : null}
              </View>
            ) : null}
          </View>
          <Text style={styles.matCost}>{m.cost.toFixed(2)} €</Text>
          <TouchableOpacity onPress={() => deleteMaterial(m.id)}>
            <Text style={styles.del}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Aus Datenbank wählen */}
      {dbMaterials.length > 0 && (
        <TouchableOpacity style={styles.dbBtn} onPress={() => setPickerVisible(true)}>
          <Text style={styles.dbBtnText}>🧺 Aus Materialdatenbank wählen</Text>
        </TouchableOpacity>
      )}

      {/* Manuell hinzufügen */}
      <View style={styles.addRow}>
        <TextInput style={[styles.input, { flex: 2 }]} placeholder="Material" placeholderTextColor={C.textLight} value={matName} onChangeText={setMatName} />
        <TextInput style={[styles.input, { flex: 1, marginLeft: 8 }]} placeholder="€" placeholderTextColor={C.textLight} value={matCost} onChangeText={setMatCost} keyboardType="decimal-pad" />
        <TouchableOpacity style={styles.addBtn} onPress={addMaterial}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.addRow}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Gramm (optional)" placeholderTextColor={C.textLight} value={matGrams} onChangeText={setMatGrams} keyboardType="decimal-pad" />
        <View style={{ width: 8 }} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Meter (optional)" placeholderTextColor={C.textLight} value={matMeters} onChangeText={setMatMeters} keyboardType="decimal-pad" />
      </View>
      </>}

      <View style={styles.calcBox}>
        <TouchableOpacity
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: calcExpanded ? 10 : 0 }}
          onPress={() => setCalcExpanded(e => !e)}
        >
          <Text style={styles.calcTitle}>Kalkulation</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setCustomerView(v => !v)}
              style={{ backgroundColor: customerView ? C.primary : C.background, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border }}
            >
              <Text style={{ fontSize: 12, color: customerView ? '#fff' : C.textLight, fontWeight: '600' }}>👤 Kundenansicht</Text>
            </TouchableOpacity>
            <Text style={[styles.collapseIcon, { color: C.primary }]}>{calcExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {calcExpanded && (() => {
          const laborCost = calculateLaborCost(elapsed, hourlyWage);
          const pc = parseFloat(patternCost.replace(',', '.')) || 0;
          const breakdown = generatePriceBreakdown(order.materials || [], pc, laborCost, markup);
          const total = breakdown.total || 1;
          return (
            <>
              {!customerView && (
                <>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Materialkosten</Text>
                    <Text style={styles.calcValue}>{breakdown.materialTotal.toFixed(2)} € <Text style={{ fontSize: 12, color: C.textLight }}>({((breakdown.materialTotal / total) * 100).toFixed(0)}%)</Text></Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Anleitung</Text>
                    <TextInput
                      style={[styles.calcInput, { borderColor: C.border, backgroundColor: C.background, color: C.text }]}
                      value={patternCost}
                      onChangeText={v => {
                        setPatternCost(v);
                        const pc2 = parseFloat(v.replace(',', '.'));
                        persist({ ...order, patternCost: isNaN(pc2) ? null : pc2 });
                      }}
                      placeholder="0.00 €"
                      keyboardType="decimal-pad"
                      placeholderTextColor={C.textLight}
                    />
                  </View>
                  {laborCost > 0 && (
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Arbeitszeit</Text>
                      <Text style={styles.calcValue}>{breakdown.laborCost.toFixed(2)} € <Text style={{ fontSize: 12, color: C.textLight }}>({((breakdown.laborCost / total) * 100).toFixed(0)}%)</Text></Text>
                    </View>
                  )}
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Aufschlag ({markup}%)</Text>
                    <Text style={styles.calcValue}>+ {breakdown.markupAmount.toFixed(2)} € <Text style={{ fontSize: 12, color: C.textLight }}>({((breakdown.markupAmount / total) * 100).toFixed(0)}%)</Text></Text>
                  </View>
                </>
              )}
              <View style={[styles.calcRow, styles.calcTotal]}>
                <Text style={styles.calcTotalLabel}>Verkaufspreis</Text>
                <Text style={styles.calcTotalValue}>
                  {order.customPrice != null ? order.customPrice.toFixed(2) : breakdown.total.toFixed(2)} €
                  {order.customPrice != null && <Text style={{ fontSize: 12, fontWeight: '400' }}> (manuell)</Text>}
                </Text>
              </View>
            </>
          );
        })()}
      </View>

      {/* Fehlende Materialien Warnung */}
      {(() => {
        const linkedMats = (order.materials || []).filter(m => m.materialId);
        if (linkedMats.length === 0) return null;
        const lowItems = linkedMats.filter(m => {
          const dbMat = dbMaterials.find(d => d.id === m.materialId);
          return dbMat && checkStockLevel(dbMat).low;
        });
        if (lowItems.length === 0) return null;
        return (
          <View style={{ backgroundColor: '#fff3cd', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#ffc107' }}>
            <Text style={{ fontWeight: '700', color: '#856404', marginBottom: 6 }}>⚠️ Materialien fehlen</Text>
            {lowItems.map(m => {
              const dbMat = dbMaterials.find(d => d.id === m.materialId);
              return (
                <Text key={m.id} style={{ color: '#856404', fontSize: 14 }}>
                  • {dbMat?.name || m.name} (Bestand: {dbMat?.stock ?? '?'}, Minimum: {dbMat?.minStock ?? '?'})
                </Text>
              );
            })}
          </View>
        );
      })()}

      {/* Notizen */}
      {(order.notes || (order.needleSize || []).length > 0) ? <>
        <Text style={styles.sectionTitleStandalone}>Notizen</Text>
        {(order.needleSize || []).length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {order.needleSize.map(s => (
              <View key={s} style={[styles.needleTag, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.needleTagText, { color: C.primary }]}>🪡 {s} mm</Text>
              </View>
            ))}
          </View>
        )}
        {order.notes ? (
          <View style={[styles.notesBox, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.notesText, { color: C.text }]}>{order.notes}</Text>
          </View>
        ) : null}
      </> : null}

      {/* Bilder */}
      <Text style={styles.sectionTitleStandalone}>Bilder</Text>
      <View style={styles.imageGrid}>
        {(order.images || []).map(uri => (
          <TouchableOpacity key={uri} onLongPress={() => deleteImage(uri)}>
            <Image source={{ uri }} style={styles.image} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.imgBtnRow}>
        <TouchableOpacity style={styles.imgBtn} onPress={() => pickImage(false)}>
          <Text style={styles.imgBtnText}>🖼 Galerie</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imgBtn} onPress={() => pickImage(true)}>
          <Text style={styles.imgBtnText}>📷 Kamera</Text>
        </TouchableOpacity>
      </View>

      {/* Notizen Modal */}
      <Modal visible={notesVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.pickerHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
            <TouchableOpacity onPress={() => setNotesVisible(false)}>
              <Text style={styles.pickerClose}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>📝 Notizen</Text>
            <TouchableOpacity onPress={saveNotes}>
              <Text style={[styles.pickerClose, { color: C.primary, fontWeight: '700' }]}>Speichern</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.editLabel, { color: C.text }]}>Nadelgröße</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['2.0','2.5','3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0','8.0','9.0','10.0'].map(size => {
                const active = (notesForm.needleSize || []).includes(size);
                return (
                  <TouchableOpacity
                    key={size}
                    style={[styles.needleBtn, { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primary : C.card }]}
                    onPress={() => setNotesForm(f => ({
                      ...f,
                      needleSize: active ? f.needleSize.filter(s => s !== size) : [...(f.needleSize || []), size]
                    }))}
                  >
                    <Text style={[styles.needleBtnText, { color: active ? '#fff' : C.text }]}>{size} mm</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.editLabel, { color: C.text }]}>Notizen (Maschenanzahl, Muster...)</Text>
            <TextInput
              style={[styles.editInput, { borderColor: C.border, backgroundColor: C.card, color: C.text, height: 200, textAlignVertical: 'top' }]}
              value={notesForm.notes}
              onChangeText={v => setNotesForm(f => ({ ...f, notes: v }))}
              placeholder="z.B. 80 Maschen anschlagen, Runde 1-5 feste Maschen..."
              placeholderTextColor={C.textLight}
              multiline
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bearbeiten Modal */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.pickerHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Text style={styles.pickerClose}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Bearbeiten</Text>
            <TouchableOpacity onPress={saveEdit}>
              <Text style={[styles.pickerClose, { color: C.primary, fontWeight: '700' }]}>Speichern</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.editLabel, { color: C.text }]}>Name *</Text>
            <TextInput style={[styles.editInput, { borderColor: C.border, backgroundColor: C.card, color: C.text }]} value={editForm.name} onChangeText={v => setEditForm(f => ({ ...f, name: v }))} placeholder="Auftragsname" placeholderTextColor={C.textLight} />
            <Text style={[styles.editLabel, { color: C.text }]}>Kunde</Text>
            <TextInput style={[styles.editInput, { borderColor: C.border, backgroundColor: C.card, color: C.text }]} value={editForm.customer} onChangeText={v => setEditForm(f => ({ ...f, customer: v }))} placeholder="z.B. Maria M." placeholderTextColor={C.textLight} />
            <Text style={[styles.editLabel, { color: C.text }]}>Beschreibung</Text>
            <TextInput style={[styles.editInput, { borderColor: C.border, backgroundColor: C.card, color: C.text, height: 100, textAlignVertical: 'top' }]} value={editForm.description} onChangeText={v => setEditForm(f => ({ ...f, description: v }))} placeholder="Details..." placeholderTextColor={C.textLight} multiline />
            <Text style={[styles.editLabel, { color: C.text }]}>Anleitung</Text>
            <TextInput style={[styles.editInput, { borderColor: C.border, backgroundColor: C.card, color: C.text }]} value={editForm.pattern} onChangeText={v => setEditForm(f => ({ ...f, pattern: v }))} placeholder="Name oder Link..." placeholderTextColor={C.textLight} autoCapitalize="none" />
            <Text style={[styles.editLabel, { color: C.text }]}>Auftragsquelle</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {['Etsy','Instagram','WhatsApp','Persönlich','Vinted','Sonstiges'].map(src => (
                <TouchableOpacity key={src}
                  style={[{ borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderColor: editForm.source === src ? C.primary : C.border, backgroundColor: editForm.source === src ? C.primary : C.card }]}
                  onPress={() => setEditForm(f => ({ ...f, source: f.source === src ? '' : src }))}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: editForm.source === src ? '#fff' : C.text }}>{src}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.editInput, { borderColor: C.border, backgroundColor: C.card, color: C.text }]} value={editForm.source} onChangeText={v => setEditForm(f => ({ ...f, source: v }))} placeholder="Oder eigene Eingabe..." placeholderTextColor={C.textLight} />
            <Text style={[styles.editLabel, { color: C.text }]}>Verkaufspreis manuell (€, leer = automatisch)</Text>
            <TextInput style={[styles.editInput, { borderColor: C.border, backgroundColor: C.card, color: C.text }]} value={editForm.customPrice} onChangeText={v => setEditForm(f => ({ ...f, customPrice: v }))} placeholder="z.B. 25.00" keyboardType="decimal-pad" />
            <Text style={[styles.editLabel, { color: C.text }]}>Fälligkeitsdatum (optional)</Text>
            <TextInput
              style={[styles.editInput, { borderColor: deadlineError ? (C.danger || '#e53935') : C.border, backgroundColor: C.card, color: C.text }]}
              value={editForm.deadline}
              onChangeText={v => { setEditForm(f => ({ ...f, deadline: v })); setDeadlineError(null); }}
              placeholder="TT.MM.JJJJ"
              placeholderTextColor={C.textLight}
              keyboardType="numbers-and-punctuation"
            />
            {deadlineError && <Text style={{ color: C.danger || '#e53935', fontSize: 13, marginTop: 4 }}>{deadlineError}</Text>}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Material Picker Modal – Auswahlliste */}
      <Modal visible={pickerVisible && !pickerItem} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={() => setPickerVisible(false)}>
            <Text style={styles.pickerClose}>Schließen</Text>
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>Material wählen</Text>
          <View style={{ width: 80 }} />
        </View>
        <FlatList
          data={dbMaterials}
          keyExtractor={item => item.id}
          style={{ flex: 1, backgroundColor: C.background }}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pickerItem} onPress={() => addFromDB(item)}>
              {item.photos?.length > 0 && (
                <Image source={{ uri: item.photos[0] }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 10 }} />
              )}
              <View style={styles.pickerLeft}>
                <Text style={styles.pickerName}>{[item.name, item.brand].filter(Boolean).join(' – ')}</Text>
                {(item.yarnTypes || []).length > 0 && (
                  <View style={styles.pickerTags}>
                    {item.yarnTypes.map(t => <Text key={t} style={styles.pickerTag}>{t}</Text>)}
                  </View>
                )}
                <View style={styles.pickerTags}>
                  {item.quantity ? <Text style={styles.pickerTag}>🔢 {item.quantity}x</Text> : null}
                  {item.grams ? <Text style={styles.pickerTag}>⚖️ {item.grams}g</Text> : null}
                  {item.meters ? <Text style={styles.pickerTag}>📏 {item.meters}m</Text> : null}
                  {item.color ? <Text style={styles.pickerTag}>🎨 {item.color}</Text> : null}
                </View>
              </View>
              <Text style={styles.pickerPrice}>{item.price.toFixed(2)} €</Text>
            </TouchableOpacity>
          )}
        />
      </Modal>

      {/* Mengen-Modal */}
      <Modal visible={!!pickerItem} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.qtyOverlay}>
              <View style={styles.qtyBox}>
                <Text style={styles.qtyTitle}>{[pickerItem?.name, pickerItem?.brand].filter(Boolean).join(' – ')}</Text>
                <Text style={styles.qtySub}>
                  {[
                    pickerItem?.quantity && `${pickerItem.quantity}x`,
                    pickerItem?.grams && `${pickerItem.grams}g`,
                    pickerItem?.meters && `${pickerItem.meters}m`,
                  ].filter(Boolean).join(' · ')} · {pickerItem?.price?.toFixed(2)} €
                </Text>

                {/* Modus-Auswahl – nur anzeigen was hinterlegt ist */}
                <View style={styles.modeRow}>
                  {pickerItem?.quantity && (
                    <TouchableOpacity
                      style={[styles.modeBtn, pickerMode === 'quantity' && styles.modeBtnActive]}
                      onPress={() => { setPickerMode('quantity'); setPickerQty('1'); }}
                    >
                      <Text style={[styles.modeBtnText, pickerMode === 'quantity' && styles.modeBtnTextActive]}>Stück</Text>
                    </TouchableOpacity>
                  )}
                  {pickerItem?.grams && (
                    <TouchableOpacity
                      style={[styles.modeBtn, pickerMode === 'grams' && styles.modeBtnActive]}
                      onPress={() => { setPickerMode('grams'); setPickerQty(''); }}
                    >
                      <Text style={[styles.modeBtnText, pickerMode === 'grams' && styles.modeBtnTextActive]}>Gramm</Text>
                    </TouchableOpacity>
                  )}
                  {pickerItem?.meters && (
                    <TouchableOpacity
                      style={[styles.modeBtn, pickerMode === 'meters' && styles.modeBtnActive]}
                      onPress={() => { setPickerMode('meters'); setPickerQty(''); }}
                    >
                      <Text style={[styles.modeBtnText, pickerMode === 'meters' && styles.modeBtnTextActive]}>Meter</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.qtyLabel}>
                  {pickerMode === 'grams' ? `Verwendete Gramm (von ${pickerItem?.grams}g)` :
                   pickerMode === 'meters' ? `Verwendete Meter (von ${pickerItem?.meters}m)` :
                   `Verwendete Stück (von ${pickerItem?.quantity})`}
                </Text>
                <TextInput
                  style={styles.qtyInput}
                  value={pickerQty}
                  onChangeText={setPickerQty}
                  keyboardType="decimal-pad"
                  autoFocus
                  selectTextOnFocus
                />
                <Text style={styles.qtyCalc}>
                  = {(() => {
                    const q = parseFloat(pickerQty) || 0;
                    const p = pickerItem?.price || 0;
                    if (pickerMode === 'grams') return ((p / (pickerItem?.grams || 1)) * q).toFixed(2);
                    if (pickerMode === 'meters') return ((p / (pickerItem?.meters || 1)) * q).toFixed(2);
                    return ((p / (pickerItem?.quantity || 1)) * q).toFixed(2);
                  })()} €
                </Text>

                <View style={styles.qtyBtns}>
                  <TouchableOpacity style={styles.qtyCancelBtn} onPress={() => setPickerItem(null)}>
                    <Text style={styles.qtyCancelText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.qtyConfirmBtn} onPress={confirmFromDB}>
                    <Text style={styles.qtyConfirmText}>Hinzufügen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
    </TouchableWithoutFeedback>
  );
}

