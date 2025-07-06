import type { TaggedEnum } from '#types/tagged_enum'
import UnknownError from '#core/error/errors/unknown_error'
import is from '@adonisjs/core/helpers/is'
import { Effect, Option, pipe } from 'effect'
import { has } from 'lodash-es'

/**
 * A unique symbol used to mark the `DataSource` type.
 * This symbol is used to differentiate the `DataSource` type from tagged enums.
 */
export const DATA_SOURCE_MARKER: unique symbol = Symbol('@constant/enum/data_source')

/**
 * The shape of the `DataSource` type used to define the structure
 * of the data source that can be accepted.
 */
export interface DataSourceShape<T = unknown> {
  known: { source: T };
  unknown: { source: unknown };
}

/**
 * The `DataSource` type is a tagged enum that represents the different
 * types of data sources that can be accepted.
 */
export type DataSource<T = unknown> = TaggedEnum<DataSourceShape<T>, typeof DATA_SOURCE_MARKER>

function markDataSource<T = unknown>(source: DataSource<T>) {
  return Object.defineProperty(source, DATA_SOURCE_MARKER, {
    get() { return DATA_SOURCE_MARKER },
  }) as DataSource<T>
}

/**
 * DataSource is a tagged enum that represents the different types of data sources
 * that can be accepted.
 *
 * It is a holder for various data sources, such as known and unknown data sources.
 */
export const DataSource = {
  /**
   * The data source is known and has a specific type.
   *
   * @param source - The known data source.
   */
  known: <T>(source: T) => markDataSource(({ source, _tag: 'known' }) as DataSource<T>),

  /**
   * The data source is unknown and has a generic or unspecified type.
   *
   * @param source - The unknown data source.
   */
  unknown: <T = unknown>(source: unknown) => markDataSource(({ source, _tag: 'unknown' }) as DataSource<T>),

  /**
   * Check if the given data source is of a specific type of data source
   * by comparing the `_tag` property.
   *
   * @param tag - The tag to check against.
   */
  $is: <T extends DataSource['_tag']>(tag: T) => <K = unknown>(source: DataSource<K>): source is Extract<DataSource<K>, { _tag: T }> => {
    return source._tag === tag
  },

  /**
   * Match the given data source against a specific type of data source
   * and return the result of the matching function.
   *
   * @param source - The data source to match.
   * @param matcher - The object containing the matching functions for each type of data source.
   */
  $match: <K, T extends { readonly [M in DataSource['_tag']]: (source: Extract<DataSource<K>, { _tag: M }>) => any }>(source: DataSource<K>, matcher: T): Option.Option<ReturnType<T[DataSource['_tag']]>> => {
    if (has(matcher, source._tag)) {
      return Option.some(matcher[source._tag](source as any) as ReturnType<T[DataSource['_tag']]>)
    }
    return Option.none<ReturnType<T[DataSource['_tag']]>>()
  },

  /**
   * Check if the given data source is a valid data source
   * by checking if it has the `DATA_SOURCE_MARKER` property.
   *
   * @param source - The data source to check.
   */
  $isDataSource: <T = unknown>(source: DataSource<T>): source is DataSource<T> => {
    return !is.nullOrUndefined(source)
      && is.object(source)
      && has(source, DATA_SOURCE_MARKER)
      && source[DATA_SOURCE_MARKER] === DATA_SOURCE_MARKER
  },

  /**
   * Resolve the data source to its actual value.
   * If the data source is valid, it returns the source value.
   *
   * @param source - The data source to resolve.
   */
  $resolveDataSource: <T = unknown>(source: DataSource<T>) => {
    return Effect.gen(function* () {
      return yield* pipe(
        DataSource.$match(source, {
          known: ({ source: src }) => src,
          unknown: ({ source: src }) => src as T,
        }),
        Option.match({
          onSome: data => Effect.succeed(data),
          onNone: () => new UnknownError('DataSource is not a valid data source.'),
        }),
      )
    })
  },
}
