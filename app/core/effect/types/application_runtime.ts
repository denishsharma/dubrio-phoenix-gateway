import type HttpContext from '#core/http/contexts/http_context'
import type { ApplicationRuntime } from '#start/runtime'
import type { ManagedRuntime, Scope } from 'effect'

/**
 * The context of the application runtime.
 * It has all the services that are available in the application runtime.
 */
export type C = ManagedRuntime.ManagedRuntime.Context<typeof ApplicationRuntime>

/**
 * The error type of the application runtime.
 * It has all the errors that are available in the application runtime.
 */
export type ER = ManagedRuntime.ManagedRuntime.Error<typeof ApplicationRuntime>

/**
 * Resolves the requirement of the effect.
 * It ensures that the effect has all defined dependencies resolved.
 *
 * Ensure that effect already has `Scope` as a dependency.
 */
type ResolveRequirement<T, L> = [T] extends [never] ? L : T extends L ? T : T | L
export type R = ResolveRequirement<C, Scope.Scope | HttpContext>
