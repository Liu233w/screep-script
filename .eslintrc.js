module.exports = {
  root: true,
  env: {
    browser: false,
    node: true,
    es6: true,
    "screeps/screeps": true
  },
  extends: [
    'eslint:recommended',
  ],
  plugins: [
    "screeps"
  ],
  // add your custom rules here
  rules: {
    'semi': [2, 'never'],
    'no-console': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'quotes': ['error', 'single'],
  },
}