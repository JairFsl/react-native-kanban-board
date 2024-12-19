export default {
  root: true,
  extends: [
    "@react-native-community",
    "prettier"
  ],
  rules: {
    "prettier/prettier": [
      "error",
      {
        quoteProps: "consistent",
        singleQuote: false,
        tabWidth: 2,
        trailingComma: "es5",
        useTabs: false
      }
    ]
  },
  ignorePatterns: [
    "node_modules/",
    "lib/"
  ]
};
