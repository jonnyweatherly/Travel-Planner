# Security Notice: API Keys and Client-Side Code

## ⚠️ Important Security Issue

The AI-powered search feature has been **temporarily disabled** due to a critical security vulnerability.

## The Problem

**API keys cannot be safely used in client-side JavaScript.** When you put an API key directly in your JavaScript code:

1. ✅ The `.env` file is ignored by git (good!)
2. ❌ But the API key was **hardcoded in app.js** which IS committed to git
3. ❌ Anyone who views your website can see the source code and steal your API key
4. ❌ The `.env` file **cannot be accessed** from browser JavaScript anyway

## Why This Happened

The `.env` file works great for **server-side** code (like `fetch-flights.js` running in Node.js), but **NOT** for client-side code (like `app.js` running in the browser).

## The Solution

To re-enable AI search securely, you need to implement a **backend API endpoint** that acts as a proxy:

### Option 1: Simple Backend Server (Recommended for Learning)

Create a simple Express.js server:

```javascript
// server.js
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('.')); // Serve your static files

app.post('/api/ai-search', async (req, res) => {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY, // Safe! Only on server
  });

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: req.body.messages,
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
```

Then update `app.js`:
```javascript
// Instead of calling Anthropic directly, call your server:
const response = await fetch('/api/ai-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [...] })
});
```

### Option 2: Serverless Functions (For Production)

Use platforms like:
- **Vercel Functions** (easiest for static sites)
- **Netlify Functions**
- **AWS Lambda**
- **Cloudflare Workers**

Example Vercel Function (`/api/ai-search.js`):
```javascript
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: req.body.messages,
  });

  res.json(response);
}
```

### Option 3: Remove AI Search (Quickest Fix)

If you don't need AI search right now:
1. The feature is already disabled (throws an error)
2. Users can still use the basic keyword search
3. You can re-enable it later when you have a backend

## What Was Changed

1. ✅ Removed hardcoded API key from `app.js`
2. ✅ Added error message explaining the issue
3. ✅ Commented out the insecure code
4. ✅ AI search now falls back to basic keyword search

## Next Steps

Choose one of the solutions above to re-enable AI search securely. For a simple static site, **Option 2 (Serverless Functions)** is the best choice.

## Questions?

- **Why can't I just read .env from JavaScript?** - `.env` files only work in Node.js (server-side). Browsers can't access them.
- **Why did GitHub block my push?** - GitHub detected an API key in your code and blocked it to protect you.
- **Is my old API key compromised?** - Yes, you should **rotate your Anthropic API key** immediately in the Anthropic console.

---

**Remember:** Never commit API keys, passwords, or secrets to git. Always use environment variables accessed from server-side code only.
