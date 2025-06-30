import router from '@adonisjs/core/services/router'

const ChannelController = () => import('#modules/channel/controllers/channel_controller')

router.group(() => {
  // WhatsApp webhook endpoints
  router.post('/webhook/whatsapp', [ChannelController, 'webhookWhatsappReceive'])
  router.get('/webhook/whatsapp', [ChannelController, 'webhookWhatsappVerify'])

  // WhatsApp OAuth callback
  router.get('/auth/whatsapp/callback', [ChannelController, 'whatsappAuthCallback'])
}).prefix('channel')
