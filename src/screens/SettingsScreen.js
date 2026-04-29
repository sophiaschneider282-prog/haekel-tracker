import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView, Keyboard } from 'react-native';
import { loadSettings, saveSettings, exportBackup, importBackup, restoreAutoBackup } from '../storage';
import { useTheme } from '../ThemeContext';

export default function SettingsScreen() {
  const { colors: C, dark, toggleDark } = useTheme();
  const styles = makeStyles(C);
  const [markup, setMarkup] = useState('50');
  const [hourlyWage, setHourlyWage] = useState('0');
  const [exportPDF, setExportPDF] = useState(true);
  const [includePriceDetails, setIncludePriceDetails] = useState(true);

  useEffect(() => {
    loadSettings().then(s => {
      setMarkup(String(s.markup ?? 50));
      setHourlyWage(String(s.hourlyWage ?? 0));
      setExportPDF((s.exportPreferences?.defaultFormat ?? 'pdf') === 'pdf');
      setIncludePriceDetails(s.exportPreferences?.includePriceDetails ?? true);
    });
  }, []);

  const save = async () => {
    Keyboard.dismiss();
    const val = parseFloat(markup);
    if (isNaN(val) || val < 0) {
      Alert.alert('Ungültig', 'Bitte einen gültigen Prozentsatz eingeben.');
      return;
    }
    const wage = parseFloat(hourlyWage);
    if (isNaN(wage) || wage < 0) {
      Alert.alert('Ungültig', 'Bitte einen gültigen Stundenlohn eingeben.');
      return;
    }
    await saveSettings({
      markup: val,
      hourlyWage: wage,
      exportPreferences: {
        defaultFormat: exportPDF ? 'pdf' : 'text',
        includePriceDetails,
      },
    });
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

      <Text style={[styles.label, { marginTop: 24 }]}>Stundenlohn (€/h)</Text>
      <TextInput
        style={styles.input}
        value={hourlyWage}
        onChangeText={setHourlyWage}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        placeholder="z.B. 15"
        placeholderTextColor={C.textLight}
      />

      <TouchableOpacity style={styles.btn} onPress={save}>
        <Text style={styles.btnText}>Speichern</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={[styles.label, { marginBottom: 16 }]}>Export-Einstellungen</Text>

      <View style={[styles.row, { marginBottom: 12 }]}>
        <View>
          <Text style={styles.rowLabel}>Standard-Export: PDF</Text>
          <Text style={styles.rowSub}>{exportPDF ? 'PDF' : 'Text'}</Text>
        </View>
        <Switch
          value={exportPDF}
          onValueChange={setExportPDF}
          trackColor={{ false: C.border, true: C.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.rowLabel}>Preisdetails im Export anzeigen</Text>
          <Text style={styles.rowSub}>Kostenaufschlüsselung einschließen</Text>
        </View>
        <Switch
          value={includePriceDetails}
          onValueChange={setIncludePriceDetails}
          trackColor={{ false: C.border, true: C.primary }}
          thumbColor="#fff"
        />
      </View>

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

      <View style={styles.divider} />

      <Text style={[styles.label, { marginBottom: 16 }]}>Daten</Text>

      <TouchableOpacity style={[styles.btn, { backgroundColor: C.success + '22', borderWidth: 1, borderColor: C.success }]}
        onPress={() => {
          Alert.alert(
            '🔄 Auto-Backup wiederherstellen',
            'Das letzte automatische Backup wird wiederhergestellt. Aktuelle Daten werden überschrieben.',
            [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Wiederherstellen', onPress: async () => {
                try {
                  const backup = await restoreAutoBackup();
                  Alert.alert('✅ Fertig', `${backup.orders.length} Aufträge wiederhergestellt.\nStand: ${new Date(backup.exportedAt).toLocaleString('de-DE')}`);
                } catch (e) {
                  Alert.alert('Fehler', e.message);
                }
              }}
            ]
          );
        }}>
        <Text style={[styles.btnText, { color: C.success }]}>🔄 Auto-Backup wiederherstellen</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginTop: 12 }]}
        onPress={async () => {
          try {
            await exportBackup();
          } catch (e) {
            Alert.alert('Fehler', 'Export fehlgeschlagen: ' + e.message);
          }
        }}>
        <Text style={[styles.btnText, { color: C.primary }]}>📤 Daten exportieren</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginTop: 12 }]}
        onPress={() => {
          Alert.alert(
            'Daten importieren',
            'Alle aktuellen Daten werden überschrieben. Fortfahren?',
            [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Importieren', onPress: async () => {
                try {
                  const backup = await importBackup();
                  if (backup) Alert.alert('✅ Fertig', `${backup.orders.length} Aufträge und ${(backup.materials || []).length} Materialien wiederhergestellt.`);
                } catch (e) {
                  Alert.alert('Fehler', 'Import fehlgeschlagen: ' + e.message);
                }
              }}
            ]
          );
        }}>
        <Text style={[styles.btnText, { color: C.primary }]}>📥 Daten importieren</Text>
      </TouchableOpacity>
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
