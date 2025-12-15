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
    accentTint: '#1E40AF',
    highlight: '#22D3EE', // Cyan-400
    subtle: '#172554', // Match background for subtle areas in dark mode
    border: '#1E40AF'
  },
  'Deep Emerald': {
    primary: '#10B981',
    background: '#D1FAE5', // Emerald-100 (Slightly Darker than 50)
    surface: '#ECFDF5',    // Emerald-50 (Sidebar/Cards)
    textMain: '#064E3B',   // Dark Green (Emerald-900)
    textSecondary: '#065F46', // Emerald-800
    accentTint: '#A7F3D0',
    highlight: '#059669', // Emerald-600
    subtle: '#D1FAE5',
    border: '#A7F3D0'
  },
  'Burnt Sienna': {
    primary: '#D97706',
    background: '#FFFBEB', // Amber-50 (Keep Light)
    surface: '#FFFBEB',    // Amber-50 (Sidebar color matches BG)
    textMain: '#78350F',   // Dark Amber (Amber-900)
    textSecondary: '#92400E', // Amber-800
    accentTint: '#FEF3C7',
    highlight: '#D97706', // Amber-600
    subtle: '#FFFBEB',
    border: '#FEF3C7'
  },
  'Royal Raspberry': {
    primary: '#EC4899',
    background: '#FCE7F3', // Pink-100 (Slightly Darker than 50)
    surface: '#FDF2F8',    // Pink-50 (Sidebar/Cards)
    textMain: '#831843',   // Dark Pink (Pink-900)
    textSecondary: '#9D174D', // Pink-800
    accentTint: '#FBCFE8',
    highlight: '#DB2777', // Pink-600
    subtle: '#FCE7F3',
    border: '#FBCFE8'
  },
  'Iron Gunmetal': {
    primary: '#94A3B8',    // Slate-400 (Lighter for dark bg)
    background: '#0F172A', // Slate-900 (Dark Mode)
    surface: '#1E293B',    // Slate-800
    textMain: '#F8FAFC',   // Slate-50
    textSecondary: '#CBD5E1', // Slate-300
    accentTint: '#334155',
    highlight: '#38BDF8',  // Sky-400 (Vibrant)
    subtle: '#0F172A',
    border: '#334155'
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
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    // Load persisted theme
    const saved = localStorage.getItem('theme');
    if (saved && palettes[saved as ThemeName]) {
      return saved as ThemeName;
    }
    return 'Ocean Depth';
  });

  useEffect(() => {
    // Save theme persistence
    localStorage.setItem('theme', currentTheme);

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
    root.style.setProperty('--subtle-background-color', hexToRgb(theme.subtle));
    root.style.setProperty('--input-bg', hexToRgb(theme.subtle)); // Fix for Input components
    root.style.setProperty('--border-color', hexToRgb(theme.border));
    root.style.setProperty('--highlight-color', hexToRgb(theme.highlight));


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
