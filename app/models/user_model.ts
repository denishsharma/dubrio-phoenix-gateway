import type { AccessToken } from '@adonisjs/auth/access_tokens'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import type { CamelCasedProperties, SnakeCasedProperties } from 'type-fest'
import TypedEffectService from '#core/effect/services/typed_effect_service'
import BooleanColumn from '#core/lucid/columns/boolean'
import EnumColumn from '#core/lucid/columns/enum'
import LucidModelRelationshipError from '#core/lucid/errors/lucid_model_relationship_error'
import LucidUtilityService from '#core/lucid/services/lucid_utility_service'
import UsingLucidColumn from '#core/lucid/utils/using_lucid_column'
import Workspace from '#models/workspace_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose } from '@adonisjs/core/helpers'
import is from '@adonisjs/core/helpers/is'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, beforeCreate, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import { Effect, pipe } from 'effect'
import { defaultTo } from 'lodash-es'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email', 'uid'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder, SoftDeletes) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  public currentAccessToken?: AccessToken

  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare uid: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string | null

  @column()
  declare email: string | null

  @column({ serializeAs: null })
  declare password: string | null

  @UsingLucidColumn(BooleanColumn(() => ({ default: () => false })))
  declare isAccountVerified: boolean

  @UsingLucidColumn(EnumColumn(() => ({ enum: OnboardingStatus, default: () => OnboardingStatus.NOT_STARTED })))
  declare onboardingStatus: OnboardingStatus

  @column()
  declare defaultWorkspaceId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ---------------------------
  // Relationships
  // ---------------------------

  @manyToMany(() => Workspace, {
    pivotTable: 'workspace_members',
    pivotColumns: [
      'invited_by',
      'joined_at',
      'is_active',
      'status',
    ],
    pivotTimestamps: true,
  })
  declare workspaces: ManyToMany<typeof Workspace>

  @belongsTo(() => Workspace, {
    foreignKey: 'default_workspace_id',
  })
  declare defaultWorkspace: BelongsTo<typeof Workspace>

  get $relations() {
    return new class {
      constructor(private readonly user: User) {}

      get workspaces() {
        return Effect.gen(this, function* () {
          const typedEffect = yield* TypedEffectService

          return yield* pipe(
            Effect.tryPromise({
              try: async () => {
                if (is.null(this.user.workspaces)) {
                  await this.user.loadOnce('workspaces')
                }
                return this.user.workspaces
              },
              catch: LucidModelRelationshipError.fromUnknownError(User.name, Workspace.name, 'workspaces'),
            }),
            Effect.flatMap(
              _ => Effect.gen(function* () {
                if (is.null(_)) {
                  return yield* new LucidModelRelationshipError({ model: User.name, relatedModel: Workspace.name, relationship: 'workspaces' })
                }
                return _
              }),
            ),
            typedEffect.overrideSuccessType<ManyToMany<typeof Workspace>>(),
          )
        })
      }

      get defaultWorkspace() {
        return Effect.gen(this, function* () {
          const typedEffect = yield* TypedEffectService

          return yield* pipe(
            Effect.tryPromise({
              try: async () => {
                if (is.null(this.user.defaultWorkspace)) {
                  await this.user.loadOnce('defaultWorkspace')
                }
                return this.user.defaultWorkspace
              },
              catch: LucidModelRelationshipError.fromUnknownError(User.name, Workspace.name, 'defaultWorkspace'),
            }),
            Effect.flatMap(
              _ => Effect.gen(function* () {
                if (is.null(_)) {
                  return yield* new LucidModelRelationshipError({ model: User.name, relatedModel: Workspace.name, relationship: 'defaultWorkspace' })
                }
                return _
              }),
            ),
            typedEffect.overrideSuccessType<BelongsTo<typeof Workspace>>(),
          )
        })
      }
    }(this)
  }

  // ---------------------------
  // Hooks
  // ---------------------------

  @beforeCreate()
  static assignIdentifier(user: User) {
    Effect.runSync(
      Effect.gen(function* () {
        const lucidUtility = yield* LucidUtilityService
        user.uid = defaultTo(user.uid, yield* lucidUtility.generateIdentifier)
      }).pipe(Effect.provide(LucidUtilityService.Default)),
    )
  }
}

/**
 * Type for the fields available in the User model.
 *
 * This is used to define the fields that are available
 * in the User model and to ensure that the
 * fields are correctly typed.
 */
export type UserModelFields = CamelCasedProperties<{
  id: User['id'];
  uid: User['uid'];
  firstName: User['firstName'];
  lastName: User['lastName'];
  email: User['email'];
  password: User['password'];
  isAccountVerified: User['isAccountVerified'];
  onboardingStatus: User['onboardingStatus'];
  defaultWorkspaceId: User['defaultWorkspaceId'];
  createdAt: User['createdAt'];
  updatedAt: User['updatedAt'];
  deletedAt: User['deletedAt'];
}>

/**
 * Type for mapping the fields of the User model to snake_case
 * helping with the database column names.
 *
 * This is used to ensure that the fields are correctly
 * mapped to the database column names
 */
export type UserTableColumns = SnakeCasedProperties<UserModelFields>
