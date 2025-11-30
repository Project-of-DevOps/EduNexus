
import React, { createContext, useState, useContext, ReactNode, useLayoutEffect } from 'react';

type Theme = 'white' | 'pink' | 'green' | 'brown' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

import { lightWhite, lightPink, lightGreen, lightBrown, black } from './themes';

const themes: Record<Theme, Record<string, string>> = {
  'white': lightWhite,
  'pink': lightPink,
  'green': lightGreen,
  'brown': lightBrown,
  'dark': black,
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('white');

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
