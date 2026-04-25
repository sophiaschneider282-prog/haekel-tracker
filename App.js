import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import OrderListScreen from './src/screens/OrderListScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import NewOrderScreen from './src/screens/NewOrderScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MaterialsDBScreen from './src/screens/MaterialsDBScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CustomersScreen from './src/screens/CustomersScreen';

function Main() {
  const { colors: C, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState('list');
  const [params, setParams] = useState({});
  const [tab, setTab] = useState('orders');
  const [showLog, setShowLog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = (s, p = {}) => { setScreen(s); setParams(p); setShowLog(false); };
  const goBack = () => { setScreen('list'); setRefreshKey(k => k + 1); };
  const titles = { list: '🧶 Meine Aufträge', detail: 'Auftrag', newOrder: 'Neuer Auftrag', settings: '⚙️ Einstellungen', materials: '🧺 Materialien' };
  const showBack = screen === 'detail' || screen === 'newOrder';

  const renderScreen = () => {
    if (tab === 'settings') return <SettingsScreen />;
    if (tab === 'materials') return <MaterialsDBScreen />;
    if (tab === 'dashboard') return <DashboardScreen />;
    if (tab === 'customers') return <CustomersScreen />;
    if (screen === 'detail') return <OrderDetailScreen navigate={(s, p) => { if (s === 'list') goBack(); else navigate(s, p); }} params={params} showLog={showLog} onLogClose={() => setShowLog(false)} onOpenLog={() => setShowLog(true)} />;
    if (screen === 'newOrder') return <NewOrderScreen navigate={(s, p) => { if (s === 'list') goBack(); else navigate(s, p); }} />;
    return <OrderListScreen key={refreshKey} navigate={navigate} />;
  };

  const switchTab = (t) => { setTab(t); setScreen('list'); setParams({}); };
  const currentTitle = tab === 'settings' ? '⚙️ Einstellungen' : tab === 'materials' ? '🧺 Materialien' : tab === 'dashboard' ? '📊 Übersicht' : tab === 'customers' ? '👤 Kunden' : titles[screen];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <View style={[styles.header, { backgroundColor: C.primary, paddingTop: insets.top + 10 }]}>
        {showBack && tab === 'orders' ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Zurück</Text>
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}
        <Text style={styles.headerTitle}>{currentTitle}</Text>
        <View style={styles.backBtn} />
      </View>
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>
      <View style={[styles.tabBar, { backgroundColor: C.card, borderTopColor: C.border, paddingBottom: insets.bottom || 16 }]}>
        {[
          { key: 'orders', label: 'Aufträge', icon: '🧶' },
          { key: 'dashboard', label: 'Übersicht', icon: '📊' },
          { key: 'customers', label: 'Kunden', icon: '👤' },
          { key: 'materials', label: 'Materialien', icon: '🧺' },
          { key: 'settings', label: 'Einstellungen', icon: '⚙️' },
        ].map(t => (
          <TouchableOpacity key={t.key} style={styles.tabItem} onPress={() => switchTab(t.key)}>
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, { color: tab === t.key ? C.primary : C.textLight }, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Main />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 14,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
  },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  backBtn: { width: 80 },
  backText: { color: '#fff', fontSize: 17 },
  logBtn: { alignItems: 'flex-end' },
  logBtnText: { fontSize: 22 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1, paddingBottom: 24, paddingTop: 6,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 11, marginTop: 2 },
  tabLabelActive: { fontWeight: '700' },
});
