import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'haekel_darkmode';

export const LIGHT = {
  primary: '#C2185B',
  primaryLight: '#F8BBD9',
  background: '#FFF9FB',
  card: '#FFFFFF',
  text: '#2D2D2D',
  textLight: '#888',
  border: '#F0D6E4',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#E53935',
};

export const DARK = {
  primary: '#E91E8C',
  primaryLight: '#5C2347',
  background: '#121212',
  card: '#1E1E1E',
  text: '#F5F5F5',
  textLight: '#C0C0C0',
  border: '#3A3A3A',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#E53935',
};

const ThemeContext = createContext({ dark: false, colors: LIGHT, toggleDark: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(v => { if (v === 'true') setDark(true); });
  }, []);

  const toggleDark = async () => {
    const next = !dark;
    setDark(next);
    await AsyncStorage.setItem(THEME_KEY, String(next));
  };

  return (
    <ThemeContext.Provider value={{ dark, colors: dark ? DARK : LIGHT, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
