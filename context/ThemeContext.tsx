
import React, { createContext, useState, useContext, ReactNode, useLayoutEffect } from 'react';

type Theme = 'light-white' | 'light-pink' | 'light-green' | 'light-brown' | 'black';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes: Record<Theme, Record<string, string>> = {
  'light-white': {
    '--primary-color': '96 165 250', '--primary-color-dark': '59 130 246', '--ring-color': '96 165 250',
    '--background-color': '243 244 246', '--foreground-color': '255 255 255', '--subtle-background-color': '249 250 251',
    '--text-color': '17 24 39', '--text-secondary-color': '75 85 99', '--primary-text-color': '255 255 255',
    '--border-color': '229 231 235',
    '--danger-color': '239 68 68', '--danger-color-dark': '220 38 38', '--danger-subtle-color': '254 226 226', '--danger-text-color': '153 27 27',
    '--success-color': '34 197 94', '--success-subtle-color': '220 252 231', '--success-text-color': '21 128 61',
    '--warning-color': '234 179 8', '--warning-subtle-color': '254 249 195', '--warning-text-color': '180 83 9',
  },
  'light-pink': {
    '--primary-color': '236 72 153', '--primary-color-dark': '219 39 119', '--ring-color': '236 72 153',
    '--background-color': '253 242 248', '--foreground-color': '255 255 255', '--subtle-background-color': '252 232 242',
    '--text-color': '131 24 67', '--text-secondary-color': '157 23 77', '--primary-text-color': '255 255 255',
    '--border-color': '251 207 232',
    '--danger-color': '239 68 68', '--danger-color-dark': '220 38 38', '--danger-subtle-color': '254 226 226', '--danger-text-color': '153 27 27',
    '--success-color': '34 197 94', '--success-subtle-color': '220 252 231', '--success-text-color': '21 128 61',
    '--warning-color': '234 179 8', '--warning-subtle-color': '254 249 195', '--warning-text-color': '180 83 9',
  },
  'light-green': {
    '--primary-color': '74 222 128', '--primary-color-dark': '34 197 94', '--ring-color': '74 222 128',
    '--background-color': '240 253 244', '--foreground-color': '255 255 255', '--subtle-background-color': '220 252 231',
    '--text-color': '21 94 53', '--text-secondary-color': '22 101 52', '--primary-text-color': '255 255 255',
    '--border-color': '187 247 208',
    '--danger-color': '239 68 68', '--danger-color-dark': '220 38 38', '--danger-subtle-color': '254 226 226', '--danger-text-color': '153 27 27',
    '--success-color': '34 197 94', '--success-subtle-color': '220 252 231', '--success-text-color': '21 128 61',
    '--warning-color': '234 179 8', '--warning-subtle-color': '254 249 195', '--warning-text-color': '180 83 9',
  },
  'light-brown': {
    '--primary-color': '202 138 4', '--primary-color-dark': '161 98 7', '--ring-color': '202 138 4',
    '--background-color': '254 252 232', '--foreground-color': '255 255 255', '--subtle-background-color': '254 249 195',
    '--text-color': '120 53 15', '--text-secondary-color': '124 45 18', '--primary-text-color': '255 255 255',
    '--border-color': '254 240 138',
    '--danger-color': '239 68 68', '--danger-color-dark': '220 38 38', '--danger-subtle-color': '254 226 226', '--danger-text-color': '153 27 27',
    '--success-color': '34 197 94', '--success-subtle-color': '220 252 231', '--success-text-color': '21 128 61',
    '--warning-color': '234 179 8', '--warning-subtle-color': '254 249 195', '--warning-text-color': '180 83 9',
  },
  'black': {
    '--primary-color': '96 165 250', '--primary-color-dark': '59 130 246', '--ring-color': '96 165 250',
    '--background-color': '17 24 39', '--foreground-color': '31 41 55', '--subtle-background-color': '55 65 81',
    '--text-color': '249 250 251', '--text-secondary-color': '156 163 175', '--primary-text-color': '255 255 255',
    '--border-color': '75 85 99',
    '--danger-color': '239 68 68', '--danger-color-dark': '220 38 38', '--danger-subtle-color': '153 27 27', '--danger-text-color': '254 226 226',
    '--success-color': '74 222 128', '--success-subtle-color': '22 101 52', '--success-text-color': '187 247 208',
    '--warning-color': '250 204 21', '--warning-subtle-color': '133 77 14', '--warning-text-color': '254 249 195',
  },
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light-white');

  useLayoutEffect(() => {
    const root = document.documentElement;
    const selectedTheme = themes[theme];
    for (const [key, value] of Object.entries(selectedTheme)) {
        root.style.setProperty(key, value);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
