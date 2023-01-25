const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  entry: "./index.ts",
  devtool: "source-map",
  target: "web",
  output: {
    filename: "index.js",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".json"],
  },
  module: {
    rules: [
      { test: /\.tsx?$/, use: ["ts-loader"], exclude: /node_modules/ },
    ],
  },
  plugins: [new NodePolyfillPlugin()],
};