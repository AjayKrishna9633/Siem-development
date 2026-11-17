module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['auth', 'audit', 'api', 'db', 'ui', 'ingest', 'deps', 'ci', 'security', 'docker']
    ],
  },
};
