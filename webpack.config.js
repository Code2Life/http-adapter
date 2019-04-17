const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const version = require('./package.json').version;

module.exports = {
  entry: './src/main.ts',
  devtool: 'source-map',
  target: 'node',
  node: false,
  mode: 'production',
  plugins: [
    new CleanWebpackPlugin('./dist'),
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production'
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false
    })
  ],
  module: {
    rules: [{
      test: /\.ts$/,
      use: 'ts-loader',
      exclude: /node_modules/
    }]
  },
  // for ws module, these two cpp dependencies are optional, ignore them
  externals: ['bufferutil', 'utf-8-validate'],
  resolve: {
    extensions: ['.ts', '.js', '.json', '.node']
  },
  optimization: {
    minimize: true,
    nodeEnv: 'production',
  },
  output: {
    filename: `http-adaptor-${version}.js`,
    path: path.resolve(__dirname, './dist')
  }
};