import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#1B3A4B",
          accent: "#C8743A",
          bg: "#F7F3EC",
          surface: "#FBF8F2",
          border: "#E5DFD4",
          text: "#1A1A18",
          muted: "#6B6661",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        mobile: "480px",
      },
    },
  },
  plugins: [],
};

export default config;
