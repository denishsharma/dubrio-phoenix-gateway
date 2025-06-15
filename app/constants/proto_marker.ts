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
