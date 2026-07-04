/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EDE6D6',      // aged card-catalog paper
        card: '#F7F3E8',       // index-card white
        ink: '#22252B',        // near-black charcoal ink
        stamp: '#B23A2E',      // due-date stamp red
        ledger: '#3F5B4A',     // ledger green (secondary/success)
        gold: '#C9A24B',       // bookmark ribbon gold
        line: '#D8CFB8',       // hairline rule on paper
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(34,37,43,0.06), 0 8px 20px -12px rgba(34,37,43,0.35)',
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      rotate: {
        '2.5': '2.5deg',
        '-2.5': '-2.5deg',
      },
    },
  },
  plugins: [],
};
