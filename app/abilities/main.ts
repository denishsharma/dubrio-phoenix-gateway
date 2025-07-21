/*
|--------------------------------------------------------------------------
| Bouncer abilities
|--------------------------------------------------------------------------
|
| You may export multiple abilities from this file and pre-register them
| when creating the Bouncer instance.
|
| Pre-registered policies and abilities can be referenced as a string by their
| name. Also they are must if want to perform authorization inside Edge
| templates.
|
*/

import type User from '#models/user_model'
import type Workspace from '#models/workspace_model'
import { Bouncer } from '@adonisjs/bouncer'
import { Effect } from 'effect'

/**
 * Delete the following ability to start from
 * scratch
 */
// export const editUser = Bouncer.ability(() => {
//   return true,
// })

// export const workspaceBouncer = Bouncer.ability(async (user: User, workspace: Workspace) => {
//   const isMember = await user
//     .related('workspaces')
//     .query()
//     .where('workspace_id', workspace.id)
//     .first()
//   return isMember !== null
// })

export const workspaceBouncer = Bouncer.ability((user: User, workspace: Workspace) => {
  return Effect.runPromise(
    Effect.gen(function* () {
      const isMember = yield* Effect.promise(() =>
        user
          .related('workspaces')
          .query()
          .where('workspace_id', workspace.id)
          .first(),
      )
      return isMember !== null
    }),
  )
},
)
