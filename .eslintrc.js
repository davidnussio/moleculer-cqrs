module.exports = {
  extends: ["airbnb/base", "prettier"],
  plugins: ["prettier"],
  env: {
    jest: true,
  },
  rules: {
    "no-underscore-dangle": 0,
    "func-names": "off",
    "no-param-reassign": [
      "error",
      { props: true, ignorePropertyModificationsFor: ["context"] },
    ],
    "no-plusplus": "off",
  },
};
