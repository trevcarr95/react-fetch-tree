const path = require("path");

const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
// const ExtensionReloader = require("webpack-extension-reloader");
const destination = path.resolve(__dirname, "build");

module.exports = {
  mode: "development",
  entry: {
    app: "./src/components/index.tsx",
    injectScript: "./injectScript.js",
    contentScript: "./contentScript.js",
  },
  output: {
    path: path.resolve("./build/"),
    filename: "[name].js",
    publicPath: ".",
  },
  devtool: "cheap-module-source-map",
  module: {
    rules: [
      {
        test: /\.(svg|png|jpg|gif|jpeg)$/,
        use: {
          loader: "file-loader",
          options: {
            name: "[name].[hash].[ext]",
            outputPath: "imgs",
          },
        },
      },
      {
        test: /\.jsx?$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: { presets: ["@babel/preset-env", "@babel/preset-react"] },
        },
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      { test: /\.(css)$/, use: ["style-loader", "css-loader"] },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          MiniCssExtractPlugin.loader,
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".scss", ".css", ".ts", ".tsx", ".jpg", ".png"],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    // new ExtensionReloader(),
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: `./manifest.json`, to: destination },
        { from: `./src/devtools/devtools.html`, to: destination },
        { from: `./src/devtools/devtools.js`, to: destination },
        { from: `./src/index.html`, to: destination },
        { from: `./background.js`, to: destination },
        { from: `./src/style.css`, to: destination },
        { from: `./src/assets/Logo.png`, to: destination },
      ],
    }),
  ],
};
