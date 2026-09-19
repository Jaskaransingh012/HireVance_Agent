const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { extractIncomingMessages } = require('../src/services/whatsappService');

describe('WhatsApp Webhook Payload Parser', () => {
  test('extracts single text message correctly from Meta Cloud API payload', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550239999',
                  phone_number_id: '109999999999999',
                },
                contacts: [
                  {
                    profile: { name: 'Alice Developer' },
                    wa_id: '14155552671',
                  },
                ],
                messages: [
                  {
                    from: '14155552671',
                    id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI0',
                    timestamp: '1726760000',
                    text: {
                      body: 'I want remote backend jobs in Node.js and Go',
                    },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const messages = extractIncomingMessages(payload);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].from, '+14155552671');
    assert.equal(messages[0].text, 'I want remote backend jobs in Node.js and Go');
    assert.equal(messages[0].name, 'Alice Developer');
    assert.equal(messages[0].messageId, 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI0');
  });

  test('ignores status updates / read receipts gracefully', () => {
    const statusPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: 'wamid.123',
                    status: 'delivered',
                    timestamp: '1726760000',
                    recipient_id: '14155552671',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const messages = extractIncomingMessages(statusPayload);
    assert.equal(messages.length, 0);
  });
});
