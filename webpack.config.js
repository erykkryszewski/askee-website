const path = require("path");

module.exports = {
    entry: {
        main: "./js/src/index.js",
        editor: "./js/src/editor.js",
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "js/dist"),
        clean: true,
    },
    watch: false,
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules\/(?!(swiper)\/).*/,
                use: {
                    loader: "babel-loader",
                },
            },
        ],
    },
    externals: {
        jquery: "jQuery",
    },
};
