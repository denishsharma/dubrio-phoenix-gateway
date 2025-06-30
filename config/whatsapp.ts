import env from '#start/env'
import { defineConfig } from '@brighthustle/adonisjs-whatsapp'

const whatsappConfig = defineConfig({
  provider: 'lucid',
  config: {

    webhookRoute: '/webhook/whatsapp',
    timeout: 60_000,
    graphUrl: 'https://graph.facebook.com',
    graphVersion: 'v18.0',

  },

  db: {
    dbName: env.get('DB_DATABASE'),
    tableName: 'whatsapp',
    connectionName: env.get('DB_CONNECTION', 'mysql'),
  },

})

export default whatsappConfig
