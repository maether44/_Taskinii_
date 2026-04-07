/* BodyQ shared Recharts theme — import into every chart component */
export const chartTheme = {
  grid: {
    stroke: 'rgba(255,255,255,0.04)',
    strokeDasharray: '4 4',
    vertical: false,
  },
  axis: {
    tick: {
      fill: 'rgba(255,255,255,0.35)',
      fontSize: 11,
      fontFamily: 'var(--font-inter, Inter, sans-serif)',
    },
    axisLine: false,
    tickLine: false,
  },
  tooltip: {
    contentStyle: {
      background: '#16102A',
      border: '1px solid rgba(124,92,252,0.30)',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    },
    labelStyle: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 12,
      fontFamily: 'var(--font-inter, Inter, sans-serif)',
      marginBottom: 4,
    },
    itemStyle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontFamily: 'var(--font-inter, Inter, sans-serif)',
    },
  },
  colors: {
    primary:   '#7C5CFC',
    secondary: '#C8F135',
    tertiary:  '#38BDF8',
    danger:    '#EF4444',
    success:   '#22C55E',
    warning:   '#F59E0B',
    muted:     '#6B6280',
  },
  area: {
    fillOpacity: 0.15,
  },
};
