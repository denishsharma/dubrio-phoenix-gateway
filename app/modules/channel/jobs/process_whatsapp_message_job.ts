import { Job } from '@rlanz/bull-queue'

interface WhatsAppMessagePayload {
  from: string;
  messageId: string;
  timestamp: string;
  text?: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  metadata?: any;
}

export default class ProcessWhatsAppMessageJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  async handle(payload: WhatsAppMessagePayload) {
    console.log('🔄 Processing WhatsApp message from job queue')
    console.log('📱 From:', payload.from)
    console.log('💬 Message Type:', payload.messageType)
    console.log('📝 Text:', payload.text)
    console.log('🕐 Timestamp:', payload.timestamp)
    console.log('🆔 Message ID:', payload.messageId)
    console.log('📊 Full payload:', JSON.stringify(payload, null, 2))

    // TODO: Add your business logic here
    // - Save message to database
    // - Process message content
    // - Send auto-replies
    // - Forward to other services

    console.log('✅ WhatsApp message processed successfully')
  }

  async rescue(payload: unknown, error: Error) {
    console.error('❌ Error processing WhatsApp message:', error)
    console.error('📋 Payload:', payload)
  }
}
