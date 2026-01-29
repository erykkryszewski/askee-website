module.exports = {
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    singleQuote: false,
    trailingComma: "es5",
    bracketSpacing: true,
    arrowParens: "always",
    plugins: [require.resolve("@prettier/plugin-php")],
    phpVersion: "8.0",
    braceStyle: "1tbs",
    overrides: [
        {
            files: ["*.scss", "*.css"],
            options: {
                singleQuote: false,
            },
        },
    ],
};
