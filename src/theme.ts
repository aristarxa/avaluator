/**
 * Material Design 3 — design tokens
 * Primary blue seed: #1565C0
 */
export const MD3 = {
  // Surfaces
  surface:           '#FFFFFF',
  surfaceVariant:    '#E8EDF5',
  surfaceContainer:  '#F2F5FA',
  onSurface:         '#1A1C1E',
  onSurfaceVariant:  '#43474E',
  outline:           '#73777F',
  outlineVariant:    '#C3C7CF',

  // Primary
  primary:           '#1565C0',
  onPrimary:         '#FFFFFF',
  primaryContainer:  '#D6E4FF',
  onPrimaryContainer:'#001B3E',

  // Error
  error:             '#BA1A1A',
  onError:           '#FFFFFF',
  errorContainer:    '#FFDAD6',

  // Risk semantic
  riskGray:   '#73777F',
  riskGreen:  '#1B6B2E',
  riskYellow: '#7A5700',
  riskRed:    '#BA1A1A',
  riskGreenBg:'#D4EDD9',
  riskYellowBg:'#FFEECB',
  riskRedBg:  '#FFDAD6',
  riskGrayBg: '#E8EDF5',

  // Shape
  radiusFull:   '50px',
  radiusLarge:  '28px',
  radiusMedium: '16px',
  radiusSmall:  '12px',

  // Elevation (no shadows for FAB per MD3 flat variant)
  elevationNone: 'none',
} as const;
