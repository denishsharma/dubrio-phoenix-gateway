import { Effect } from 'effect'

export default class TypedEffectService extends Effect.Service<TypedEffectService>()('@service/core/effect/typed_effect', {
  effect: Effect.gen(function* () {
    const ensureSuccessType = <S>() => <A extends S, E, R>(self: Effect.Effect<A, E, R> & (A extends S ? unknown : never)): Effect.Effect<A, E, R> => self
    const overrideSuccessType = <S>() => <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<S, E, R> => self as unknown as Effect.Effect<S, E, R>

    const ensureErrorType = <K>() => <A, E extends K, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => self
    const ensureExplicitErrorType = <K>() => <A, E extends K & (K extends E ? unknown : never), R>(self: Effect.Effect<A, E, R> & (E extends K ? unknown : never)): Effect.Effect<A, K, R> => self
    const overrideErrorType = <K>() => <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, K, R> => self as unknown as Effect.Effect<A, K, R>

    const ensureContextType = <C>() => <A, E, R extends C & (C extends R ? unknown : never)>(self: Effect.Effect<A, E, R> & (R extends C ? unknown : never)): Effect.Effect<A, E, C> => self
    const overrideContextType = <C>() => <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, C> => self as unknown as Effect.Effect<A, E, C>

    return {
      /**
       * Changes the success type of the effect to the specified type.
       *
       * Suitable in cases where effect will succeed with one
       * of the specified success types.
       */
      ensureSuccessType,

      /**
       * Overrides the success type of the effect to the specified type.
       *
       * Suitable in cases where effect will always succeed with the specified
       * success type and the success type is not `never`.
       */
      overrideSuccessType,

      /**
       * Changes the error type of the effect to the specified type.
       * It will not throw a type error if effect has `never` error type.
       *
       * Suitable in cases where effect will either never fail or will
       * fail with one of the specified error types (including `never`).
       */
      ensureErrorType,

      /**
       * Changes the error type of the effect to the specified type.
       * It will throw a type error if effect has `never` error type.
       *
       * Suitable in cases where effect will always fail with the specified
       * error type and the error type is not `never`.
       */
      ensureExplicitErrorType,

      /**
       * Overrides the error type of the effect to the specified type.
       *
       * Suitable in cases where effect will always fail with the specified
       * error type and the error type is not `never`.
       */
      overrideErrorType,

      /**
       * Changes the context type of the effect to the specified type.
       * It will throw a type error if context type does not match the specified type.
       *
       * Suitable in cases where effect will always require the specified context type.
       */
      ensureContextType,

      /**
       * Overrides the context type of the effect to the specified type.
       *
       * Suitable in cases where effect will always require the specified context type.
       */
      overrideContextType,
    }
  }),
}) {}
