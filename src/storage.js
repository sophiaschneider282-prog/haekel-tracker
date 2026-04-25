import AsyncStorage from '@react-native-async-storage/async-storage';

const ORDERS_KEY = 'haekel_orders';
const SETTINGS_KEY = 'haekel_settings';
const MATERIALS_KEY = 'haekel_materials';

export async function loadOrders() {
  try {
    const json = await AsyncStorage.getItem(ORDERS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveOrders(orders) {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export async function loadSettings() {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json ? JSON.parse(json) : { markup: 50 };
  } catch {
    return { markup: 50 };
  }
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadMaterials() {
  try {
    const json = await AsyncStorage.getItem(MATERIALS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveMaterials(materials) {
  await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
}
