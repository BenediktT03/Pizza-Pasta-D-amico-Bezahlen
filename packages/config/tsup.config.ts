import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'app.config': 'src/app.config.ts',
    'firebase.config': 'src/firebase.config.ts',
    'payment.config': 'src/payment.config.ts',
    'features.config': 'src/features.config.ts',
    'locales.config': 'src/locales.config.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'dotenv',
    'zod'
  ]
});
