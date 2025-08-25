import path from 'node:path';

const config = {
  devServer: {
    port: 9090,
    allowedHosts: 'all',
    static: { directory: import.meta.dirname },
    // needed to prevent info messages during integration tests
    client: { logging: 'warn' },
  },
  // disable hints since Voyager is too big :(
  performance: { hints: false },
  entry: ['./index.tsx'],
  output: {
    path: path.resolve(import.meta.dirname, 'dist'),
    filename: 'main.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: { compilerOptions: { noEmit: false } },
        },
        exclude: /node_modules/,
      },
    ],
  },
};

export default config;
