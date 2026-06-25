import { Platform } from 'react-native';

const fonts = {
  regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
  medium: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  bold: Platform.OS === 'ios' ? 'System' : 'Roboto-Bold',
};

const typography = {
  // Headings
  h1: { fontSize: 28, fontWeight: '700', fontFamily: fonts.bold, letterSpacing: 0.3 },
  h2: { fontSize: 22, fontWeight: '700', fontFamily: fonts.bold, letterSpacing: 0.2 },
  h3: { fontSize: 18, fontWeight: '600', fontFamily: fonts.medium, letterSpacing: 0.1 },
  h4: { fontSize: 16, fontWeight: '600', fontFamily: fonts.medium },

  // Body
  bodyLarge:  { fontSize: 16, fontWeight: '400', fontFamily: fonts.regular, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400', fontFamily: fonts.regular, lineHeight: 20 },
  bodySmall:  { fontSize: 12, fontWeight: '400', fontFamily: fonts.regular, lineHeight: 16 },

  // Buttons
  btnLarge:  { fontSize: 18, fontWeight: '700', fontFamily: fonts.bold, letterSpacing: 0.5 },
  btnMedium: { fontSize: 15, fontWeight: '600', fontFamily: fonts.medium },
  btnSmall:  { fontSize: 13, fontWeight: '600', fontFamily: fonts.medium },

  // Labels & Captions
  label:   { fontSize: 12, fontWeight: '600', fontFamily: fonts.medium, letterSpacing: 0.8, textTransform: 'uppercase' },
  caption: { fontSize: 11, fontWeight: '400', fontFamily: fonts.regular, lineHeight: 14 },
};

export default typography;