import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import BooleanColumn from '#core/lucid/columns/boolean'
import EnumColumn from '#core/lucid/columns/enum'
import UsingLucidColumn from '#core/lucid/utils/using_lucid_column'
import Workspace from '#models/workspace_model'
import { OnboardingStatus } from '#modules/iam/constants/onboarding_status'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose } from '@adonisjs/core/helpers'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, beforeCreate, column, manyToMany } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import { defaultTo } from 'lodash-es'
import { ulid } from 'ulid'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder, SoftDeletes) {
  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    prefix: 'oat_',
    table: 'auth_access_tokens',
    type: 'auth_token',
    tokenSecretLength: 40,
  })

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
  declare isVerified: boolean

  @UsingLucidColumn(EnumColumn(() => ({ enum: OnboardingStatus, default: () => OnboardingStatus.NOT_STARTED })))
  declare onboardingStatus: OnboardingStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @manyToMany(() => Workspace, {
    pivotTable: 'workspace_members',
    pivotColumns: ['invited_by', 'joined_at'],
    pivotTimestamps: true,
  })
  declare workspace: ManyToMany<typeof Workspace>

  @beforeCreate()
  static assignUniqueIdentifier(user: User) {
    user.uid = defaultTo(user.uid, ulid())
  }
}
