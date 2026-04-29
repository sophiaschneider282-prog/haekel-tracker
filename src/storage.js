import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const ORDERS_KEY = 'haekel_orders';
const SETTINGS_KEY = 'haekel_settings';
const MATERIALS_KEY = 'haekel_materials';
const AUTO_BACKUP_PATH = FileSystem.documentDirectory + 'haekel-auto-backup.json';

async function autoBackup() {
  try {
    const orders = await loadOrders();
    const materials = await loadMaterials();
    const settings = await loadSettings();
    const backup = { version: 1, exportedAt: new Date().toISOString(), orders, materials, settings };
    await FileSystem.writeAsStringAsync(AUTO_BACKUP_PATH, JSON.stringify(backup));
  } catch {}
}

export async function loadOrders() {
  try { const j = await AsyncStorage.getItem(ORDERS_KEY); return j ? JSON.parse(j) : []; } catch { return []; }
}
export async function saveOrders(orders) {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  autoBackup();
}

export async function loadSettings() {
  try { const j = await AsyncStorage.getItem(SETTINGS_KEY); return j ? JSON.parse(j) : { markup: 50 }; } catch { return { markup: 50 }; }
}
export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadMaterials() {
  try { const j = await AsyncStorage.getItem(MATERIALS_KEY); return j ? JSON.parse(j) : []; } catch { return []; }
}
export async function saveMaterials(materials) {
  await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
  autoBackup();
}

export async function exportBackup() {
  const orders = await loadOrders();
  const materials = await loadMaterials();
  const settings = await loadSettings();
  const backup = { version: 1, exportedAt: new Date().toISOString(), orders, materials, settings };
  const filename = `haekel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const path = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(backup, null, 2));
  await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Backup speichern' });
}

export async function importBackup() {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (result.canceled || !result.assets?.[0]) return null;
  const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
  const backup = JSON.parse(content);
  if (!backup.version || !backup.orders) throw new Error('Ungültige Backup-Datei');
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(backup.orders));
  await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(backup.materials || []));
  if (backup.settings) await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings));
  return backup;
}

export async function restoreAutoBackup() {
  const info = await FileSystem.getInfoAsync(AUTO_BACKUP_PATH);
  if (!info.exists) throw new Error('Kein automatisches Backup gefunden.');
  const content = await FileSystem.readAsStringAsync(AUTO_BACKUP_PATH);
  const backup = JSON.parse(content);
  if (!backup.version || !backup.orders) throw new Error('Backup beschädigt.');
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(backup.orders));
  await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(backup.materials || []));
  if (backup.settings) await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings));
  return backup;
}

export async function savePhotoForMaterial(materialId, sourceUri) {
  const dir = FileSystem.documentDirectory + `material-photos/${materialId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = dir + `${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deletePhotosForMaterial(materialId) {
  const dir = FileSystem.documentDirectory + `material-photos/${materialId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}
