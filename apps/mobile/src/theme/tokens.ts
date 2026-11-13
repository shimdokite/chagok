import { useColorScheme } from "react-native";
export const colors = {
  light: {
    accent: "#286347",
    background: "#F7F8F5",
    surface: "#FFFFFF",
    text: "#202C24",
    secondary: "#637167",
    line: "#E4E9E2",
    soft: "#EAF2E8",
    onAccent: "#FFFFFF",
    warning: "#926019",
    warningBg: "#FFF4DF",
  },
  dark: {
    accent: "#93D1AD",
    background: "#151C19",
    surface: "#1C2520",
    text: "#EDF3EE",
    secondary: "#AEBBB1",
    line: "#354038",
    soft: "#263A2D",
    onAccent: "#151C19",
    warning: "#E7BE76",
    warningBg: "#3D3220",
  },
};
export const spacing = { page: 23, card: 20, button: 13 };
export const useTheme = () =>
  colors[useColorScheme() === "dark" ? "dark" : "light"];
