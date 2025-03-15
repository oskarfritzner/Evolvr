import type { ReactNode } from "react"
import { createContext, useState, useContext } from "react"

const themeStyles = ['modern', 'soft', 'chill', 'cyber', 'zen'] as const;

type Theme = typeof themeStyles[number];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colors: typeof themes[Theme];
}

const themes = {
  modern: {
    primary: "#0A0A0A",    // Darkest gray
    secondary: "#00E5FF",  // Brighter cyan
    background: "#000000", 
    surface: "#1A1A1A",    // Elevated surfaces
    textPrimary: "#FFFFFF", 
    textSecondary: "#B3B3B3",
    highlight: "#FF4D4D",  // Vibrant accent
    border: "#333333",
    success: "#00CC66",
    error: "#FF3333",
    warning: "#FFAA00",
    labelPrimary: "#FFFFFF",
    labelSecondary: "#CCCCCC",
    labelTertiary: "#999999",
    labelDisabled: "#4D4D4D"
  },
  soft: {
    primary: "#5B5B7A",    // Muted indigo
    secondary: "#A8A8C8",  // Soft periwinkle
    background: "#F5F5FF",  // Very light lavender
    surface: "#FFFFFF",
    textPrimary: "#3D3D5A",
    textSecondary: "#7A7A9A",
    highlight: "#A5D6A7",
    border: "#E0E0ED",
    success: "#7FBF7F",
    error: "#D87F7F",
    warning: "#E5C07F",
    labelPrimary: "#FFFFFF",
    labelSecondary: "#7A7A9A",
    labelTertiary: "#B3B3CC",
    labelDisabled: "#D0D0E0"
  },
  chill: {
    primary: "#2D5F5D",    // Deep teal
    secondary: "#5F9EA0",  // Cadet blue
    background: "#F0F8FF",  // Alice blue
    surface: "#FFFFFF",
    textPrimary: "#2D5F5D",
    textSecondary: "#5F9EA0",
    highlight: "#FFA07A",  // Light salmon
    border: "#B0C4DE",
    success: "#7FBF7F",
    error: "#D87F7F",
    warning: "#E5C07F",
    labelPrimary: "#FFFFFF",
    labelSecondary: "#5F9EA0",
    labelTertiary: "#8FBCBB",
    labelDisabled: "#C0D8D8"
  },
  cyber: {
    primary: "#000B1A",    // Deep space blue
    secondary: "#00FFFF",  // Neon cyan
    background: "#000000",
    surface: "#001A33",    // Dark blue
    textPrimary: "#FFFFFF",
    textSecondary: "#99FFFF",
    highlight: "#FF00FF",  // Neon magenta
    border: "#003366",
    success: "#00FF00",
    error: "#FF0066",
    warning: "#FFAA00",
    labelPrimary: "#FFFFFF",
    labelSecondary: "#99FFFF",
    labelTertiary: "#4D4DFF",
    labelDisabled: "#003366"
  },
  zen: {
    primary: "#4A3120",    // Dark clay
    secondary: "#8C705F",  // Muted terracotta
    background: "#F5EDE0",  // Warm ivory
    surface: "#FFFFFF",
    textPrimary: "#4A3120",
    textSecondary: "#8C705F",
    highlight: "#C4A586",  // Warm beige
    border: "#D4C4B0",
    success: "#7FBF7F",
    error: "#D87F7F",
    warning: "#E5C07F",
    labelPrimary: "#FFFFFF",
    labelSecondary: "#8C705F",
    labelTertiary: "#B3A090",
    labelDisabled: "#D0C0B0"
  }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("modern");

  const toggleTheme = () => {
    const currentIndex = themeStyles.indexOf(theme);
    const nextTheme = themeStyles[(currentIndex + 1) % themeStyles.length];
    setTheme(nextTheme);
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colors: themes[theme] }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
