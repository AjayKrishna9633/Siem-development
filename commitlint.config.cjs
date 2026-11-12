module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['auth', 'api', 'db', 'ui', 'ingest', 'deps', 'ci', 'security']
    ],
  },
};
