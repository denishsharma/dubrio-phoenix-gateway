/**
 * Unique symbols to mark internal properties in the prototype chain
 * for better type safety and to avoid name collisions.
 */
export const INTERNALS_MARKER: unique symbol = Symbol('@marker/proto/internals')

/**
 * Unique symbol to mark the kind of the object in the prototype chain
 * and to avoid name collisions.
 */
export const KIND_MARKER: unique symbol = Symbol('@marker/proto/kind')

/**
 * Unique symbol to be used as a marker for the tag of an object or class.
 *
 * This symbol can be used to identify a specific tag or label associated
 * with an object, allowing for easy categorization and retrieval.
 */
export const TAG_MARKER: unique symbol = Symbol.for('@marker/shared/constants/proto_marker/tag')
