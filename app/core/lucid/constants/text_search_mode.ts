import type { InferValue } from 'better-enums'
import { Enum } from 'better-enums'

export const TEXT_SEARCH_MODE = Enum({
  /**
   * Use fulltext search to search for the given text.
   */
  FULLTEXT: 'fulltext',

  /**
   * Use the LIKE operator to search for the given text.
   */
  LIKE: 'like',

  /**
   * Use exact matching to search for the given text.
   */
  EXACT: 'exact',
})

export type TextSearchMode = InferValue<typeof TEXT_SEARCH_MODE>
export const TextSearchMode = TEXT_SEARCH_MODE.accessor
