import type { ReactNode } from "react"
import { createContext, useState, useContext, useEffect } from "react"
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const themeStyles = ['light', 'dark', 'system'] as const;
type Theme = typeof themeStyles[number];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: typeof themes[keyof typeof themes];
  systemTheme: 'light' | 'dark';
}

// Define base themes
const themes = {
  light: {
    primary: "#FFFFFF",
    secondary: "#10B981",    // Modern emerald green
    background: "#F4F4F5",   // Light gray background
    surface: "#FFFFFF",      // White surface for contrast
    surfaceContainer: "#FFFFFF",  // For cards and elevated surfaces
    surfaceContainerLow: "#FAFAFA",  // For subtle elevation
    surfaceContainerHigh: "#F1F5F9", // For more prominent containers
    textPrimary: "#1F2937",  // Dark gray for better readability
    textSecondary: "#4B5563",
    highlight: "#10B981",    // Matching secondary color
    border: "#E5E7EB",
    success: "#34D399",
    error: "#EF4444",
    warning: "#F59E0B",
    labelPrimary: "#1F2937",
    labelSecondary: "#4B5563",
    labelTertiary: "#9CA3AF",
    labelDisabled: "#D1D5DB"
  },
  dark: {
    primary: "#000000",
    secondary: "#34D399",    // Lighter emerald for dark theme
    background: "#000000",   // Pure black background
    surface: "#1F2937",      // Darker surface for contrast
    surfaceContainer: "#1F2937",  // For cards and elevated surfaces
    surfaceContainerLow: "#1a1a1a",  // For subtle elevation
    surfaceContainerHigh: "#2D3748", // For more prominent containers
    textPrimary: "#F9FAFB",
    textSecondary: "#E5E7EB",
    highlight: "#34D399",    // Matching secondary color
    border: "#374151",
    success: "#34D399",
    error: "#EF4444",
    warning: "#F59E0B",
    labelPrimary: "#F9FAFB",
    labelSecondary: "#E5E7EB",
    labelTertiary: "#9CA3AF",
    labelDisabled: "#4B5563"
  }
};

const THEME_STORAGE_KEY = '@app_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');

  // Load saved theme on mount
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && themeStyles.includes(savedTheme as Theme)) {
          setThemeState(savedTheme as Theme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadSavedTheme();
  }, []);

  // Save theme whenever it changes
  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Get the current system theme
  const currentSystemTheme = systemColorScheme || 'light';

  // Determine the active colors based on theme and system preference
  const activeColors = theme === 'system' 
    ? themes[currentSystemTheme]
    : themes[theme];

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme, 
        colors: activeColors,
        systemTheme: currentSystemTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
