/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "system-ui", "sans-serif"],
      },
      colors: {
        md: {
          // Core palette — derived from Onye brand teal #40B9A7
          primary: "#40B9A7",
          "on-primary": "#FFFFFF",
          "primary-container": "#C2F3EA",
          "on-primary-container": "#002019",

          // Muted teal for secondary surfaces
          secondary: "#4D7B76",
          "on-secondary": "#FFFFFF",
          "secondary-container": "#CEE9E4",
          "on-secondary-container": "#082B27",

          // Coral accent — from the Onye logo's center dot
          tertiary: "#E85565",
          "on-tertiary": "#FFFFFF",
          "tertiary-container": "#FFD9DD",
          "on-tertiary-container": "#3B0712",

          // Teal-tinted surfaces 
          background: "#F8FDFB",
          "on-background": "#191C1C",
          surface: "#F8FDFB",
          "on-surface": "#191C1C",
          "surface-variant": "#D9E5E1",
          "on-surface-variant": "#3F4946",

          "surface-container": "#EDF5F2",
          "surface-container-low": "#F3FAF7",
          "surface-container-high": "#E1EDEA",

          outline: "#6F7977",
          "outline-variant": "#BFC9C6",

          // MD3 error slot
          error: "#BA1A1A",
          "on-error": "#FFFFFF",
          "error-container": "#FFDAD6",
          "on-error-container": "#410002",

          // Clinical status — boosted saturation, hues shifted to
          // complement the teal/coral brand palette
          success: "#18915F",
          "success-container": "#98F5CE",
          "on-success-container": "#003822",
          warning: "#BD7B16",
          "warning-container": "#FFDFA3",
          "on-warning-container": "#3C2500",
        },
      },
      borderRadius: {
        "md-sm": "8px",
        "md-md": "12px",
        "md-lg": "16px",
        "md-xl": "24px",
        "md-2xl": "28px",
        "md-3xl": "32px",
        "md-4xl": "48px",
      },
      transitionTimingFunction: {
        "md-standard": "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [],
};
