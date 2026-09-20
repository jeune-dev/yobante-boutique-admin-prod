export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Points de rupture Tailwind par défaut, plus `xs` (grands téléphones)
    // pour passer les galeries de 1 à 2 colonnes sans attendre 640 px.
    // Déclarés en entier (et non via `extend`) pour que `xs` garde sa place
    // avant `sm` dans l'ordre des media queries.
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {},
  },
  plugins: [],
}
