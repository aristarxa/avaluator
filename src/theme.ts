/**
 * Material Design 3 — JS design tokens
 * Mirrors CSS custom properties in index.css for use in inline styles.
 * Seed colour: #1565C0 (Blue)
 */
export const MD3 = {
  // Primary
  primary:             'var(--md-sys-color-primary)',
  onPrimary:           'var(--md-sys-color-on-primary)',
  primaryContainer:    'var(--md-sys-color-primary-container)',
  onPrimaryContainer:  'var(--md-sys-color-on-primary-container)',

  // Secondary
  secondary:             'var(--md-sys-color-secondary)',
  onSecondary:           'var(--md-sys-color-on-secondary)',
  secondaryContainer:    'var(--md-sys-color-secondary-container)',
  onSecondaryContainer:  'var(--md-sys-color-on-secondary-container)',

  // Error
  error:             'var(--md-sys-color-error)',
  onError:           'var(--md-sys-color-on-error)',
  errorContainer:    'var(--md-sys-color-error-container)',
  onErrorContainer:  'var(--md-sys-color-on-error-container)',

  // Surface
  surface:                     'var(--md-sys-color-surface)',
  onSurface:                   'var(--md-sys-color-on-surface)',
  surfaceVariant:              'var(--md-sys-color-surface-variant)',
  onSurfaceVariant:            'var(--md-sys-color-on-surface-variant)',
  surfaceContainerLowest:      'var(--md-sys-color-surface-container-lowest)',
  surfaceContainerLow:         'var(--md-sys-color-surface-container-low)',
  surfaceContainer:            'var(--md-sys-color-surface-container)',
  surfaceContainerHigh:        'var(--md-sys-color-surface-container-high)',
  surfaceContainerHighest:     'var(--md-sys-color-surface-container-highest)',

  // Outline
  outline:        'var(--md-sys-color-outline)',
  outlineVariant: 'var(--md-sys-color-outline-variant)',

  // Inverse
  inverseSurface:   'var(--md-sys-color-inverse-surface)',
  inverseOnSurface: 'var(--md-sys-color-inverse-on-surface)',
  inversePrimary:   'var(--md-sys-color-inverse-primary)',

  // Shape
  radiusFull:        'var(--md-sys-shape-corner-full)',
  radiusExtraLarge:  'var(--md-sys-shape-corner-extra-large)',
  radiusLarge:       'var(--md-sys-shape-corner-large)',
  radiusMedium:      'var(--md-sys-shape-corner-medium)',
  radiusSmall:       'var(--md-sys-shape-corner-small)',
  radiusExtraSmall:  'var(--md-sys-shape-corner-extra-small)',

  // Elevation
  elevation0: 'var(--md-sys-elevation-level0)',
  elevation1: 'var(--md-sys-elevation-level1)',
  elevation2: 'var(--md-sys-elevation-level2)',
  elevation3: 'var(--md-sys-elevation-level3)',

  // Legacy aliases (keep for back-compat)
  surfaceContainerFallback: '#ECEEF3',
} as const;
