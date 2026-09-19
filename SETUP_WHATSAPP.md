# WhatsApp Cloud API Setup Guide

This guide walks you through setting up the **free** WhatsApp Cloud API for your Job Agent.

---

## Step 1: Create a Meta Developer Account

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Click **Get Started** in the top right
3. Log in with your personal Facebook account (or create one)
4. Complete the developer registration

---

## Step 2: Create a WhatsApp Business App

1. From the [Meta for Developers dashboard](https://developers.facebook.com/apps), click **Create App**
2. Select **Business** as the app type
3. Fill in app details:
   - **App Name**: `Job Discovery Agent` (or any name you prefer)
   - **App contact email**: Your email
   - **Business Portfolio**: Select an existing one or create a new one
4. Click **Create App**

---

## Step 3: Add WhatsApp Product

1. In your new app's dashboard, scroll down to **Add products to your app**
2. Find **WhatsApp** and click **Set up**
3. You'll be redirected to the WhatsApp **Getting Started** page

---

## Step 4: Get Your Credentials

### A. Temporary Access Token (for testing)

On the **WhatsApp > Getting Started** page:

1. You'll see a **Temporary access token** displayed — copy it
2. This token expires in **24 hours** and is only for testing
3. Paste it into your `.env` file as `WHATSAPP_ACCESS_TOKEN`

### B. Phone Number ID

Still on the same page:

1. Under **From phone number ID**, you'll see a numeric ID (e.g., `109876543210123`)
2. Copy this **Phone Number ID**
3. Paste it into your `.env` file as `WHATSAPP_PHONE_NUMBER_ID`

### C. Test Recipient (Your WhatsApp Number)

1. Click **Add recipient phone number**
2. Enter your personal WhatsApp number in international format (e.g., `+14155552671`)
3. You'll receive a verification code on WhatsApp — enter it
4. Your number is now authorized to receive messages from this test app

---

## Step 5: Generate a Permanent Access Token (Production)

The temporary token expires in 24 hours. For production use:

1. Go to **WhatsApp > Configuration** in the left sidebar
2. Scroll to **Permanent tokens**
3. Click **Generate new token**
4. Select permissions: **`whatsapp_business_messaging`** and **`whatsapp_business_management`**
5. Copy the generated token and store it securely
6. Update your `.env` file: replace the temporary token with this permanent one

**⚠️ Important**: Never commit this token to Git. Keep it in `.env` only.

---

## Step 6: Set Up Webhook (Required for Incoming Messages)

The webhook allows your server to receive messages users send to the bot.

### A. Expose Your Local Server (Development)

If developing locally, use **ngrok** to create a public HTTPS URL:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

Copy the **HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### B. Configure Webhook in Meta Dashboard

1. Go to **WhatsApp > Configuration** in the left sidebar
2. Under **Webhook**, click **Edit**
3. Fill in:
   - **Callback URL**: `https://abc123.ngrok.io/webhook` (your ngrok URL + `/webhook`)
   - **Verify Token**: Any random string (e.g., `my_secure_verify_token_12345`)
4. Click **Verify and Save**

Meta will send a `GET` request to your server to verify the webhook. If your app is running, you'll see:

```
✓ Webhook verified successfully
```

### C. Subscribe to Messages

Still in **WhatsApp > Configuration**:

1. Under **Webhook fields**, click **Manage**
2. Check the box for **messages**
3. Click **Save**

Now your server will receive all incoming WhatsApp messages!

---

## Step 7: Update Your `.env` File

Your `.env` should now look like this:

```bash
DATABASE_URL=postgresql://jobagent:jobagent@localhost:5432/jobagent

# OpenRouter (FREE tier)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=109876543210123
WHATSAPP_VERIFY_TOKEN=my_secure_verify_token_12345
WHATSAPP_API_VERSION=v21.0

JOBS_CRON=*/30 * * * *
HACKATHONS_CRON=0 * * * *
PORT=3000
NODE_ENV=development
```

---

## Step 8: Test the Integration

### Start Your Server

```bash
docker compose up -d
# or locally:
npm run dev
```

### Send a Test Message

Open WhatsApp on your phone and message your test number (shown in Meta Dashboard):

```
I want remote backend engineer jobs with Node.js and Python
```

You should receive a response within a few seconds:

```
✅ Preferences Saved!

I'm now monitoring new openings for you:
• Roles: Backend Engineer
• Keywords: nodejs, python
• Location: Remote Only 🌐

🔔 You'll receive a WhatsApp alert whenever a high-match opportunity drops!
```

### Check Logs

```bash
docker compose logs -f app
# or locally: check terminal output
```

You should see:

```
[INFO] Incoming WhatsApp message from=+14155552671
[INFO] New user created phoneNumber=+14155552671
[INFO] User preferences updated
```

---

## Production Deployment

### Deploy to a VPS with a Public URL

When deploying to production (DigitalOcean, AWS, Hetzner, Render, Railway, etc.):

1. Deploy your app with Docker Compose on a server with a public IP
2. Set up a domain (e.g., `jobagent.yourdomain.com`) pointing to your server
3. Use **Caddy** or **nginx** with Let's Encrypt for automatic HTTPS
4. Update the webhook URL in Meta Dashboard to `https://jobagent.yourdomain.com/webhook`
5. No ngrok needed in production!

### Example `docker-compose.prod.yml` with Caddy

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config

  postgres:
    # ... same as before

  app:
    # ... same as before, no need to expose port 3000 externally

volumes:
  caddy_data:
  caddy_config:
  pgdata:
```

**Caddyfile**:

```
jobagent.yourdomain.com {
    reverse_proxy app:3000
}
```

Caddy automatically provisions SSL certificates from Let's Encrypt.

---

## Troubleshooting

### "Webhook verification failed"

- Make sure your server is running and accessible via the ngrok/public URL
- Check that `WHATSAPP_VERIFY_TOKEN` in `.env` matches what you entered in Meta Dashboard
- Check logs: `docker compose logs app` or terminal output

### "Messages not arriving"

- Verify webhook is subscribed to **messages** in Meta Dashboard
- Check that your phone number is added as a test recipient
- Check server logs for incoming webhook payloads
- Test webhook manually: `curl -X POST https://your-url/webhook -H "Content-Type: application/json" -d '{}'`

### "Access token expired"

- Temporary tokens expire in 24 hours
- Generate a **permanent token** (see Step 5 above)

### "Rate limit exceeded"

- Free tier: 1,000 conversations/month
- Each 24-hour conversation window with a user counts as 1 conversation
- Upgrade to paid tier if you exceed this (very cheap: ~$0.005-0.04 per conversation)

---

## Cost & Limits

### WhatsApp Cloud API Free Tier

- **1,000 service conversations per month** (free)
- A "conversation" = 24-hour window with a specific user
- After 1,000: ~$0.005-0.04 per conversation (varies by region)

### What Counts as a Conversation?

- User sends first message → starts a 24-hour window (counts as 1 conversation)
- All messages within that 24-hour window are free
- Your bot can send unlimited notifications within the window
- After 24 hours, if user messages again → new conversation

**Example**: If 50 users onboard and each receives 20 job alerts per month, but all alerts arrive within a few days of onboarding, you're using ~50 conversations/month (well within free tier).

---

## Next Steps

1. **Test with friends**: Have a few people message your bot to test multi-user functionality
2. **Monitor usage**: Check Meta Dashboard > WhatsApp > Analytics for conversation count
3. **Add more sources**: Edit `src/sources/registry.js` to track more companies
4. **Deploy to production**: Follow the production deployment guide above

---

## Additional Resources

- [WhatsApp Cloud API Official Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Meta Business Suite](https://business.facebook.com) — manage your app and view analytics
- [OpenRouter Docs](https://openrouter.ai/docs) — LLM API
- [Ngrok Docs](https://ngrok.com/docs) — local tunnel for development

---

**Questions?** Open an issue on GitHub or check the README troubleshooting section.
