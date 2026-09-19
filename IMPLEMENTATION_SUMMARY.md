# 🎉 Multi-User WhatsApp Job Agent - Complete Implementation

## ✅ What Was Built

Transformed the single-user Telegram job agent into a **multi-user WhatsApp-based conversational AI agent** with the following capabilities:

### Core Features
- **📱 WhatsApp Cloud API Integration** - Free tier (1,000 conversations/month)
- **🤖 Natural Language Onboarding** - Users set preferences via conversation, no forms
- **👥 Multi-User Architecture** - Each phone number = separate user with personalized filters
- **🔍 Comprehensive Sources**:
  - **Jobs**: Greenhouse (Stripe, Airbnb, OpenAI, Anthropic), Lever (Netflix, Reddit)
  - **Hackathons**: Devpost, Devfolio, MLH, Unstop, DoraHacks
- **🎯 Smart Matching** - Pre-AI filters + LLM relevance scoring
- **🚫 Strict Domain Restriction** - Refuses non-job/hackathon queries (security hardened)
- **🔒 Zero Duplicates** - Race-safe notification deduplication per user
- **💰 Cost Optimized** - Uses free models (meta-llama/llama-3.3-70b-instruct:free)

---

## 📁 Files Created/Modified

### New Files
```
src/services/userService.js              # Multi-user CRUD & phone normalization
src/services/whatsappService.js          # WhatsApp Cloud API integration
src/services/conversationService.js      # NL preference parsing + domain restriction
src/sources/hackathons/devfolioSource.js # Devfolio hackathons
src/sources/hackathons/mlhSource.js      # Major League Hacking
src/sources/hackathons/unstopSource.js   # Unstop (Dare2Compete)
src/sources/hackathons/doraHacksSource.js # DoraHacks Web3/AI hackathons
tests/userService.test.js                # User service tests
tests/multiUserNotification.test.js      # Multi-user dedup tests
tests/conversationService.test.js        # Command & domain restriction tests
tests/whatsappWebhook.test.js            # Webhook payload parsing tests
prisma/migrations/.../migration.sql      # Multi-user schema migration
SETUP_WHATSAPP.md                        # Step-by-step WhatsApp setup guide
```

### Modified Files
```
prisma/schema.prisma                     # User + Notification models (multi-user)
src/config.js                            # WhatsApp + OpenRouter config
src/server.js                            # WhatsApp webhook endpoints
src/services/discoveryService.js         # Multi-user pipeline
src/services/notificationService.js      # Per-user notifications
src/sources/registry.js                  # Added 5 hackathon sources
.env.example                             # WhatsApp Cloud API vars
docker-compose.yml                       # Updated env vars
package.json                             # Removed twilio, updated version
README.md                                # Complete rewrite for WhatsApp
tests/helpers/fakePrisma.js              # Multi-user support
tests/notification.test.js               # Updated for multi-user API
tests/discoveryPipeline.test.js          # Updated for multi-user API
tests/preferenceFilters.test.js          # Updated for multi-user API
```

---

## 🧪 Test Results

**All 34 tests passing:**
- ✅ User service & phone normalization (4 tests)
- ✅ Multi-user notification deduplication (3 tests)
- ✅ Conversation commands (help, status, pause, resume, clear) (4 tests)
- ✅ WhatsApp webhook payload parsing (2 tests)
- ✅ Opportunity deduplication (4 tests)
- ✅ Discovery pipeline (1 test)
- ✅ Fingerprint hashing (3 tests)
- ✅ URL canonicalization (5 tests)
- ✅ Preference filters (5 tests)
- ✅ Notification reservation & race conditions (3 tests)

```bash
npm test
# tests 34
# pass 34
# fail 0
```

---

## 🗄️ Database Schema Changes

### New `User` Table
Replaces single `UserPreference` with multi-user support:
- `phoneNumber` (unique) - E.164 format
- `desiredRoles`, `keywords`, `desiredLocations` - filters
- `isActive` - pause/resume
- `minimumRelevanceScore` - threshold
- `rawPrompt` - stores last natural language message

### Updated `Notification` Table
- Added `userId` foreign key
- New unique constraint: `(opportunityId, userId, channel, type)`
- Each user gets independent notifications per opportunity

---

## 🚀 How to Run

### 1. Setup Environment

```bash
cp .env.example .env
# Fill in: OPENROUTER_API_KEY, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
```

See [SETUP_WHATSAPP.md](SETUP_WHATSAPP.md) for detailed WhatsApp Cloud API setup.

### 2. Run with Docker

```bash
docker compose up -d
curl http://localhost:3000/health
```

### 3. Expose Webhook (Development)

```bash
ngrok http 3000
# Register https://xxx.ngrok.io/webhook in Meta Dashboard
```

### 4. Test on WhatsApp

Message your bot:
```
I want remote backend engineer roles with Node.js and Python, plus AI hackathons
```

Bot responds with confirmation and starts monitoring!

---

## 💬 Example Conversation

```
User: "I want remote backend jobs in Go and Rust"

Bot: ✅ Preferences Saved!

I'm now monitoring new openings for you:
• Roles: Backend Engineer
• Keywords: go, rust
• Location: Remote Only 🌐

🔔 You'll receive a WhatsApp alert whenever a high-match opportunity drops!

---

User: "status"

Bot: 📋 Your Current Opportunity Profile

*Status:* 🟢 Active (Receiving Alerts)
*Target Roles:* Backend Engineer
*Types:* JOB, INTERNSHIP, HACKATHON
*Locations:* Remote Only 🌐
*Key Skills/Tech:* go, rust
*Match Threshold:* 75%

---

User: "What's the weather?"

Bot: 🤖 Job & Event Discovery Agent

I am exclusively designed to help you discover Jobs, Internships, Hackathons, and Tech Events.

💡 Tell me what you're looking for!

---

User: "pause"

Bot: ⏸️ Alerts Paused

Your job and hackathon notifications have been paused.
Send *resume* or send any new preferences whenever you want to restart alerts!
```

---

## 🔒 Security Features

1. **Strict Domain Restriction** - LLM system prompt refuses non-job queries
2. **No Prompt Injection** - Scraped job descriptions treated as data only
3. **Webhook Verification** - Verify token prevents unauthorized POST
4. **Secret Management** - All credentials in `.env`, never committed
5. **Phone Number Normalization** - Consistent E.164 format
6. **Race-Safe Deduplication** - DB unique constraints prevent duplicates

---

## 💰 Cost Estimate

**Monthly costs for personal use (1-10 users):**
- WhatsApp Cloud API: **FREE** (1,000 conversations/month)
- OpenRouter (free model): **FREE** (rate-limited but sufficient)
- PostgreSQL: **FREE** (self-hosted)
- VPS (DigitalOcean/Hetzner): **$6-12/month**

**Total: ~$6-12/month**

To scale beyond free tier:
- Upgrade to paid OpenRouter models (~$0.50-1/month for moderate usage)
- WhatsApp beyond 1,000 conversations: ~$0.005-0.04 per conversation

---

## 📚 Documentation

- **[README.md](README.md)** - Complete project overview, API, testing, deployment
- **[SETUP_WHATSAPP.md](SETUP_WHATSAPP.md)** - Step-by-step WhatsApp Cloud API setup guide

---

## 🎯 Next Steps / Future Enhancements

- [ ] Add Indeed, LinkedIn, AngelList scrapers
- [ ] Rich WhatsApp messages with buttons (quick replies)
- [ ] Daily digest option (batch notifications)
- [ ] Admin dashboard (React + Prisma Studio)
- [ ] Multi-language support
- [ ] Company autocomplete

---

## 🙏 What You Can Do Now

1. **Test the bot** - Message it from your WhatsApp
2. **Add more companies** - Edit `src/sources/registry.js`
3. **Invite friends** - Share your bot's number
4. **Deploy to production** - Follow README deployment guide
5. **Star the repo** - Share with the community!

---

**Built with ❤️ using Node.js, PostgreSQL, Prisma, WhatsApp Cloud API, and OpenRouter**

---

## Quick Reference Commands

```bash
# Development
npm run dev                  # Start with auto-reload
npm test                     # Run all tests
npx prisma studio           # View database in browser

# Production
docker compose up -d         # Start services
docker compose logs -f app   # View logs
docker compose down          # Stop services

# Database
npx prisma migrate dev       # Run migrations (dev)
npx prisma migrate deploy    # Run migrations (prod)
npx prisma generate          # Regenerate Prisma client

# Admin API
GET  /health                 # Health check
GET  /opportunities          # List opportunities
GET  /stats                  # Stats dashboard
GET  /admin/users            # List all users
POST /admin/trigger          # Manual discovery trigger
```

---

**Everything is ready to deploy and use! 🚀**
