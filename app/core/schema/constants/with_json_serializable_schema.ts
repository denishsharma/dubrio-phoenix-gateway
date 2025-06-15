import type { Schema } from 'effect'
import type { Jsonifiable } from 'type-fest'

/**
 * Type that ensures the schema is valid for JSON serialization.
 *
 * It checks that the schema is a valid Effect Schema and that the
 * decoded type is JSON serializable (extends Jsonifiable).
 */
type JsonSerializableSchema<A, I, R>
  = & Schema.Schema<A, I, R>
    & (A extends Jsonifiable ? unknown : { __error__: 'Schema must be decoded to a type that is JSON serializable and extends Jsonifiable' })

/**
 * WithJsonSerializableSchema is helper function that takes a schema
 * and ensures it is valid for JSON serialization on type level.
 *
 * This only ensures on type level and not on runtime level.
 */
export default function WithJsonSerializableSchema<A, I, R>(schema: JsonSerializableSchema<A, I, R>) {
  return schema
}
