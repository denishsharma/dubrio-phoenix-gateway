export const FILTER_OPERATORS = [
  'equals', // =
  'not_equals',
  'gt', // >
  'gte', // >=
  'lt', // <
  'lte', // <=
  'includes', // for multiple_choice
  'in', // for array‐of scalars
] as const

export type FilterOperator = typeof FILTER_OPERATORS[number]
