const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isDev = process.env.NODE_ENV !== 'production';

const compileNodeModules = [
  'react-native',
  '@react-native',
  '@react-navigation',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-web',
  '@supabase',
  'zustand',
  'i18next',
  'react-i18next',
  'emoji-picker-react',
  'react-native-svg',
].map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const compilePattern = new RegExp(
  `node_modules[\\\\/](?:${compileNodeModules.join('|')})[\\\\/]`,
);

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: path.resolve(__dirname, 'index.web.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isDev ? 'bundle.js' : 'bundle.[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
    alias: {
      'react-native$': 'react-native-web',
      'lucide-react-native': 'lucide-react',
    },
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        include: [
          path.resolve(__dirname, 'index.web.js'),
          path.resolve(__dirname, 'App.tsx'),
          path.resolve(__dirname, 'src'),
        ],
        use: {
          loader: 'babel-loader',
          options: {
            configFile: false,
            babelrc: false,
            presets: [
              ['@babel/preset-env', {targets: {browsers: ['last 2 versions']}, modules: false}],
              ['@babel/preset-react', {runtime: 'automatic'}],
              '@babel/preset-typescript',
            ],
            plugins: isDev ? [require.resolve('react-refresh/babel')] : [],
          },
        },
      },
      {
        test: /\.[jt]sx?$/,
        include: compilePattern,
        resolve: {
          fullySpecified: false,
        },
        use: {
          loader: 'babel-loader',
          options: {
            configFile: false,
            babelrc: false,
            presets: [
              ['@babel/preset-env', {targets: {browsers: ['last 2 versions']}, modules: false}],
            ],
            sourceType: 'unambiguous',
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'web/index.html'),
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(isDev),
      process: {env: {NODE_ENV: JSON.stringify(isDev ? 'development' : 'production')}},
    }),
    ...(isDev ? [new ReactRefreshWebpackPlugin()] : []),
  ],
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
    static: {
      directory: path.resolve(__dirname, 'web'),
    },
  },
  devtool: 'source-map',
};
