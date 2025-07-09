import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    validation: 'src/validation/index.ts',
    formatting: 'src/formatting/index.ts',
    currency: 'src/currency/index.ts',
    date: 'src/date/index.ts',
    swiss: 'src/swiss/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'date-fns',
    'date-fns-tz',
    'libphonenumber-js',
    'zod'
  ]
});
