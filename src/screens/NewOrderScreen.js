import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { loadOrders, saveOrders } from '../storage';
import { useTheme } from '../ThemeContext';

const makeStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background, padding: 20 },
  label: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: C.card, color: C.text },
  sourceChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  sourceChipText: { fontSize: 14, fontWeight: '600' },
  btn: { marginTop: 28, backgroundColor: C.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default function NewOrderScreen({ navigate }) {
  const { colors: C } = useTheme();
  const styles = makeStyles(C);
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [description, setDescription] = useState('');
  const [pattern, setPattern] = useState('');
  const [source, setSource] = useState('');

  const SOURCES = ['Etsy', 'Instagram', 'WhatsApp', 'Persönlich', 'Vinted', 'Sonstiges'];

  const create = async () => {
    if (!name.trim()) {
      Alert.alert('Pflichtfeld', 'Bitte einen Auftragsnamen eingeben.');
      return;
    }
    const orders = await loadOrders();
    const newOrder = {
      id: Date.now().toString(),
      name: name.trim(),
      customer: customer.trim(),
      description: description.trim(),
      pattern: pattern.trim(),
      source: source.trim(),
      status: 'offen',
      timeSeconds: 0,
      materials: [],
      createdAt: new Date().toISOString(),
    };
    await saveOrders([newOrder, ...orders]);
    navigate('list');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Auftragsname *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="z.B. Babymütze rosa" placeholderTextColor={C.textLight} />
      <Text style={styles.label}>Kunde (optional)</Text>
      <TextInput style={styles.input} value={customer} onChangeText={setCustomer} placeholder="z.B. Maria M." placeholderTextColor={C.textLight} />
      <Text style={styles.label}>Woher kommt der Auftrag?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {SOURCES.map(s => (
          <TouchableOpacity key={s}
            style={[styles.sourceChip, { borderColor: source === s ? C.primary : C.border, backgroundColor: source === s ? C.primary : C.card }]}
            onPress={() => setSource(source === s ? '' : s)}>
            <Text style={[styles.sourceChipText, { color: source === s ? '#fff' : C.text }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} value={source} onChangeText={setSource} placeholder="Oder eigene Eingabe..." placeholderTextColor={C.textLight} />
      <Text style={styles.label}>Beschreibung (optional)</Text>
      <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Details zum Auftrag..." multiline placeholderTextColor={C.textLight} />
      <Text style={styles.label}>Anleitung (optional)</Text>
      <TextInput style={styles.input} value={pattern} onChangeText={setPattern} placeholder="Name oder Link z.B. https://ravelry.com/..." placeholderTextColor={C.textLight} autoCapitalize="none" />
      <TouchableOpacity style={styles.btn} onPress={create}>
        <Text style={styles.btnText}>Auftrag erstellen</Text>
      </TouchableOpacity>
    </ScrollView>
    </TouchableWithoutFeedback>
  );
}
