import { Array, Effect, pipe, Ref } from 'effect'

export default class StringMixerService extends Effect.Service<StringMixerService>()('@service/shared/string_mixer', {
  effect: Effect.gen(function* () {
    const alphaNumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    function generateMulberry32(seed: number) {
      return Effect.sync(() => {
        let t = (seed += 0x6D2B79F5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      })
    }

    function hashString(str: string) {
      return Effect.gen(function* () {
        const hashRef = yield* Ref.make(0)
        yield* Effect.loop(0, {
          while: i => i < str.length,
          step: i => i + 1,
          body: i => pipe(
            hashRef.get,
            Effect.map(hash => (hash * 31 + str.charCodeAt(i)) >>> 0),
            Effect.flatMap(hash => Ref.set(hashRef, hash)),
          ),
          discard: true,
        })
        return yield* Ref.get(hashRef)
      })
    }

    function shiftAlphaNumeric(char: string, offset: number) {
      return Effect.sync(() => {
        const i = alphaNumeric.indexOf(char)
        if (i === -1) { return char }
        return alphaNumeric[(i + offset) % alphaNumeric.length]
      })
    }

    function unshiftAlphaNumeric(char: string, offset: number) {
      return Effect.sync(() => {
        const i = alphaNumeric.indexOf(char)
        if (i === -1) { return char }
        return alphaNumeric[(i - offset + alphaNumeric.length) % alphaNumeric.length]
      })
    }

    function generateRandomKey(length: number = 10) {
      return Effect.gen(function* () {
        const keyRef = yield* Ref.make('')
        yield* Effect.loop(0, {
          while: i => i < length,
          step: i => i + 1,
          body: () => pipe(
            keyRef.get,
            Effect.map(key => key + alphaNumeric[Math.floor(Math.random() * alphaNumeric.length)]),
            Effect.flatMap(key => Ref.set(keyRef, key)),
          ),
          discard: true,
        })
        return yield* Ref.get(keyRef)
      })
    }

    function encodeLengths(length: number[]) {
      return Effect.sync(() => {
        return length.map(l => l.toString(36).padStart(2, '0')).join('')
      })
    }

    function decodeLengths(encoded: string) {
      return Effect.gen(function* () {
        const lengthsRef = yield* Ref.make([] as number[])
        yield* Effect.loop(0, {
          while: i => i < encoded.length,
          step: i => i + 2,
          body: i => pipe(
            lengthsRef.get,
            Effect.tap((lengths) => {
              lengths.push(Number.parseInt(encoded.slice(i, i + 2), 36))
            }),
          ),
          discard: true,
        })
        return yield* Ref.get(lengthsRef)
      })
    }

    function encode(...values: string[]) {
      return Effect.gen(function* () {
        const lengths = values.map(v => v.length)
        const seedKey = yield* generateRandomKey(10)
        const metaLength = values.length.toString(36).padStart(2, '0')
        const lengthsEncoded = yield* encodeLengths(lengths)

        const key = (metaLength + lengthsEncoded + seedKey).slice(0, 16)

        const seed = yield* hashString(key)
        const random = generateMulberry32(seed)

        const pointers = Array.makeBy(values.length, () => 0)
        const totalLength = lengths.reduce((a, b) => a + b, 0)

        const mixed = []
        const sourceMap = []

        while (mixed.length < totalLength) {
          const available = values.map((str, i) => pointers[i] < str.length)
          const options = available.map((ok, i) => (ok ? i : -1)).filter(i => i !== -1)
          const pick = options[Math.floor((yield* random) * options.length)]

          mixed.push(values[pick][pointers[pick]++])
          sourceMap.push(pick)
        }

        const result = yield* Effect.forEach(
          mixed,
          Effect.fn(function* (c) {
            return yield* shiftAlphaNumeric(c, Math.floor((yield* random) * alphaNumeric.length))
          }),
        ).pipe(Effect.map(_ => _.join('')))

        return {
          value: result,
          key,
        }
      })
    }

    function decode(value: string, key: string) {
      return Effect.gen(function* () {
        const metaLength = Number.parseInt(key.slice(0, 2), 36)
        const lengthCode = key.slice(2, 2 + metaLength * 2)
        const lengths = yield* decodeLengths(lengthCode)

        const seed = yield* hashString(key)
        const random = generateMulberry32(seed)

        const totalLength = value.length
        const pointers = Array.makeBy(metaLength, () => 0)
        const output = Array.makeBy(metaLength, () => '').map(() => [] as string[])

        const sourceMap = []

        let filled = 0
        while (filled < totalLength) {
          const available = lengths.map((len, i) => pointers[i] < len)
          const options = available.map((ok, i) => (ok ? i : -1)).filter(i => i !== -1)
          const pick = options[Math.floor((yield* random) * options.length)]
          sourceMap.push(pick)
          pointers[pick]++
          filled++
        }

        const unshifted = yield* Effect.forEach(
          value.split(''),
          Effect.fn(function* (c) {
            return yield* unshiftAlphaNumeric(c, Math.floor((yield* random) * alphaNumeric.length))
          }),
        )

        for (let i = 0; i < unshifted.length; i++) {
          const idx = sourceMap[i]
          output[idx].push(unshifted[i])
        }

        return output.map(chars => chars.join(''))
      })
    }

    return {
      /**
       * Encodes multiple strings into a mixed string with a key.
       * The key can be used to decode the mixed string back to the original strings.
       *
       * @param values - The strings to encode.
       */
      encode,

      /**
       * Decodes a mixed string back to the original strings using the provided key.
       *
       * @param value - The mixed string to decode.
       * @param key - The key used to encode the mixed string.
       */
      decode,
    }
  }),
}) {}
