import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  FlatList, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Image
} from 'react-native';import * as ImagePicker from 'expo-image-picker';
import { loadMaterials, saveMaterials, loadOrders, saveOrders, savePhotoForMaterial, deletePhotosForMaterial } from '../storage';
import { getMaterialUsageAnalytics } from '../materialTracker';
import { useTheme } from '../ThemeContext';

const YARN_TYPES = [
  'Baumwolle', 'Chenille', 'Merino', 'Acryl', 'Wolle', 'Alpaka',
  'Mohair', 'Bambus', 'Leinen', 'Seide', 'Polyester', 'Mischgarn', 'Sonstiges'
];

const DEFAULT_BRANDS = [];

const EMPTY_FORM = { materialType: null, name: '', brand: '', price: '', grams: '', meters: '', color: '', colorNumber: '', yarnTypes: [], quantity: '', stock: '', minStock: '', wishlist: false, shop: '', tags: [], photos: [], orderLinks: [], usageStatistics: { totalUsed: 0, averagePerOrder: 0, lastUsed: null } };

export default function MaterialsDBScreen() {
  const { colors: C } = useTheme();
  const styles = makeStyles(C);
  const [materials, setMaterials] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('lager');
  const [sortBy, setSortBy] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [shoppingVisible, setShoppingVisible] = useState(false);
  const [filterBrand, setFilterBrand] = useState([]);
  const [filterColor, setFilterColor] = useState([]);
  const [filterName, setFilterName] = useState([]);
  const [filterModalType, setFilterModalType] = useState(null);
  const [orderUsage, setOrderUsage] = useState([]);
  const [usageAnalytics, setUsageAnalytics] = useState(null);

  useEffect(() => { loadMaterials().then(setMaterials); }, []);

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setOrderUsage([]); setUsageAnalytics(null); setModalVisible(true); };  const openEdit = (item) => {
    setForm({
      materialType: item.materialType || (item.grams || item.meters ? 'yarn' : 'item'),
      name: item.name || '',
      brand: item.brand || '', price: item.price != null ? item.price.toFixed(2) : '',
      grams: item.grams ? String(item.grams) : '',
      meters: item.meters ? String(item.meters) : '',
      color: item.color || '',
      colorNumber: item.colorNumber || '',
      yarnTypes: item.yarnTypes || (item.yarnType ? [item.yarnType] : []),
      quantity: item.quantity ? String(item.quantity) : '',
      stock: item.stock != null ? String(item.stock) : '',
      minStock: item.minStock != null ? String(item.minStock) : '',
      wishlist: item.wishlist || false,
      shop: item.shop || '',
      tags: item.tags || [],
      photos: item.photos || [],
      orderLinks: item.orderLinks || [],
      usageStatistics: item.usageStatistics || { totalUsed: 0, averagePerOrder: 0, lastUsed: null },
    });    setEditId(item.id);
    // Load orders that reference this material
    loadOrders().then(orders => {
      const names = orders
        .filter(o => (o.materials || []).some(m => m.materialId === item.id))
        .map(o => o.name || o.id);
      setOrderUsage(names);
      const analytics = getMaterialUsageAnalytics(item.id, orders);
      setUsageAnalytics(analytics);
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.name.trim() && !form.brand.trim()) {
      if (Platform.OS === 'web') { window.alert('Bitte Name oder Marke eingeben.'); } else { Alert.alert('Pflichtfeld', 'Bitte Name oder Marke eingeben.'); }
      return;
    }
    const price = parseFloat(form.price) || 0;
    if (price < 0) {
      if (Platform.OS === 'web') { window.alert('Bitte einen gültigen Preis eingeben.'); } else { Alert.alert('Ungültig', 'Bitte einen gültigen Preis eingeben.'); }
      return;
    }

    const entry = {
      id: editId || Date.now().toString(),
      materialType: form.materialType || 'yarn',
      name: form.name.trim(),
      brand: form.brand.trim(),
      price,
      grams: form.grams ? parseFloat(form.grams) : null,
      meters: form.meters ? parseFloat(form.meters) : null,
      color: form.color.trim(),
      colorNumber: form.colorNumber.trim(),
      yarnTypes: form.yarnTypes,
      quantity: form.quantity ? parseInt(form.quantity) : null,
      stock: form.stock !== '' ? parseInt(form.stock) : null,
      minStock: form.minStock !== '' ? parseInt(form.minStock) : null,
      wishlist: form.wishlist,
      shop: form.shop.trim(),
      tags: form.tags,
      photos: form.photos,
      orderLinks: form.orderLinks,
      usageStatistics: form.usageStatistics,
    };

    const updated = editId
      ? materials.map(m => m.id === editId ? entry : m)
      : [entry, ...materials];

    await saveMaterials(updated);
    setMaterials(updated);
    setModalVisible(false);
  };

  const deleteMat = (id) => {
    Alert.alert('Material löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => {
        const updated = materials.filter(m => m.id !== id);
        await saveMaterials(updated);
        setMaterials(updated);
        // Delete associated photos
        await deletePhotosForMaterial(id);
        // Remove materialId references from all orders
        const orders = await loadOrders();
        const updatedOrders = orders.map(o => ({
          ...o,
          materials: (o.materials || []).map(m => m.materialId === id ? { ...m, materialId: null } : m),
        }));
        await saveOrders(updatedOrders);
      }}
    ]);
  };

  const pickPhoto = async (useCamera) => {
    let permResult;
    if (useCamera) {
      permResult = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (!permResult.granted) {
      Alert.alert('Berechtigung verweigert', 'Bitte erlaube den Zugriff in den Einstellungen.');
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const matId = editId || 'new_' + Date.now();
      const storedUri = await savePhotoForMaterial(matId, result.assets[0].uri);
      setForm(f => ({ ...f, photos: [...f.photos, storedUri] }));
    }
  };

  const filtered = materials.filter(m => {
    const matchSearch = (m.brand || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.yarnTypes || []).some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      (m.color || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchBrand = filterBrand.length === 0 || filterBrand.includes(m.brand);
    const matchColor = filterColor.length === 0 || filterColor.includes(m.color);
    const matchName = filterName.length === 0 || filterName.includes(m.name);
    if (activeTab === 'lager') return matchSearch && matchBrand && matchColor && matchName && !m.wishlist;
    if (activeTab === 'wunschliste') return matchSearch && matchBrand && matchColor && matchName && m.wishlist;
    return matchSearch && matchBrand && matchColor && matchName;
  }).sort((a, b) => {
    let va, vb;
    if (sortBy === 'price') { va = a.price; vb = b.price; }
    else if (sortBy === 'color') { va = a.color || ''; vb = b.color || ''; }
    else { va = a.brand || ''; vb = b.brand || ''; }
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? va - vb : vb - va;
  });

  const shoppingList = materials.filter(m => !m.wishlist && m.stock != null && m.minStock != null && m.stock <= m.minStock);
  const allTags = [...new Set(materials.flatMap(m => m.tags || []))];
  const lowStock = shoppingList;

  // alle gespeicherten Marken + Standardmarken zusammenführen
  const savedBrands = [...new Set(materials.map(m => m.brand).filter(Boolean))];
  const allBrands = [...new Set([...savedBrands, ...DEFAULT_BRANDS])];
  const allColors = [...new Set(materials.map(m => m.color).filter(Boolean))];
  const allNames = [...new Set(materials.map(m => m.name).filter(Boolean))];

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: C.border }]}>
        {[['lager','🧺 Lager'],['wunschliste','⭐ Wunschliste']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tabBtn, activeTab === key && { borderBottomColor: C.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab(key)}>
            <Text style={[styles.tabBtnText, { color: activeTab === key ? C.primary : C.textLight }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Niedrig-Bestand Warnung */}
      {lowStock.length > 0 && (
        <View style={[styles.warnBox, { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }]}>
          <Text style={styles.warnText}>⚠️ Niedriger Bestand: {lowStock.map(m => m.brand).join(', ')}</Text>
        </View>
      )}

      {/* Suche + Einkaufswagen */}
      <View style={{ flexDirection: 'row', marginHorizontal: 12, marginTop: 12, marginBottom: 10, gap: 8, alignItems: 'center' }}>
        <TextInput style={[styles.search, { flex: 1 }]} placeholder="🔍 Suchen..." value={search} onChangeText={setSearch} placeholderTextColor={C.textLight} />
        <TouchableOpacity
          style={[styles.cartBtn, { backgroundColor: shoppingList.length > 0 ? C.danger : C.card, borderColor: shoppingList.length > 0 ? C.danger : C.border }]}
          onPress={() => setShoppingVisible(true)}>
          <Text style={styles.cartIcon}>🛒</Text>
          {shoppingList.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{shoppingList.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter-Leiste + aktive Chips */}
      <View style={[styles.filterBar, { borderBottomColor: C.border }]}>
        {/* Filter-Buttons */}
        <View style={styles.filterBtnRow}>
          {[
            { key: 'name',  icon: '🏷', label: 'Name',  active: filterName,  set: setFilterName },
            { key: 'brand', icon: '🏪', label: 'Marke', active: filterBrand, set: setFilterBrand },
            { key: 'color', icon: '🎨', label: 'Farbe', active: filterColor, set: setFilterColor },
            { key: 'sort',  icon: '↕',  label: 'Preis', active: sortBy === 'price' ? ['x'] : [], set: null },
          ].map(f => {
            const isActive = f.key === 'sort' ? sortBy === 'price' : f.active.length > 0;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn4, {
                  borderColor: isActive ? C.primary : C.border,
                  backgroundColor: isActive ? C.primary : C.card,
                }]}
                onPress={() => {
                  if (f.key === 'sort') { if (sortBy === 'price') setSortAsc(a => !a); else { setSortBy('price'); setSortAsc(true); } }
                  else setFilterModalType(f.key);
                }}
              >
                <Text style={[styles.filterBtn4Icon, { color: isActive ? '#fff' : C.textLight }]}>{f.icon}</Text>
                <Text style={[styles.filterBtn4Label, { color: isActive ? '#fff' : C.text }]}>
                  {f.key === 'sort' ? `Preis ${sortBy === 'price' ? (sortAsc ? '↑' : '↓') : ''}` : f.label}
                </Text>
                {isActive && f.key !== 'sort' && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{f.active.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Aktive Filter-Chips – nur wenn vorhanden */}
        {(filterName.length > 0 || filterBrand.length > 0 || filterColor.length > 0) && (
          <View style={styles.activeChipsRow}>
            {[
              ...filterName.map(v => ({ v, set: setFilterName, arr: filterName })),
              ...filterBrand.map(v => ({ v, set: setFilterBrand, arr: filterBrand })),
              ...filterColor.map(v => ({ v, set: setFilterColor, arr: filterColor })),
            ].map(({ v, set, arr }) => (
              <TouchableOpacity key={v}
                style={[styles.activeChip, { backgroundColor: C.primaryLight, borderColor: C.primary }]}
                onPress={() => set(arr.filter(x => x !== v))}>
                <Text style={[styles.activeChipText, { color: C.primary }]}>{v} ✕</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.activeChip, { backgroundColor: '#FFEBEE', borderColor: C.danger }]}
              onPress={() => { setFilterName([]); setFilterBrand([]); setFilterColor([]); }}>
              <Text style={[styles.activeChipText, { color: C.danger }]}>✕ Alle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filter-Auswahl Modal */}
      <Modal visible={!!filterModalType} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => setFilterModalType(null)}>
            <Text style={styles.modalCancel}>Fertig</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {filterModalType === 'brand' ? '🏪 Marke' : filterModalType === 'color' ? '🎨 Farbe' : '🏷 Name'}
          </Text>
          <TouchableOpacity onPress={() => {
            if (filterModalType === 'brand') setFilterBrand([]);
            else if (filterModalType === 'color') setFilterColor([]);
            else setFilterName([]);
          }}>
            <Text style={[styles.modalCancel, { color: C.danger }]}>Alle weg</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(filterModalType === 'brand' ? allBrands : filterModalType === 'color' ? allColors : allNames).map(item => {
              const arr = filterModalType === 'brand' ? filterBrand : filterModalType === 'color' ? filterColor : filterName;
              const setArr = filterModalType === 'brand' ? setFilterBrand : filterModalType === 'color' ? setFilterColor : setFilterName;
              const active = arr.includes(item);
              return (
                <TouchableOpacity key={item}
                  style={[styles.filterChip, { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primary : C.card }]}
                  onPress={() => setArr(active ? arr.filter(x => x !== item) : [...arr, item])}
                >
                  <Text style={[styles.filterChipText, { color: active ? '#fff' : C.text }]}>
                    {active ? '✓ ' : ''}{item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Modal>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} onLongPress={() => deleteMat(item.id)}>
            <View style={styles.cardTop}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardName}>{item.name || item.brand}</Text>
                {item.name && item.brand ? <Text style={styles.cardColor}>🏷 {item.brand}</Text> : null}
                {item.color ? <Text style={styles.cardColor}>🎨 {item.color}{item.colorNumber ? ` · Nr. ${item.colorNumber}` : ''}</Text> : null}
                {item.shop ? <Text style={styles.cardColor}>🏪 {item.shop}</Text> : null}
                {(item.yarnTypes || []).length > 0 && (
                  <View style={[styles.nameRow, { marginTop: 8 }]}>
                    {item.yarnTypes.map(t => (
                      <View key={t} style={styles.yarnBadge}><Text style={styles.yarnBadgeText}>{t}</Text></View>
                    ))}
                  </View>
                )}
                {(item.tags || []).length > 0 && (
                  <View style={[styles.nameRow, { marginTop: 4 }]}>
                    {item.tags.map(t => (
                      <View key={t} style={[styles.yarnBadge, { backgroundColor: C.border }]}><Text style={[styles.yarnBadgeText, { color: C.textLight }]}>#{t}</Text></View>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardPrice}>{item.price.toFixed(2)} €</Text>
                {item.grams ? <Text style={[styles.cardColor, { textAlign: 'right' }]}>{(item.price / item.grams * 10).toFixed(2)} €/10g</Text> : null}
                {item.quantity && item.materialType === 'item' ? <Text style={[styles.cardColor, { textAlign: 'right' }]}>{(item.price / item.quantity).toFixed(2)} €/Stück</Text> : null}
              </View>
            </View>
            <View style={styles.cardTags}>
              {item.wishlist && <View style={[styles.tag, { backgroundColor: '#FFF9C4' }]}><Text style={[styles.tagText, { color: '#F57F17' }]}>⭐ Wunschliste</Text></View>}
              {item.stock != null && (
                <View style={[styles.tag, { backgroundColor: item.minStock != null && item.stock <= item.minStock ? '#FFEBEE' : C.primaryLight }]}>
                  <Text style={[styles.tagText, { color: item.minStock != null && item.stock <= item.minStock ? C.danger : C.primary }]}>
                    📦 {item.stock} Knäuel{item.minStock != null && item.stock <= item.minStock ? ' ⚠️' : ''}
                  </Text>
                </View>
              )}
              {item.quantity ? <View style={styles.tag}><Text style={styles.tagText}>🔢 {item.quantity}x</Text></View> : null}
              {item.grams ? <View style={styles.tag}><Text style={styles.tagText}>⚖️ {item.grams}g</Text></View> : null}
              {item.meters ? <View style={styles.tag}><Text style={styles.tagText}>📏 {item.meters}m</Text></View> : null}
            </View>
            {item.photos?.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {item.photos.map((uri, idx) => (
                  <Image key={idx} source={{ uri }} style={{ width: 60, height: 60, borderRadius: 8, marginRight: 6 }} resizeMode="cover" />
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧶</Text>
            <Text style={styles.emptyLabel}>Noch keine Materialien</Text>
            <Text style={styles.emptyHint}>Tippe auf + um Material hinzuzufügen</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openNew}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Einkaufsliste Modal */}
      <Modal visible={shoppingVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => setShoppingVisible(false)}><Text style={styles.modalCancel}>Schließen</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>🛒 Einkaufsliste</Text>
          <View style={{ width: 80 }} />
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {shoppingList.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyLabel, { color: C.text }]}>Alles gut bestückt! ✅</Text>
            </View>
          ) : shoppingList.map(item => (
            <View key={item.id} style={[styles.card, { marginHorizontal: 0 }]}>
              <Text style={styles.cardName}>{item.brand}</Text>
              {item.shop ? <Text style={styles.cardColor}>🏪 {item.shop}</Text> : null}
              <Text style={[styles.cardColor, { color: C.danger }]}>
                Bestand: {item.stock} / Minimum: {item.minStock}
              </Text>
              {item.grams ? <Text style={styles.cardColor}>⚖️ {item.grams}g · {item.price.toFixed(2)} €</Text> : null}
            </View>
          ))}
        </ScrollView>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisible(false); setForm(EMPTY_FORM); setEditId(null); }}>
              <Text style={styles.modalCancel}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editId ? 'Material bearbeiten' : 'Neues Material'}</Text>
            <TouchableOpacity onPress={save}><Text style={styles.modalSave}>Speichern</Text></TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Materialtyp-Auswahl */}
            {!editId && !form.materialType && (
              <View style={styles.typePickerBox}>
                <Text style={[styles.typePickerTitle, { color: C.text }]}>Was möchtest du hinzufügen?</Text>
                <TouchableOpacity style={[styles.typeBtn, { borderColor: C.primary, backgroundColor: C.primaryLight }]} onPress={() => setForm(f => ({ ...f, materialType: 'yarn' }))}>
                  <Text style={styles.typeBtnIcon}>🧶</Text>
                  <Text style={[styles.typeBtnText, { color: C.primary }]}>Wolle / Garn</Text>
                  <Text style={[styles.typeBtnSub, { color: C.textLight }]}>Mit Gramm, Meter, Wollart</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, { borderColor: C.border, backgroundColor: C.card }]} onPress={() => setForm(f => ({ ...f, materialType: 'item' }))}>
                  <Text style={styles.typeBtnIcon}>📦</Text>
                  <Text style={[styles.typeBtnText, { color: C.text }]}>Stückware</Text>
                  <Text style={[styles.typeBtnSub, { color: C.textLight }]}>Safety Eyes, Schlüsselanhänger, Knöpfe...</Text>
                </TouchableOpacity>
              </View>
            )}

            {form.materialType === 'yarn' && <>
              <Text style={styles.fieldLabel}>Wollart (Mehrfachauswahl)</Text>
              <View style={styles.yarnTypeGrid}>              {YARN_TYPES.map(type => {
                const active = (form.yarnTypes || []).includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.yarnTypeBtn, active && styles.yarnTypeBtnActive]}
                    onPress={() => setForm(f => ({
                      ...f,
                      yarnTypes: active
                        ? f.yarnTypes.filter(t => t !== type)
                        : [...(f.yarnTypes || []), type]
                    }))}
                  >
                    <Text style={[styles.yarnTypeBtnText, active && styles.yarnTypeBtnTextActive]}>
                      {active ? '✓ ' : ''}{type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            </>}

            {/* Gemeinsame Felder – nur wenn Typ gewählt */}
            {(form.materialType || editId) && <>

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder={form.materialType === 'item' ? 'z.B. Safety Eyes 10mm' : 'z.B. Safran'} placeholderTextColor={C.textLight} />

            <Text style={styles.fieldLabel}>Marke</Text>
            <TextInput style={styles.input} value={form.brand} onChangeText={v => setForm(f => ({ ...f, brand: v }))} placeholder="z.B. Drops" placeholderTextColor={C.textLight} />
            <View style={styles.brandChips}>
              {allBrands.map(b => (
                <TouchableOpacity key={b} style={[styles.brandChip, form.brand === b && styles.brandChipActive]} onPress={() => setForm(f => ({ ...f, brand: f.brand === b ? '' : b }))}>
                  <Text style={[styles.brandChipText, form.brand === b && styles.brandChipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.materialType === 'yarn' && <>
              <Text style={styles.fieldLabel}>Farbe</Text>
              <TextInput style={styles.input} value={form.color} onChangeText={v => setForm(f => ({ ...f, color: v }))} placeholder="z.B. Rosa" placeholderTextColor={C.textLight} />
              {allColors.length > 0 && (
                <View style={[styles.brandChips, { marginTop: 8 }]}>
                  {allColors.map(c => (
                    <TouchableOpacity key={c} style={[styles.brandChip, form.color === c && styles.brandChipActive]} onPress={() => setForm(f => ({ ...f, color: f.color === c ? '' : c }))}>
                      <Text style={[styles.brandChipText, form.color === c && styles.brandChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.fieldLabel}>Farbnummer</Text>
              <TextInput style={styles.input} value={form.colorNumber} onChangeText={v => setForm(f => ({ ...f, colorNumber: v }))} placeholder="z.B. 12" placeholderTextColor={C.textLight} />
            </>}

            <Text style={styles.fieldLabel}>Wo gekauft (Shop / URL)</Text>
            <TextInput style={styles.input} value={form.shop} onChangeText={v => setForm(f => ({ ...f, shop: v }))} placeholder="z.B. Wolle & Design, Amazon..." autoCapitalize="none" placeholderTextColor={C.textLight} />

            <Text style={styles.fieldLabel}>Tags</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {allTags.map(tag => {
                const active = (form.tags || []).includes(tag);
                return (
                  <TouchableOpacity key={tag} style={[styles.brandChip, active && styles.brandChipActive]} onPress={() => setForm(f => ({ ...f, tags: active ? f.tags.filter(t => t !== tag) : [...(f.tags || []), tag] }))}>
                    <Text style={[styles.brandChipText, active && styles.brandChipTextActive]}>#{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput style={styles.input} placeholder="Neuer Tag z.B. Weihnachten" placeholderTextColor={C.textLight}
              onSubmitEditing={e => { const t = e.nativeEvent.text.trim(); if (t && !(form.tags || []).includes(t)) setForm(f => ({ ...f, tags: [...(f.tags || []), t] })); }}
              returnKeyType="done" />

            <Text style={styles.fieldLabel}>Preis (€) *</Text>
            <TextInput style={styles.input} value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v.replace(',', '.') }))} placeholder="z.B. 4.50" keyboardType="decimal-pad" placeholderTextColor={C.textLight} />

            {form.materialType === 'yarn' && (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Gramm</Text>
                  <TextInput style={styles.input} value={form.grams} onChangeText={v => setForm(f => ({ ...f, grams: v }))} placeholder="z.B. 100" keyboardType="decimal-pad" placeholderTextColor={C.textLight} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Meter</Text>
                  <TextInput style={styles.input} value={form.meters} onChangeText={v => setForm(f => ({ ...f, meters: v }))} placeholder="z.B. 200" keyboardType="decimal-pad" placeholderTextColor={C.textLight} />
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>{form.materialType === 'item' ? 'Stückzahl pro Packung' : 'Anzahl Knäuel'}</Text>
            <TextInput style={styles.input} value={form.quantity} onChangeText={v => setForm(f => ({ ...f, quantity: v }))} placeholder="z.B. 20" keyboardType="number-pad" placeholderTextColor={C.textLight} />

            <Text style={styles.fieldLabel}>Lagerbestand</Text>
            <TextInput style={styles.input} value={form.stock} onChangeText={v => setForm(f => ({ ...f, stock: v }))} placeholder="z.B. 5" keyboardType="number-pad" placeholderTextColor={C.textLight} />

            <Text style={styles.fieldLabel}>Mindestbestand (Warnung ab)</Text>
            <TextInput style={styles.input} value={form.minStock} onChangeText={v => setForm(f => ({ ...f, minStock: v }))} placeholder="z.B. 2" keyboardType="number-pad" placeholderTextColor={C.textLight} />

            <TouchableOpacity
              style={[styles.wishlistBtn, { borderColor: form.wishlist ? '#F57F17' : C.border, backgroundColor: form.wishlist ? '#FFF9C4' : C.card }]}
              onPress={() => setForm(f => ({ ...f, wishlist: !f.wishlist }))}
            >
              <Text style={[styles.wishlistBtnText, { color: form.wishlist ? '#F57F17' : C.textLight }]}>
                {form.wishlist ? '⭐ Auf Wunschliste' : '☆ Zur Wunschliste hinzufügen'}
              </Text>
            </TouchableOpacity>

            {/* Foto hinzufügen */}
            <Text style={styles.fieldLabel}>📷 Foto hinzufügen</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.photoBtn, { borderColor: C.border, backgroundColor: C.card, flex: 1 }]}
                onPress={() => pickPhoto(true)}
              >
                <Text style={[styles.photoBtnText, { color: C.text }]}>📷 Kamera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, { borderColor: C.border, backgroundColor: C.card, flex: 1 }]}
                onPress={() => pickPhoto(false)}
              >
                <Text style={[styles.photoBtnText, { color: C.text }]}>🖼 Galerie</Text>
              </TouchableOpacity>
            </View>

            {/* Foto-Galerie im Modal */}
            {form.photos.length > 0 && (
              <FlatList
                horizontal
                data={form.photos}
                keyExtractor={(uri, idx) => uri + idx}
                style={{ marginTop: 12 }}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: uri, index }) => (
                  <View style={{ marginRight: 8, position: 'relative' }}>
                    <Image source={{ uri }} style={{ width: 120, height: 120, borderRadius: 10 }} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.photoDeleteBtn}
                      onPress={() => setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }))}
                    >
                      <Text style={styles.photoDeleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            {/* Verwendet in Aufträgen */}
            <Text style={styles.fieldLabel}>📋 Verwendet in Aufträgen</Text>
            <View style={[styles.usageBox, { backgroundColor: C.card, borderColor: C.border }]}>
              {usageAnalytics && (
                <>
                  {usageAnalytics.totalUsed > 0 && (
                    <Text style={{ fontSize: 13, color: C.textLight, marginBottom: 2 }}>
                      Gesamt verwendet: {usageAnalytics.totalUsed}
                    </Text>
                  )}
                  {usageAnalytics.ordersUsedIn.length > 0 && (
                    <Text style={{ fontSize: 13, color: C.textLight, marginBottom: 2 }}>
                      Ø pro Auftrag: {usageAnalytics.averagePerOrder.toFixed(1)}
                    </Text>
                  )}
                  {usageAnalytics.lastUsed && (
                    <Text style={{ fontSize: 13, color: C.textLight, marginBottom: 6 }}>
                      Zuletzt: {new Date(usageAnalytics.lastUsed).toLocaleDateString('de-DE')}
                    </Text>
                  )}
                </>
              )}
              {orderUsage.length === 0
                ? <Text style={[styles.usageEmpty, { color: C.textLight }]}>Noch nicht verwendet</Text>
                : orderUsage.map((name, i) => (
                  <Text key={i} style={[styles.usageItem, { color: C.text }]}>• {name}</Text>
                ))
              }
            </View>
            </>}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabBtnText: { fontSize: 13, fontWeight: '600' },
  cartBtn: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cartIcon: { fontSize: 20 },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: C.danger, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  warnBox: { margin: 12, marginBottom: 0, borderRadius: 10, padding: 10, borderWidth: 1 },
  warnText: { fontSize: 13, color: '#856404' },
  typePickerBox: { paddingVertical: 16 },
  typePickerTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  typeBtn: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  typeBtnIcon: { fontSize: 32, marginBottom: 6 },
  typeBtnText: { fontSize: 16, fontWeight: '700' },
  typeBtnSub: { fontSize: 13, marginTop: 3 },
  wishlistBtnText: { fontSize: 15, fontWeight: '600' },
  wishlistBtn: { marginTop: 16, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  filterBar: {
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: 1, gap: 6,
  },
  filterBtnRow: { flexDirection: 'row', gap: 8 },
  activeChipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6,
  },
  filterBtn4: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4,
    position: 'relative',
  },
  filterBtn4Icon: { fontSize: 16 },
  filterBtn4Label: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  filterBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: C.danger, borderRadius: 10,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  activeChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  activeChipText: { fontSize: 13, fontWeight: '600' },
  filterChipX: { fontSize: 12, color: '#fff', fontWeight: '700', marginLeft: 2 },
  filterChipArrow: { fontSize: 11, marginLeft: 2 },
  filterChip: { borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  filterChipText: { fontSize: 15, fontWeight: '600' },
  search: { padding: 12, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, fontSize: 15, color: C.text },
  card: { backgroundColor: C.card, borderRadius: 14, marginHorizontal: 12, marginBottom: 10, padding: 16, borderWidth: 1, borderColor: C.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  cardName: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  yarnBadge: { backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  yarnBadgeText: { fontSize: 12, color: C.primary, fontWeight: '600' },
  cardBrand: { fontSize: 13, color: C.textLight, marginTop: 4 },
  cardColor: { fontSize: 13, color: C.textLight, marginTop: 4 },
  cardPrice: { fontSize: 18, fontWeight: '700', color: C.primary, marginLeft: 12 },
  cardTags: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  tag: { backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: C.primary, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 60 },
  emptyLabel: { fontSize: 18, fontWeight: '700', color: C.text, marginTop: 12 },
  emptyHint: { fontSize: 14, color: C.textLight, marginTop: 6 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: C.primary, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300', lineHeight: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card, paddingTop: 52 },
  modalCancel: { color: C.textLight, fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  modalSave: { color: C.primary, fontSize: 16, fontWeight: '700' },
  modalBody: { flex: 1, backgroundColor: C.background, padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 8, marginTop: 20 },
  yarnTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yarnTypeBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.card },
  yarnTypeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  yarnTypeBtnText: { fontSize: 14, color: C.text },
  yarnTypeBtnTextActive: { color: '#fff', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 13, fontSize: 15, backgroundColor: C.card, color: C.text },
  row: { flexDirection: 'row' },
  brandChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  brandChip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.card },
  brandChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  brandChipText: { fontSize: 14, color: C.text },
  brandChipTextActive: { color: '#fff', fontWeight: '700' },
  photoBtn: { borderWidth: 1, borderRadius: 12, padding: 13, alignItems: 'center' },
  photoBtnText: { fontSize: 15, fontWeight: '600' },
  photoDeleteBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  photoDeleteText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  usageBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 4 },
  usageEmpty: { fontSize: 14, fontStyle: 'italic' },
  usageItem: { fontSize: 14, marginBottom: 4 },
});
