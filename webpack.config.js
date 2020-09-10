const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
      { test: /\.gif$|.png$/, loader: 'file-loader' },
      { test: /\.css$/i, use: ['style-loader', 'css-loader']},
      { test: /\.txt$/, use: 'raw-loader' }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/assets/index.html',
      chunks: ['main'],
      base: '/',
      favicon: 'src/assets/favicon.png',
    }),
    new HtmlWebpackPlugin({
      template: 'src/assets/webrtc-es.html',
      filename: 'webrtc-es.html',
      chunks: ['webrtc'],
    }),
    new HtmlWebpackPlugin({
      template: 'src/assets/webrtc-en.html',
      filename: 'webrtc-en.html',
      chunks: ['webrtc'],
    }),
    new HtmlWebpackPlugin({
      template: 'src/assets/legal.html',
      filename: 'legal.html',
      chunks: ['legal'],
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000,
    historyApiFallback: {
      disableDotRule: true,
    },
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    runtimeChunk: 'single',
  }
}
