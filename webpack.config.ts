import 'webpack-dev-server';

import path from 'node:path';

import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import type { ExternalItemFunctionData } from 'webpack';
import webpack from 'webpack';

import packageJSON from './package.json' with { type: 'json' };
const BANNER = `GraphQL Voyager - Represent any GraphQL API as an interactive graph
-------------------------------------------------------------
  Version: ${packageJSON.version}
  Repo: ${packageJSON.repository.url}`;

const baseConfig: webpack.Configuration = {
  devtool: 'source-map',
  // disable hints since Voyager is too big :(
  performance: { hints: false },
  resolve: {
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.mjs', '.js'],
      '.ts': ['.mjs', '.js', '.ts'],
    },
    extensions: ['.js', '.json', '.css', '.svg'],
  },
  output: {
    path: path.join(import.meta.dirname, 'dist'),
    sourceMapFilename: '[file].map',
  },
  module: {
    rules: [
      {
        resourceQuery: /raw/,
        type: 'asset/source',
      },
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: { noEmit: false },
          },
        },
        exclude: [/\.(spec|e2e)\.ts$/],
      },
      {
        test: /\.css$/,
        exclude: /variables\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: { sourceMap: true },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: true,
              postcssOptions: {
                plugins: ['postcss-import', 'postcss-cssnext'],
              },
            },
          },
        ],
      },
      {
        test: /variables\.css$/,
        use: [{ loader: 'postcss-variables-loader?es5=1' }],
      },
      {
        test: /\.svg$/,
        issuer: /\.tsx?$/,
        resourceQuery: { not: [/raw/] },
        use: [
          {
            loader: '@svgr/webpack',
            options: { typescript: true, ext: 'tsx' },
          },
        ],
      },
    ],
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: 'voyager.css',
    }),

    new webpack.BannerPlugin({
      banner: BANNER,
      stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
    }),
  ],
};

const config: Array<webpack.Configuration> = [
  {
    ...baseConfig,
    entry: './src/index.ts',
    externalsType: 'module',
    externals,
    output: {
      ...baseConfig.output,
      filename: 'voyager.lib.js',
      library: { type: 'modern-module' },
      libraryTarget: 'modern-module',
    },
    experiments: { outputModule: true },
  },
  {
    ...baseConfig,
    entry: './src/standalone.ts',
    optimization: { minimize: true },
    externals: undefined,
    output: {
      ...baseConfig.output,
      filename: 'voyager.standalone.js',
      library: 'GraphQLVoyager',
      libraryTarget: 'umd',
      umdNamedDefine: true,
    },
    devServer: {
      port: 9090,
      static: {
        directory: path.join(import.meta.dirname, 'demo'),
      },
      liveReload: true,
    },
  },
];
export default config;

function externals({ request }: ExternalItemFunctionData) {
  return Promise.resolve(
    [
      ...Object.keys(packageJSON.peerDependencies),
      ...Object.keys(packageJSON.dependencies),
    ].some((pkg) => request === pkg || request?.startsWith(pkg + '/')),
  );
}
