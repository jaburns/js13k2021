import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';
import replaceConfig from './src/constants.json';

const DEBUG = process.argv.indexOf( '--config-debug' ) >= 0;

replaceConfig.preventAssignment = true;
replaceConfig.DEBUG = DEBUG;

const plugins = [
  replace(replaceConfig)
];

if( !DEBUG ) {
  plugins.push(
   terser({
      ecma: 2020,
      compress: {
        passes: 10,
        keep_fargs: false,
        pure_getters: true,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_symbols: true,
      },
      mangle: {
        reserved: ['C0','C1','g','c'],
        properties: {
          keep_quoted: true
        },
      },
      format: {
        quote_style: 1
      },
    })
  );
}

export default {
  input: 'build/index.js',
  output: {
    file: 'build/bundle.js',
    strict: false,
  },
  plugins
};
