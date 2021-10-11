/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

const PerspectivePlugin = require("@finos/perspective-webpack-plugin");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    mode: "development",
    devtool: "source-map",
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },

    plugins: [
        new HtmlWebPackPlugin({
            title: "Perspective React Example",
            template: "./src/index.html",
        }),
        new PerspectivePlugin(),
    ],

    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: "pre",
                use: ["source-map-loader"],
            },
            {
                test: /\.ts(x?)$/,
                exclude: /node_modules/,
                loader: "ts-loader",
            },
            {
                test: /\.css$/,
                exclude: /node_modules\/monaco-editor/,
                use: [{loader: "style-loader"}, {loader: "css-loader"}],
            },
        ],
    },
    devServer: {
        static: [
            {directory: path.join(__dirname, "dist")},
            {directory: path.join(__dirname, "./static")},
        ],
    },
};
