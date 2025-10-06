/**
 * Vogo Design System
 * Brand tokens, colors, and theme configuration
 */

export const theme = {
  colors: {
    primary: {
      DEFAULT: "#5B4BFB",
      hover: "#4A3FE0",
      light: "#8B7EFF",
      dark: "#3D2FB8",
    },
    accent: {
      DEFAULT: "#22C55E",
      light: "#4ADE80",
      dark: "#16A34A",
    },
    background: {
      DEFAULT: "#FFFFFF",
      secondary: "#F4F4F5",
      tertiary: "#E4E4E7",
    },
    text: {
      primary: "#18181B",
      secondary: "#52525B",
      tertiary: "#A1A1AA",
    },
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
  },
  shadow: {
    card: "0 8px 30px rgba(0,0,0,0.06)",
    hover: "0 12px 40px rgba(0,0,0,0.08)",
  },
};

export const darkTheme = {
  colors: {
    background: {
      DEFAULT: "#09090B",
      secondary: "#18181B",
      tertiary: "#27272A",
    },
    text: {
      primary: "#FAFAFA",
      secondary: "#A1A1AA",
      tertiary: "#71717A",
    },
  },
};
