import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'node:crypto'
import Channels from '#models/channels_model'
import ProcessWhatsAppMessageJob from '#modules/channel/jobs/process_whatsapp_message_job'
import env from '#start/env'
import queue from '@rlanz/bull-queue/services/main'
import axios from 'axios'
// Optional: Import for sending messages

export default class ChannelController {
  async webhookWhatsappReceive({ request, response }: HttpContext) {
    try {
      const body = request.body()
      const signature = request.header('x-hub-signature-256')
      const appSecret = env.get('WHATSAPP_APP_SECRET')

      if (signature && appSecret) {
        const expectedSignature = crypto
          .createHmac('sha256', appSecret)
          .update(JSON.stringify(body))
          .digest('hex')

        if (signature !== `sha256=${expectedSignature}`) {
          return response.status(403).send('Invalid signature')
        }
      }

      if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
        const messages = body.entry[0].changes[0].value.messages
        const contacts = body.entry[0].changes[0].value.contacts || []

        for (const msg of messages) {
          const contact = contacts.find((c: any) => c.wa_id === msg.from)

          const jobPayload = {
            from: msg.from,
            messageId: msg.id,
            timestamp: msg.timestamp,
            messageType: msg.type || 'text',
            text: msg.text?.body || null,
            metadata: {
              contact: contact
                ? {
                    name: contact.profile?.name,
                    wa_id: contact.wa_id,
                  }
                : null,
              context: msg.context || null,
              rawMessage: msg,
            },
          }

          await queue.dispatch(ProcessWhatsAppMessageJob, jobPayload)
        }
      }

      if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
        // TODO: Handle status updates - message delivery, read receipts, etc.
      }

      return response.status(200).send('EVENT_RECEIVED')
    } catch (error) {
      console.error('❌ Error processing WhatsApp webhook:', error)
      return response.status(500).send('Internal Server Error')
    }
  }

  async webhookWhatsappVerify({ request, response }: HttpContext) {
    try {
      const mode = request.input('hub.mode')
      const token = request.input('hub.verify_token')
      const challenge = request.input('hub.challenge')

      if (mode === 'subscribe' && token === env.get('WHATSAPP_VERIFY_TOKEN')) {
        return response.status(200).send(challenge)
      } else {
        return response.status(403).send('Forbidden')
      }
    } catch (error) {
      console.error('❌ Error verifying WhatsApp webhook:', error)
      return response.status(500).send('Internal Server Error')
    }
  }

  async whatsappAuthCallback({ request, response }: HttpContext) {
    try {
      const code = request.input('code')
      const redirectUri = env.get('WHATSAPP_REDIRECT_URI') || 'https://f7c0-2600-8800-1000-5c00-1917-cb2a-f729-bab4.ngrok-free.app/channel/auth/whatsapp/callback'

      // Exchange code for access token
      const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: env.get('WHATSAPP_APP_ID'),
          client_secret: env.get('WHATSAPP_APP_SECRET'),
          redirect_uri: redirectUri,
          code,
        },
      })

      const { access_token: accessToken } = tokenRes.data

      // Try Method 1: Direct WhatsApp Business Account approach (if you know the WABA ID)
      // const whatsappBusinessAccountId = env.get('WHATSAPP_BUSINESS_ACCOUNT_ID')

      // if (whatsappBusinessAccountId) {
      //   try {
      //     const phoneNumbers = await axios.get(`https://graph.facebook.com/v19.0/${whatsappBusinessAccountId}/phone_numbers`, {
      //       params: {
      //         access_token: accessToken,
      //       },
      //     })

      //     // TODO: Save to database using Channels model
      //     return response.json({
      //       success: true,
      //       message: 'WhatsApp integration successful',
      //       data: {
      //         whatsappBusinessAccountId,
      //         phoneNumbers: phoneNumbers.data,
      //         accessToken,
      //       },
      //     })
      //   } catch (phoneError) {
      //     console.error('❌ Direct WABA approach failed:', phoneError)
      //   }
      // }

      // Method 2: Try with pages endpoint (might work if you have pages_manage_metadata permission)
      // try {
      //   const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      //     params: {
      //       access_token: accessToken,
      //       fields: 'id,name,access_token',
      //     },
      //   })

      //   if (pagesRes.data.data && pagesRes.data.data.length > 0) {
      //     for (const page of pagesRes.data.data) {
      //       try {
      //         const phoneNumbers = await axios.get(`https://graph.facebook.com/v19.0/${page.id}/phone_numbers`, {
      //           params: {
      //             access_token: page.access_token,
      //           },
      //         })

      //         if (phoneNumbers.data.data && phoneNumbers.data.data.length > 0) {
      //           // TODO: Save to database using Channels model
      //           return response.json({
      //             success: true,
      //             message: 'WhatsApp integration successful via pages',
      //             data: {
      //               pageId: page.id,
      //               pageName: page.name,
      //               phoneNumbers: phoneNumbers.data,
      //               accessToken: page.access_token,
      //             },
      //           })
      //         }
      //       } catch (phoneError) {
      //         console.error(`❌ Could not get phone numbers for page ${page.name}:`, phoneError)
      //       }
      //     }
      //   }
      // } catch (pagesError) {
      //   console.error('❌ Pages approach failed:', pagesError)
      // }

      // Method 3: Try business approach fetch business ID and owned WhatsApp accounts
      try {
        const businessDetails = await axios.get('https://graph.facebook.com/v19.0/me/businesses', {
          params: {
            access_token: accessToken,
          },
        })

        if (businessDetails.data.data && businessDetails.data.data.length > 0) {
          const targetBusiness = businessDetails.data.data.find(
            (b: any) => b.name === 'Phoenix Gateway',
          )

          if (!targetBusiness) {
            return response.json({
              success: false,
              message: 'No matching business found. Please ensure your app has the correct permissions.',
            })
          }

          const whatsappAccounts = await axios.get(`https://graph.facebook.com/v19.0/${targetBusiness.id}/owned_whatsapp_business_accounts`, {
            params: {
              access_token: accessToken,
            },
          })

          // fetch phone number ID

          const phoneNumberId = await axios.get(`https://graph.facebook.com/v19.0/${whatsappAccounts.data.data[0].id}/phone_numbers`, {
            params: {
              access_token: accessToken,
            },
          })

          // store in database
          const channel = await Channels.create({
            type: 'whatsapp',
            phoneNumberId: phoneNumberId.data.data[0].id,
            whatsappBusinessId: whatsappAccounts.data.data[0].id,
            accessToken,
            verifyToken: env.get('WHATSAPP_VERIFY_TOKEN'),
            graphVersion: 'v19.0',
          })

          // TODO: Save to database using Channels model
          return response.json({
            success: true,
            message: 'WhatsApp integration successful via business management',
            data: {
              businessId: targetBusiness.id,
              whatsappAccounts: whatsappAccounts.data,
              phoneNumbers: phoneNumberId.data,
              channelId: channel.id,
              accessToken,
            },
          })
        }
      } catch (businessError) {
        console.error('❌ Business management approach failed (requires business_management permission):', businessError)
      }

      // If all methods fail, return the access token for manual configuration
      return response.json({
        success: false,
        message: 'WhatsApp integration partially successful. Manual configuration required.',
        instructions: [
          '1. Your app needs "business_management" permission from Facebook',
          '2. Alternatively, provide WHATSAPP_BUSINESS_ACCOUNT_ID in your .env file',
          '3. Or ensure your app has "pages_manage_metadata" permission for pages approach',
        ],
        data: {
          accessToken,
          nextSteps: {
            envVariableNeeded: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            permissionsNeeded: [
              'business_management',
              'whatsapp_business_management',
              'pages_manage_metadata',
            ],
            appReviewUrl: 'https://developers.facebook.com/apps/YOUR_APP_ID/app-review/',
          },
        },
      })
    } catch (error) {
      console.error('❌ Error in WhatsApp auth callback:', error)
      return response.status(500).json({
        success: false,
        message: 'Authentication failed',
        error: error.message,
      })
    }
  }

  /**
   * Send a WhatsApp message using either the package or direct API
   */
  async sendWhatsAppMessage(phoneNumber: string, message: string, channelId?: number) {
    try {
      if (channelId) {
        // Get channel configuration from database
        const channel = await Channels.find(channelId)
        if (!channel) {
          throw new Error('Channel not found')
        }

        // Send via direct API call
        const response = await axios.post(
          `https://graph.facebook.com/v19.0/${channel.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: { body: message },
          },
          {
            headers: {
              'Authorization': `Bearer ${channel.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        )

        return response.data
      } else {
        // Alternative: Use the package (if installed and configured)
        // return await whatsapp.sendText(phoneNumber, message, {}, channelId)
        throw new Error('Channel ID required for sending messages')
      }
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error)
      throw error
    }
  }
}
