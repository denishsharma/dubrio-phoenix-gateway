/**
 * Resolve the return type of a function, even if it is nested.
 *
 * This is useful for extracting the final return type of a function
 * that may return another function or a nested structure.
 *
 * @template T - The type of the function to resolve.
 * @returns The final resolved return type of the function.
 */
export type ResolveNestedFunctionReturnType<T> = T extends (...args: any[]) => infer R
  ? ResolveNestedFunctionReturnType<R>
  : T
