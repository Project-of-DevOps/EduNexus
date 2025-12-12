import React, { createContext, useContext, useEffect, useState } from 'react';

// Color Palettes
const palettes = {
  'Ocean Blue': {
    primary: '#2563EB',
    background: '#EFF6FF',
    surface: '#FFFFFF',
    textMain: '#1E293B',
    textSecondary: '#64748B',
    accentTint: '#DBEAFE'
  },
  'Midnight Slate': {
    primary: '#3B82F6',
    background: '#0F172A',
    surface: '#1E293B',
    textMain: '#F8FAFC',
    textSecondary: '#94A3B8',
    accentTint: '#334155'
  },
  'Berry Rose': {
    primary: '#BE185D',
    background: '#FDF2F8',
    surface: '#FFFFFF',
    textMain: '#1E293B',
    textSecondary: '#64748B',
    accentTint: '#FCE7F3'
  },
  'Forest Emerald': {
    primary: '#059669',
    background: '#ECFDF5',
    surface: '#FFFFFF',
    textMain: '#064E3B',
    textSecondary: '#64748B',
    accentTint: '#D1FAE5'
  },
  'Autumn Bronze': {
    primary: '#92400E',
    background: '#FFFBEB',
    surface: '#FFFFFF',
    textMain: '#451A03',
    textSecondary: '#78350F',
    accentTint: '#FEF3C7'
  }
};

type ThemeName = keyof typeof palettes;

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  availableThemes: ThemeName[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to convert Hex to Space-Separated RGB (for Tailwind opacity support)
const hexToRgb = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('Ocean Blue');

  useEffect(() => {
    const theme = palettes[currentTheme];
    const root = document.documentElement;

    // Apply CSS Variables
    // Note: The existing app uses --primary-color, --background-color defined in index.html
    // We will override these.

    root.style.setProperty('--primary-color', hexToRgb(theme.primary));
    root.style.setProperty('--background-color', hexToRgb(theme.background));
    root.style.setProperty('--surface-color', hexToRgb(theme.surface)); // New
    // Mapping textMain to --text-color
    root.style.setProperty('--text-color', hexToRgb(theme.textMain));
    // Mapping textSecondary to --text-secondary-color
    root.style.setProperty('--text-secondary-color', hexToRgb(theme.textSecondary));

    // Add accent tint as a new variable or map to existing if appropriate
    root.style.setProperty('--accent-tint-color', hexToRgb(theme.accentTint));

    // Optional: Update meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.primary);
    }

  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      setTheme: setCurrentTheme,
      availableThemes: Object.keys(palettes) as ThemeName[]
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
