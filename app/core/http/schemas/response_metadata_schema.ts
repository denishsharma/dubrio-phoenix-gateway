import { Schema } from 'effect'

/**
 * Schema for the default response metadata details.
 *
 * These details are common to all responses and are used to provide
 * additional information about the response.
 */
export const DefaultResponseMetadataDetails = Schema.Struct({
  request_id: Schema.String,
  timestamp: Schema.DateFromString.pipe(Schema.validDate()),
})

/**
 * Schema for the pagination response metadata details.
 *
 * This schema is used to define the structure of the metadata
 * when the response includes pagination information.
 */
export const PaginationResponseMetadataDetails = Schema.Struct({
  pagination: Schema.extend(
    Schema.Struct({
      page: Schema.Number,
      limit: Schema.Number,
      total_results_per_page: Schema.optional(Schema.Number),
    }),
    Schema.Union(
      /**
       * The structure of pagination metadata when using 'has_page' mode.
       * It includes information about the current page and whether there are more pages available.
       */
      Schema.Struct({
        mode: Schema.Literal('has_page'),
        has_next_page: Schema.Boolean,
        has_previous_page: Schema.Boolean,
      }),

      /**
       * The structure of pagination metadata when using 'is_numbered' mode.
       * It includes information about the total number of results and pages.
       */
      Schema.Struct({
        mode: Schema.Literal('is_numbered'),
        total_results: Schema.Number,
        total_pages: Schema.Number,
      }),
    ),
  ),
})
