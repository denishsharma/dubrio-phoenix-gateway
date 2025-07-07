import crypto from 'node:crypto'
import { HashAlgorithm } from '#shared/common/constants/hash_algorithm'
import { MessageBuilder } from '@adonisjs/core/helpers'
import { Effect, Match } from 'effect'

export default class HashService extends Effect.Service<HashService>()('@service/shared/common/hash', {
  effect: Effect.gen(function* () {
    const builder = new MessageBuilder()

    function hashSha256(data: unknown) {
      return Effect.sync(() => {
        const message = builder.build(data)
        return crypto.createHash('sha256').update(message).digest('hex')
      })
    }

    function compareSha256(data: unknown, hashed: string) {
      return Effect.sync(() => {
        const message = builder.build(data)
        const digest = crypto.createHash('sha256').update(message).digest('hex')
        return digest === hashed
      })
    }

    function hashSha512(data: unknown) {
      return Effect.sync(() => {
        const message = builder.build(data)
        return crypto.createHash('sha512').update(message).digest('hex')
      })
    }

    function compareSha512(data: unknown, hashed: string) {
      return Effect.sync(() => {
        const message = builder.build(data)
        const digest = crypto.createHash('sha512').update(message).digest('hex')
        return digest === hashed
      })
    }

    function hashMd5(data: unknown) {
      return Effect.sync(() => {
        const message = builder.build(data)
        return crypto.createHash('md5').update(message).digest('hex')
      })
    }

    function compareMd5(data: unknown, hashed: string) {
      return Effect.sync(() => {
        const message = builder.build(data)
        const digest = crypto.createHash('md5').update(message).digest('hex')
        return digest === hashed
      })
    }

    function hash(algorithm: HashAlgorithm, data: unknown) {
      return Match.value(algorithm).pipe(
        Match.when(HashAlgorithm.SHA256, () => hashSha256(data)),
        Match.when(HashAlgorithm.SHA512, () => hashSha512(data)),
        Match.when(HashAlgorithm.MD5, () => hashMd5(data)),
        Match.orElseAbsurd,
      )
    }

    function compare(algorithm: HashAlgorithm, data: unknown, hashed: string) {
      return Match.value(algorithm).pipe(
        Match.when(HashAlgorithm.SHA256, () => compareSha256(data, hashed)),
        Match.when(HashAlgorithm.SHA512, () => compareSha512(data, hashed)),
        Match.when(HashAlgorithm.MD5, () => compareMd5(data, hashed)),
        Match.orElseAbsurd,
      )
    }

    return {
      hash,
      compare,
    }
  }),
}) {}
