/**
 * Literal type representing the error that occurs when a
 * ParseResult.ParseError is not present in the effect pipeline.
 */
export type EffectWithoutParseError = never & { __error__: 'Error must contain ParseResult.ParseError' }
