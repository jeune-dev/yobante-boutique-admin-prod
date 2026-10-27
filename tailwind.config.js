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
    extend: {
      // Inter : chiffres de même largeur et lettres nettes en petite taille,
      // ce qui compte dans un écran fait surtout de tableaux et de montants.
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      // Ombres très légères : les cartes se détachent du fond gris par leur
      // bordure, l'ombre ne fait que les poser.
      boxShadow: {
        xs: '0 1px 2px 0 rgb(16 24 40 / 0.05)',
        carte: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.04)',
        survol: '0 4px 12px -2px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.04)',
        flottant: '0 20px 40px -12px rgb(16 24 40 / 0.22), 0 6px 12px -6px rgb(16 24 40 / 0.08)',
      },
      keyframes: {
        'apparition': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'apparition-fenetre': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'apparition-page': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        apparition: 'apparition 150ms ease-out',
        'apparition-fenetre': 'apparition-fenetre 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'apparition-page': 'apparition-page 220ms ease-out',
      },
    },
  },
  plugins: [],
}
