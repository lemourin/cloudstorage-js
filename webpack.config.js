const webpack = require('webpack');
const path = require('path');
const dotenv = require('dotenv');

const env = dotenv.config().parsed;

module.exports = {
  entry: './js/index.tsx',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: true,
              sourceMap: true,
              importLoaders: 1,
              localIdentName: "[name]--[local]--[hash:base64:8]"
            }
          },
          "postcss-loader"
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  externals: {
    "react": "React",
    "react-dom": "ReactDOM"
  },
  plugins: [
    new webpack.DefinePlugin(
      Object.keys(env).reduce(
        (prev, next) => {
          prev[`process.env.${next}`] = JSON.stringify(env[next]);
          return prev;
        },
        {}
      )
    )
  ]
};
