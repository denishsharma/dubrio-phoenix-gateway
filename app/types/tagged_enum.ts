import type { Brand } from 'effect'

export type TaggedEnum<S, B extends string | symbol> = {
  [K in keyof S]: Brand.Branded<
    {
      readonly [P in keyof S[K] | '_tag']:
      P extends keyof S[K] ? S[K][P]
        : P extends '_tag' ? K
          : never;
    },
    B
  >
}[keyof S]
