const axios = require('axios');
const config = require('../config');
const { makeLogger } = require('../utils/logger');

const logger = makeLogger('whatsapp');

/**
 * Send a WhatsApp text message via Meta's WhatsApp Cloud API.
 *
 * Free tier: Up to 1,000 service conversations per month.
 *
 * API endpoint: https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages
 */
async function sendWhatsAppMessage(to, text) {
  if (!config.whatsapp.accessToken || !config.whatsapp.phoneNumberId) {
    logger.warn('WhatsApp Cloud API not configured - skipping message send', {
      to,
      hasToken: Boolean(config.whatsapp.accessToken),
      hasPhoneId: Boolean(config.whatsapp.phoneNumberId),
    });
    return { ok: false, skipped: true, reason: 'WhatsApp credentials not configured' };
  }

  // Meta Cloud API expects phone number without '+' or 'whatsapp:' prefix (e.g. "14155552671")
  const formattedTo = to.replace(/^whatsapp:/i, '').replace(/^\+/, '').trim();

  const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'text',
        text: {
          preview_url: true,
          body: text,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    logger.info('WhatsApp message sent successfully', {
      to: formattedTo,
      messageId: response.data?.messages?.[0]?.id,
    });

    return { ok: true, data: response.data };
  } catch (err) {
    const errorDetails = err.response?.data?.error || err.message;
    logger.error('WhatsApp API send error', {
      to: formattedTo,
      error: errorDetails,
    });
    throw new Error(`WhatsApp API error: ${JSON.stringify(errorDetails)}`);
  }
}

/**
 * Handle Webhook Verification (GET /webhook) from Meta.
 * Meta sends: hub.mode=subscribe, hub.verify_token=..., hub.challenge=...
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  } else {
    logger.warn('WhatsApp webhook verification failed - token mismatch or invalid mode', {
      receivedToken: token,
      expectedToken: config.whatsapp.verifyToken,
    });
    return res.sendStatus(403);
  }
}

/**
 * Extract incoming message payloads from a WhatsApp Cloud API webhook event.
 * Returns an array of { from, text, messageId, timestamp, name }.
 */
function extractIncomingMessages(webhookBody) {
  const messages = [];

  if (webhookBody.object !== 'whatsapp_business_account') {
    return messages;
  }

  const entries = webhookBody.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      if (!value || !value.messages) continue;

      const contacts = value.contacts || [];
      const contactMap = new Map();
      for (const c of contacts) {
        contactMap.set(c.wa_id, c.profile?.name || null);
      }

      for (const msg of value.messages) {
        // Only handle text messages or button/interactive replies for now
        let text = null;
        if (msg.type === 'text') {
          text = msg.text?.body;
        } else if (msg.type === 'interactive') {
          text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title;
        } else if (msg.type === 'button') {
          text = msg.button?.text;
        }

        if (text) {
          messages.push({
            from: `+${msg.from}`, // E.164 format
            text: text.trim(),
            messageId: msg.id,
            timestamp: msg.timestamp,
            name: contactMap.get(msg.from) || null,
          });
        }
      }
    }
  }

  return messages;
}

module.exports = {
  sendWhatsAppMessage,
  verifyWebhook,
  extractIncomingMessages,
};
