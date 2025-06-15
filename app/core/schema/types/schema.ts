import type { Brand } from 'effect'

/**
 * Unique symbol used to mark the `UndefinedSchema` type.
 */
export type UndefinedSchemaMarker = '@marker/type/schema/undefined_schema'

/**
 * The branded type to represent an undefined schema.
 * This is used to indicate that a schema is not defined or is undefined.
 */
export type UndefinedSchema = Brand.Branded<{ __tag__: 'undefined' }, UndefinedSchemaMarker>

/**
 * Helper type to check if a schema is undefined or not.
 *
 * It will return true if the type is `never` or if it is an `UndefinedSchema`.
 * Otherwise, it will return false.
 */
export type IsUndefinedSchema<T> = [T] extends [never] ? true : T extends UndefinedSchema ? true : false
