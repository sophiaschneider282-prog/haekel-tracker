import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView, Keyboard } from 'react-native';
import { loadSettings, saveSettings } from '../storage';
import { useTheme } from '../ThemeContext';

export default function SettingsScreen() {
  const { colors: C, dark, toggleDark } = useTheme();
  const styles = makeStyles(C);
  const [markup, setMarkup] = useState('50');

  useEffect(() => {
    loadSettings().then(s => setMarkup(String(s.markup)));
  }, []);

  const save = async () => {
    Keyboard.dismiss();
    const val = parseFloat(markup);
    if (isNaN(val) || val < 0) {
      Alert.alert('Ungültig', 'Bitte einen gültigen Prozentsatz eingeben.');
      return;
    }
    await saveSettings({ markup: val });
    Alert.alert('Gespeichert', `Aufschlag: ${val}%`);
  };

  const example = (10 * (1 + parseFloat(markup || 0) / 100)).toFixed(2);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Standard-Aufschlag (%)</Text>
      <TextInput
        style={styles.input}
        value={markup}
        onChangeText={setMarkup}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        placeholder="z.B. 50"
        placeholderTextColor={C.textLight}
      />
      <Text style={styles.hint}>
        Beispiel: 10€ + {markup}% = {example}€
      </Text>
      <TouchableOpacity style={styles.btn} onPress={save}>
        <Text style={styles.btnText}>Speichern</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View>
          <Text style={styles.rowLabel}>Dark Mode</Text>
          <Text style={styles.rowSub}>Dunkles Erscheinungsbild</Text>
        </View>
        <Switch
          value={dark}
          onValueChange={toggleDark}
          trackColor={{ false: C.border, true: C.primary }}
          thumbColor="#fff"
        />
      </View>
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: { padding: 24 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: C.text },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 18, borderColor: C.border, backgroundColor: C.card, color: C.text },
  hint: { marginTop: 8, fontSize: 14, color: C.textLight },
  btn: { marginTop: 20, borderRadius: 12, padding: 16, alignItems: 'center', backgroundColor: C.primary },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  divider: { borderTopWidth: 1, marginVertical: 28, borderColor: C.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: 16, borderWidth: 1, backgroundColor: C.card, borderColor: C.border },
  rowLabel: { fontSize: 16, fontWeight: '600', color: C.text },
  rowSub: { fontSize: 13, marginTop: 2, color: C.textLight },
});
