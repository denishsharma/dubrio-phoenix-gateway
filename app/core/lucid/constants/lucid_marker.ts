/**
 * Unique symbol to mark object or class as a Lucid model retrieval strategy.
 */
export const LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER: unique symbol = Symbol('@marker/core/lucid/model_retrieval_strategy')

/**
 * Unique symbol to mark object or class as a Lucid column and must
 * be used with `UsingLucidColumn` decorator.
 */
export const LUCID_COLUMN_MARKER: unique symbol = Symbol('@marker/core/lucid/lucid_column')

/**
 * Unique symbol to mark object or class as a Lucid model identifier.
 */
export const LUCID_MODEL_IDENTIFIER_MARKER: unique symbol = Symbol('@marker/core/lucid/lucid_model_identifier')
