/**
 * Linq setup wizard — runs during `home onboard` to configure the channel.
 *
 * Walk the user through:
 *  1. Entering their Linq API token
 *  2. Selecting a from-number
 *  3. Creating the household group chat
 *  4. Writing config + env vars
 */

export type LinqSetupResult = {
  apiToken: string;
  fromNumber: string;
  groupChatId: string;
  webhookUrl: string;
};

export const LINQ_SETUP_INSTRUCTIONS = `
## Linq setup for Home

Home uses Linq to send and receive iMessage, RCS, and SMS messages.

### Steps

1. **Create a Linq account** at https://linqapp.com
2. **Get your API token** from the Linq dashboard → Settings → API Keys
3. **Note your From Number** (E.164 format, e.g. +12125551234)
4. **Set environment variables** in your shell profile or .env file:

   \`\`\`
   LINQ_API_TOKEN=your_token_here
   LINQ_FROM_NUMBER=+12125551234
   LINQ_WEBHOOK_SECRET=your_webhook_secret
   \`\`\`

5. **Register your webhook URL** in the Linq dashboard:

   \`\`\`
   https://your-home-server.example.com/webhooks/linq
   \`\`\`

6. **Run \`home setup linq\`** to create the household group chat and save its ID.

### Group chat

Once configured, run:

\`\`\`
home linq create-group --name "Home" --participants +1XXX,+1YYY
\`\`\`

This creates the iMessage group chat and saves the \`groupChatId\` to your config.
The landing page will link directly to this group.
`.trim();
