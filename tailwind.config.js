/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        gold: "#D4AF37",
        "merchant-light": "#FDFCFB",
        "merchant-dark": "#020617",
        navy: {
          DEFAULT: "#0A0F1E",
          800: "#0D1526",
          700: "#111D35",
        },
        electric: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
        },
        // Stitch MD3 Tokens
        "surface": "var(--surface, #f8fafc)",
        "surface-container-lowest": "var(--surface-container-lowest, #ffffff)",
        "surface-container-low": "var(--surface-container-low, #f1f5f9)",
        "surface-container": "var(--surface-container, #ecedf7)",
        "surface-container-high": "var(--surface-container-high, #dbe4f0)",
        "surface-container-highest": "var(--surface-container-highest, #cbd5e1)",
        "on-surface": "var(--on-surface, #171a21)",
        "on-surface-variant": "var(--on-surface-variant, #475569)",
        "outline": "var(--outline, #cbd5e1)",
        "outline-variant": "var(--outline-variant, #c3c6d7)",
        "brand-steel": "#7A93AC",
        "brand-gold": "#D4AF37",
        "brand-navy": "#171A21",
        "brand-dark-base": "#0F1419",
        "brand-dark-abyss": "#0A0F1E",
        "surface-tint": "#0053db",
        "primary-container": "#dbeafe",
        "on-primary-container": "#003ea8",
        "secondary-container": "#d0e4ff",
        "on-secondary-container": "#1e3a5f",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.6" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        "connecting-line": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        shake: "shake 0.5s ease-in-out",
        ripple: "ripple 0.6s ease-out forwards",
        "connecting-line": "connecting-line 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}