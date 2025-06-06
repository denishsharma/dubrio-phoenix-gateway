import adonisjs from '@adonisjs/eslint-plugin'
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    formatters: true,
    stylistic: {
      indent: 2,
      semi: false,
      quotes: 'single',
      overrides: {
        'style/comma-dangle': ['error', 'always-multiline'],
        'style/array-bracket-newline': ['error', { multiline: true, minItems: 3 }],
        'style/function-call-argument-newline': ['error', 'consistent'],
        'style/brace-style': [
          'error',
          '1tbs',
          { allowSingleLine: true },
        ],
        'style/max-statements-per-line': ['error', { max: 2 }],
        'style/wrap-regex': 'error',
        'style/member-delimiter-style': 'error',
      },
    },
    regexp: { level: 'warn' },
    typescript: {
      overrides: {
        'ts/no-shadow': 'error',
        'ts/no-redeclare': 'off',
        'ts/no-namespace': 'off',
        'ts/array-type': ['error', { default: 'array' }],
        'ts/naming-convention': [
          'error',
          {
            selector: 'variable',
            format: [
              'camelCase',
              'UPPER_CASE',
              'PascalCase',
            ],
          },
          {
            selector: 'typeLike',
            format: ['PascalCase'],
          },
          {
            selector: 'class',
            format: ['PascalCase'],
          },
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: {
              regex: '^I[A-Z]',
              match: false,
            },
          },
        ],
      },
    },
    lessOpinionated: true,
    plugins: {
      adonisjs,
    },
    rules: {
      'antfu/no-top-level-await': 'off',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',

      'jsdoc/check-param-names': 'off',

      'node/handle-callback-err': ['error', '^(err|error)$'],
      'node/prefer-global/process': ['error', 'always'],

      'adonisjs/prefer-lazy-controller-import': 'error',
      'adonisjs/prefer-lazy-listener-import': 'error',

      'unicorn/throw-new-error': 'off',
      'unicorn/filename-case': ['error', { case: 'snakeCase' }],
      'unicorn/no-await-expression-member': 'error',
    },
  },
  {
    files: ['lint-staged.config.{js,ts}', 'pnpm-workspace.yaml'],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
)
