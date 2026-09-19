# WhatsApp Job & Hackathon Discovery Agent

A 24/7 AI-powered multi-user Jobs, Internships, Hackathons & Tech Events discovery agent that runs on WhatsApp. Users onboard via natural conversation, and the agent continuously monitors career portals, job boards, and hackathon platforms — alerting each user on WhatsApp the moment a matching opportunity opens up.

🆓 **Free tier**: Up to 1,000 WhatsApp conversations/month via Meta Cloud API + free LLM models on OpenRouter.

---

## ✨ Key Features

- **🤖 Conversational Setup** - No forms, no config files. Just text the bot: _"I want remote backend roles with Node.js and Python"_
- **📱 WhatsApp-Native** - All interactions happen on WhatsApp. No app to install.
- **👥 Multi-User** - Anyone can message the bot to set up their own personalized filters
- **🔍 Comprehensive Sources** - Greenhouse, Lever, Devpost, Devfolio, MLH, Unstop, DoraHacks (easy to add more)
- **🎯 Smart Matching** - Pre-AI filters + LLM relevance scoring against your exact preferences
- **🚫 Strict Domain** - Bot refuses non-job requests. No prompt injection risks.
- **🔒 Zero Duplicates** - Multi-layer deduplication ensures you never get the same opportunity twice
- **💰 Cost-Optimized** - Free WhatsApp tier + free LLM models. ~$6-7/month for VPS hosting.

---

## 🏗️ Architecture

```
User sends WhatsApp message
    ↓
Meta Cloud API webhook → conversationService (LLM parses preferences) → PostgreSQL User table
    ↓
node-cron Scheduler
    ↓
Discovery Sources (Greenhouse, Lever, Devpost, MLH, Unstop, DoraHacks, ...)
    ↓
Normalize → Deduplicate (fingerprint + canonical URL + externalId)
    ↓
For each active user:
    → Basic filters (location, remote, excluded companies, keywords)
    → AI relevance scoring (OpenRouter LLM)
    → WhatsApp notification (if score ≥ user's threshold)
    → Record in Notification table (unique per user+opportunity → no duplicates)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 16+ (or use Docker Compose)
- Meta Developer account (free) for WhatsApp Cloud API
- OpenRouter account (free tier available)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/job-agent.git
cd job-agent
npm install
```

### 2. Set Up WhatsApp Cloud API (Free)

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create a new app → Select **Business** type
3. Add **WhatsApp** product to your app
4. In WhatsApp > Getting Started:
   - Copy your **Temporary Access Token** (for testing) or generate a permanent one
   - Copy your **Phone Number ID**
   - Add your personal WhatsApp number to the test recipients
5. Save these for your `.env` file

### 3. Set Up OpenRouter (Free LLM API)

1. Go to [OpenRouter](https://openrouter.ai)
2. Sign up and navigate to **Keys**
3. Create a new API key
4. Use the free model: `meta-llama/llama-3.3-70b-instruct:free` (or upgrade to paid models later)

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```bash
DATABASE_URL=postgresql://jobagent:jobagent@localhost:5432/jobagent

# OpenRouter (FREE tier available)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# WhatsApp Cloud API (FREE 1,000 conversations/month)
WHATSAPP_ACCESS_TOKEN=your_access_token_from_meta_dashboard
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_from_meta_dashboard
WHATSAPP_VERIFY_TOKEN=choose_any_random_secure_string
```

### 5. Run with Docker (Recommended)

```bash
docker compose up -d
```

This starts:
- PostgreSQL database
- Node.js app with auto-migrations
- Server listening on `http://localhost:3000`

Check health:
```bash
curl http://localhost:3000/health
```

### 6. Set Up WhatsApp Webhook

**For local development**, use ngrok:

```bash
ngrok http 3000
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

**In Meta Dashboard** → WhatsApp > Configuration:
1. Set **Webhook URL**: `https://abc123.ngrok.io/webhook`
2. Set **Verify Token**: (same value you put in `.env` as `WHATSAPP_VERIFY_TOKEN`)
3. Click **Verify and Save**
4. Subscribe to webhook field: **messages**

**For production**, deploy to a VPS with a public URL (no ngrok needed).

---

## 📱 How to Use

### First Time: Onboard via WhatsApp

Send a message to your WhatsApp test number (configured in Meta dashboard):

```
"I want remote Backend Engineer roles with Node.js, Python, and TypeScript. Also alert me for AI hackathons with prizes over $5k."
```

The bot replies:

```
✅ Preferences Saved!

I'm now monitoring new openings for you:
• Roles: Backend Engineer
• Types: JOB, HACKATHON
• Keywords: nodejs, python, typescript, ai, prizes
• Location: Remote Only 🌐

🔔 You'll receive a WhatsApp alert whenever a high-match opportunity drops!
```

### Commands

| Command | Description |
|---------|-------------|
| `help`, `start`, `menu` | Show help message |
| `status`, `profile` | View your current filters |
| `pause`, `stop` | Pause notifications |
| `resume`, `restart` | Resume notifications |
| `clear`, `reset` | Delete all your filters |
| Any natural language | Update your preferences |

### Example Conversations

**Update preferences:**
```
You: "Also include Frontend roles and React"
Bot: ✅ Updated! Now tracking: Backend Engineer, Frontend Engineer. Keywords: nodejs, python, typescript, react, ai...
```

**Check status:**
```
You: "status"
Bot: 📋 Your Current Opportunity Profile

*Status:* 🟢 Active (Receiving Alerts)
*Target Roles:* Backend Engineer, Frontend Engineer
*Types:* JOB, HACKATHON
*Locations:* Remote Only 🌐
...
```

**Off-topic (strict domain):**
```
You: "What's the weather today?"
Bot: 🤖 Job & Event Discovery Agent

I am exclusively designed to help you discover Jobs, Internships, Hackathons, and Tech Events.

💡 Tell me what you're looking for! For example:
• "Looking for remote Backend or Full-stack roles in Node.js and Go"
...
```

---

## 🛠️ Development (Without Docker)

```bash
# Install dependencies
npm install

# Start PostgreSQL (or use Docker for just the DB)
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=jobagent \
  -e POSTGRES_PASSWORD=jobagent \
  -e POSTGRES_DB=jobagent \
  postgres:16-alpine

# Run migrations
npx prisma migrate dev

# Start development server (auto-restart on file changes)
npm run dev
```

---

## 📊 API Endpoints (Admin/Monitoring)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + DB connectivity |
| `GET /opportunities?type=JOB&limit=50` | List discovered opportunities |
| `GET /stats` | Total opportunities, users, notifications, breakdown by type/source |
| `GET /admin/users` | List all registered users + their preferences |
| `POST /admin/trigger` | Manually trigger discovery cycle (for testing) |

---

## 🎯 Adding More Sources

Edit `src/sources/registry.js`:

### Add a Greenhouse company:
```javascript
new GreenhouseSource({ boardToken: 'shopify', companyName: 'Shopify' }),
```

### Add a Lever company:
```javascript
new LeverSource({ companySlug: 'github', companyName: 'GitHub' }),
```

### Add a custom HTML scraper:
```javascript
const GenericHtmlSource = require('./jobs/genericHtmlSource');

new GenericHtmlSource({
  name: 'acme',
  companyName: 'Acme Corp',
  url: 'https://acme.example.com/careers',
  listSelector: '.job-listing',
  titleSelector: '.job-title',
  linkSelector: 'a',
  locationSelector: '.job-location',
}),
```

No other code changes needed — the discovery pipeline automatically picks up new sources.

---

## 🧪 Testing

```bash
npm test
```

Tests include:
- ✅ User creation and preference updates
- ✅ Multi-user notification deduplication (no duplicates per user)
- ✅ Concurrent workers handling the same opportunity
- ✅ Pause/resume without duplicate notifications
- ✅ URL canonicalization and fingerprinting
- ✅ Basic filter logic

All tests use an in-memory fake Prisma client — no real DB or external APIs needed.

---

## 💰 Cost Breakdown (Monthly)

| Service | Free Tier | Cost After Free Tier |
|---------|-----------|---------------------|
| **WhatsApp Cloud API** | 1,000 conversations | $0.005 - $0.04 per conversation |
| **OpenRouter (free model)** | Unlimited* | $0 |
| **OpenRouter (Claude Sonnet)** | N/A | ~$3 per 1M tokens (~$0.50-1/month for moderate usage) |
| **PostgreSQL (self-hosted)** | Free | Included in VPS cost |
| **VPS (DigitalOcean, Hetzner, etc.)** | N/A | $6-12/month |

**Total for personal use**: ~$6-7/month (VPS only, using free tiers)

*OpenRouter free models have rate limits but are sufficient for a personal job agent checking 10-20 sources hourly.

---

## 🔒 Security & Privacy

- All secrets stored in `.env` (never committed, see `.gitignore`)
- WhatsApp messages are end-to-end encrypted by Meta (we only receive the plaintext via webhook)
- Phone numbers stored in PostgreSQL for user identification
- LLM system prompt explicitly refuses prompt injection attempts embedded in scraped job descriptions
- Webhook verify token prevents unauthorized POST requests
- All scraped content treated as untrusted data

---

## 🗂️ Project Structure

```
src/
  server.js                  Express app + WhatsApp webhook + API
  config.js                  Env var loading
  db/prisma.js               Shared PrismaClient singleton
  
  services/
    userService.js           Multi-user CRUD + phone number normalization
    whatsappService.js       WhatsApp Cloud API send + webhook parsing
    conversationService.js   Natural language preference extraction (LLM)
    discoveryService.js      Main pipeline orchestrator (multi-user)
    deduplicationService.js  Fingerprint/URL/externalId dedup
    notificationService.js   WhatsApp notifications + reservation pattern
    normalizationService.js  Clean & shape raw opportunity data
    aiService.js             OpenRouter LLM relevance scoring
  
  sources/
    registry.js              Add/remove sources here
    baseSource.js            Abstract source contract
    jobs/
      greenhouseSource.js    Greenhouse public JSON API
      leverSource.js         Lever public JSON API
      genericHtmlSource.js   Template for static HTML career pages (Cheerio)
      playwrightHtmlSource.js Template for JS-rendered pages (Playwright)
    hackathons/
      devpostSource.js       Devpost JSON API
      devfolioSource.js      Devfolio HTML scraping
      mlhSource.js           Major League Hacking HTML scraping
      unstopSource.js        Unstop (Dare2Compete) HTML scraping
      doraHacksSource.js     DoraHacks JSON API
  
  scheduler/scheduler.js     node-cron job scheduling + overlap guards
  
  utils/
    logger.js                Minimal structured logger (auto-redacts secrets)
    httpClient.js            Axios wrapper with retries
    url.js                   URL canonicalization (strips tracking params)
    hashing.js               SHA-256 fingerprinting

prisma/
  schema.prisma              DB schema: User, Opportunity, Notification, Source
  migrations/                SQL migrations

tests/
  userService.test.js        User CRUD tests
  multiUserNotification.test.js  Deduplication under concurrency
  deduplication.test.js      Fingerprint and URL dedup
  preferenceFilters.test.js  Basic filter logic (converted to multi-user in discoveryService)
  url.test.js                URL canonicalization
  hashing.test.js            Fingerprint generation
  helpers/
    fakePrisma.js            In-memory Prisma mock for tests
    injectFakePrisma.js      Inject fake into require cache
```

---

## 🚧 Roadmap / Future Enhancements

- [ ] Add Indeed, LinkedIn, Glassdoor, AngelList scrapers
- [ ] Support for location autocomplete (Google Places API)
- [ ] Rich WhatsApp messages with buttons (quick replies for pause/resume)
- [ ] Daily digest option (batch notifications once per day)
- [ ] Admin dashboard (React + Prisma Studio)
- [ ] Dockerized deployment guide for AWS/GCP/Azure
- [ ] Multi-language support (detect user language from WhatsApp locale)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ❓ FAQ

**Q: Can I use Twilio instead of WhatsApp Cloud API?**  
A: Yes, but Twilio's WhatsApp sandbox is free for 72 hours only, then requires a paid account (~$0.005/msg). The code originally had Twilio support (now removed) — see git history if you want to re-add it.

**Q: Can I use OpenAI directly instead of OpenRouter?**  
A: Yes. Replace `config.openrouter` with OpenAI config and point the OpenAI SDK at `https://api.openai.com/v1`. OpenRouter is recommended for access to free models and 50+ providers with one API key.

**Q: How do I deploy this to production?**  
A: Deploy to any VPS (DigitalOcean, AWS, GCP, Hetzner, Render, Railway, etc.) with Docker + docker-compose. Make sure your server has a public HTTPS URL and register it as the WhatsApp webhook in Meta Dashboard.

**Q: What if a source changes its HTML structure?**  
A: HTML scrapers (Devfolio, MLH, Unstop) may break if those sites redesign. Update the CSS selectors in the respective source file, or switch to Playwright if they move to client-side rendering.

**Q: Can this scale to 1,000+ users?**  
A: Yes, but you'll exceed WhatsApp's free tier (1,000 conversations/month). Architecture-wise, add a job queue (Bull/BullMQ) and scale horizontally with multiple worker processes. Current single-process design is intentional for simplicity.

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/job-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/job-agent/discussions)

---

**Built with ❤️ by [JASKARAN SINGH](https://github.com/Jaskaransingh012)**
