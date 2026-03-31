import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {useColorScheme} from 'react-native';
import {
  DefaultTheme,
  DarkTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
  navigationTheme: NavigationTheme;
  colors: {
    background: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
    primary: string;
    danger: string;
  };
}

const light = {
  background: '#FFFFFF',
  card: '#F2F2F7',
  text: '#000000',
  subtext: '#8E8E93',
  border: '#C7C7CC',
  primary: '#007AFF',
  danger: '#FF3B30',
};

const dark = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  subtext: '#8E8E93',
  border: '#38383A',
  primary: '#0A84FF',
  danger: '#FF453A',
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggleTheme: () => {},
  navigationTheme: DefaultTheme,
  colors: light,
});

export function ThemeProvider({children}: {children: ReactNode}) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<'light' | 'dark' | null>(null);

  const isDark = override ? override === 'dark' : systemScheme === 'dark';

  const toggleTheme = useCallback(() => {
    setOverride(prev => {
      if (prev === null) {
        return isDark ? 'light' : 'dark';
      }
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [isDark]);

  const navigationTheme: NavigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: dark.background,
          card: dark.card,
          text: dark.text,
          border: dark.border,
          primary: dark.primary,
          notification: dark.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: light.background,
          card: light.card,
          text: light.text,
          border: light.border,
          primary: light.primary,
          notification: light.primary,
        },
      };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme,
        navigationTheme,
        colors: isDark ? dark : light,
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
