# Home 🏡

**Don't Stress, get home.**

Household and couples life admin — over your group text.

Calendars, school triage, meal planning, helper payments, home maintenance, and more. Delivered over iMessage, RCS, or SMS via [Linq](https://linqapp.com).

---

## How it works

1. Home runs as an AI agent on OpenClaw
2. Your household group text (iMessage/SMS via Linq) is the interface
3. Text Home like you'd text a capable friend who manages your house
4. The landing page gives anyone a one-tap link to open the group chat

---

## Quick start

```bash
git clone <this repo>
cd home
npm run setup
```

The setup script walks you through:
- Installing OpenClaw
- Copying the Home workspace
- Configuring your Linq API credentials
- Registering the webhook URL
- Creating the household group chat

---

## Stack

| Layer | Tech |
|---|---|
| Agent runtime | [OpenClaw](https://openclaw.ai) |
| Household workspace | [Tradclaw](https://github.com/tradclaw/tradclaw) (adapted) |
| Messaging channel | [Linq](https://linqapp.com) (iMessage / RCS / SMS / MMS) |
| Landing page | Vanilla HTML/CSS/JS |

---

## Project layout

```
home/
├── extensions/
│   └── linq/               # Linq channel plugin for OpenClaw
│       ├── src/
│       │   ├── client.ts   # Linq REST API client
│       │   ├── webhook.ts  # Inbound webhook handler
│       │   ├── channel.ts  # OpenClaw channel implementation
│       │   ├── config.ts   # Account config resolution
│       │   ├── types.ts    # API types
│       │   └── setup.ts    # Setup instructions
│       ├── index.ts
│       ├── api.ts
│       ├── runtime-api.ts
│       └── openclaw.plugin.json
├── workspace/              # Home agent workspace (loads into ~/.openclaw/workspace)
│   ├── AGENTS.md           # Session bootstrap + household rules
│   ├── SOUL.md             # Persona + safety boundaries
│   ├── IDENTITY.md         # Name: Home 🏡
│   ├── USER.md             # Who the household is
│   ├── TOOLS.md            # Linq group chat + calendar + helper config
│   ├── HEARTBEAT.md        # Daily scheduled check
│   ├── MEMORY.md           # Durable household context
│   └── resources/          # Meal plans, school, homework, home maintenance, etc.
├── ui/
│   └── landing/            # Landing page
│       ├── index.html
│       ├── style.css
│       └── app.js          # Profile + "Text Home" deeplink
├── scripts/
│   └── setup.mjs           # Interactive setup wizard
└── package.json
```

---

## Linq setup

1. Create an account at [linqapp.com](https://linqapp.com)
2. Get your API token from Settings → API Keys
3. Set environment variables:

```bash
export LINQ_API_TOKEN=your_token
export LINQ_FROM_NUMBER=+12125551234
export LINQ_WEBHOOK_SECRET=your_webhook_secret
```

4. Register your webhook in the Linq dashboard:
   ```
   https://your-server.example.com/webhooks/linq
   ```

5. Create the household group chat:
   ```bash
   home linq create-group --name "Home" --participants +1XXX,+1YYY
   ```

---

## Landing page config

The landing page reads `window.HOME_CONFIG` at runtime. Inject it from your server:

```html
<script>
  window.HOME_CONFIG = {
    name: "The Smiths",          // household name
    emoji: "🏡",
    bio: "Family of 4 in Brooklyn.",
    phoneNumber: "+12125551234", // your Linq from-number
    groupSmsLink: null           // optional: override with a pre-built group link
  };
</script>
```

On mobile, tapping **Text Home** opens the Messages app directly.
On desktop, it shows the phone number instead.

---

## Onboarding a new household

After running `npm run setup`, fill in `workspace/TOOLS.md` with:
- Linq group chat ID
- Calendar names
- School contact info
- Household helpers (cleaner, nanny, etc.)
- Shopping preferences
- Home maintenance details

The agent reads this file every session to understand your household.
