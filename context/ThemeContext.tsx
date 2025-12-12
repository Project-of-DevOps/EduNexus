import React, { createContext, useContext, useEffect, useState } from 'react';

// ThemeContext: Manages dynamic theme switching and CSS variables

// Color Palettes
const palettes = {
  'Ocean Depth': {
    primary: '#3B82F6',
    background: '#172554',
    surface: '#1E3A8A',
    textMain: '#EFF6FF',
    textSecondary: '#BFDBFE',
    accentTint: '#1E40AF'
  },
  'Deep Emerald': {
    primary: '#10B981',
    background: '#064E3B',
    surface: '#065F46',
    textMain: '#ECFDF5',
    textSecondary: '#A7F3D0',
    accentTint: '#047857'
  },
  'Burnt Sienna': {
    primary: '#D97706',
    background: '#451A03',
    surface: '#78350F',
    textMain: '#FFFBEB',
    textSecondary: '#FDE68A',
    accentTint: '#92400E'
  },
  'Royal Raspberry': {
    primary: '#EC4899',
    background: '#831843',
    surface: '#9D174D',
    textMain: '#FDF2F8',
    textSecondary: '#FBCFE8',
    accentTint: '#BE185D'
  },
  'Iron Gunmetal': {
    primary: '#334155',
    background: '#E2E8F0',
    surface: '#CBD5E1', // Correct Grey
    textMain: '#0F172A',
    textSecondary: '#475569',
    accentTint: '#94A3B8'
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
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('Ocean Depth');

  useEffect(() => {
    const theme = palettes[currentTheme];
    const root = document.documentElement;

    // Apply CSS Variables
    root.style.setProperty('--primary-color', hexToRgb(theme.primary));
    root.style.setProperty('--background-color', hexToRgb(theme.background));

    // Map 'surface' to --surface-color AND --foreground-color (for Sidebars/Cards)
    const surfaceRgb = hexToRgb(theme.surface);
    root.style.setProperty('--surface-color', surfaceRgb);
    root.style.setProperty('--foreground-color', surfaceRgb);

    root.style.setProperty('--text-color', hexToRgb(theme.textMain));
    root.style.setProperty('--text-secondary-color', hexToRgb(theme.textSecondary));
    root.style.setProperty('--accent-tint-color', hexToRgb(theme.accentTint));

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
