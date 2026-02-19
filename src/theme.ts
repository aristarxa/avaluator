/**
 * Apple-style design tokens — JS mirror of CSS custom properties.
 * All values reference CSS variables so dark-mode / theming is trivial.
 */
export const T = {
  // Colours
  label:          'var(--c-label)',
  label2:         'var(--c-label-2)',
  label3:         'var(--c-label-3)',
  fill:           'var(--c-fill)',
  fill2:          'var(--c-fill-2)',
  fill3:          'var(--c-fill-3)',
  bg:             'var(--c-bg)',
  bgElevated:     'var(--c-bg-elevated)',
  separator:      'var(--c-separator)',
  separatorOpq:   'var(--c-separator-opaque)',
  blue:           'var(--c-blue)',
  blueTint:       'var(--c-blue-tint)',
  blueBg:         'var(--c-blue-bg)',

  // Risk
  riskGray:       'var(--c-risk-gray)',
  riskGrayBg:     'var(--c-risk-gray-bg)',
  riskGreen:      'var(--c-risk-green)',
  riskGreenBg:    'var(--c-risk-green-bg)',
  riskYellow:     'var(--c-risk-yellow)',
  riskYellowBg:   'var(--c-risk-yellow-bg)',
  riskRed:        'var(--c-risk-red)',
  riskRedBg:      'var(--c-risk-red-bg)',

  // Shape
  rxs:   'var(--r-xs)',
  rsm:   'var(--r-sm)',
  rmd:   'var(--r-md)',
  rlg:   'var(--r-lg)',
  rxl:   'var(--r-xl)',
  rfull: 'var(--r-full)',

  // Shadows
  shadowSm: 'var(--shadow-sm)',
  shadowMd: 'var(--shadow-md)',
  shadowLg: 'var(--shadow-lg)',

  // Font
  font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
} as const;

// Legacy MD3 alias — keeps old imports compiling
export const MD3 = {
  primary:             T.blue,
  onPrimary:           '#fff',
  primaryContainer:    T.blueBg,
  onPrimaryContainer:  T.blue,
  surface:             T.bgElevated,
  onSurface:           T.label,
  surfaceVariant:      T.fill2,
  onSurfaceVariant:    T.label2,
  surfaceContainer:    T.fill3,
  surfaceContainerLow: T.bg,
  surfaceContainerHigh:T.fill2,
  outline:             T.separator,
  outlineVariant:      T.separatorOpq,
  error:               T.riskRed,
  onError:             '#fff',
  errorContainer:      T.riskRedBg,
  riskGray:   T.riskGray,   riskGrayBg:   T.riskGrayBg,
  riskGreen:  T.riskGreen,  riskGreenBg:  T.riskGreenBg,
  riskYellow: T.riskYellow, riskYellowBg: T.riskYellowBg,
  riskRed:    T.riskRed,    riskRedBg:    T.riskRedBg,
  radiusFull:   T.rfull,  radiusLarge:  T.rlg,
  radiusMedium: T.rmd,    radiusSmall:  T.rsm,
  radiusExtraSmall: T.rxs,
  elevation0: 'none', elevation1: T.shadowSm, elevation2: T.shadowMd, elevation3: T.shadowLg,
} as const;
