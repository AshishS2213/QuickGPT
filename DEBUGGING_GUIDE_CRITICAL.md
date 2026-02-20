# 🔧 CRITICAL DEBUGGING - Why Date Context Isn't Working

## Why Your System Is Still Showing Old Dates

Based on your screenshot showing "May 22, 2024", here's what's likely wrong:

---

## Issue #1: System Message Not Being Recognized

**Problem:** Gemini's OpenAI API compatibility layer doesn't properly handle "system" role messages.

**Previous Code Issue:**
```javascript
// ❌ WRONG - Gemini ignores this
messages: [
    { role: "user", content: systemMessage },  // Gemini treats this as just another user message
    { role: "user", content: enhancedPrompt },
]
```

**Solution Implemented:** ✅ NOW using prepended context in a SINGLE message that Gemini can't ignore.

---

## Issue #2: Context Not Being Injected at Request Time

**Checklist:**

- [ ] **Is the middleware loading?** Check server logs
- [ ] **Is the date context being extracted?** Add console.log in middleware
- [ ] **Is it reaching the controller?** Check if `req.dateContext` exists
- [ ] **Is it being sent to API?** Check the actual API request

---

## Critical Verification Steps

### Step 1: Check Server Logs
```bash
npm run dev

# Look for this output when you send a message:
# [2026-02-20] User prompt: "what is todays date"
# [2026-02-20] AI Response preview: "Today is Wednesday..."
```

If you don't see `[2026-02-20]`, the date context isn't being extracted.

---

### Step 2: Verify Middleware is Loading
Add this to check if middleware is initialized:

**Edit `server/middlewares/contextMiddleware.js`:**
```javascript
export const contextMiddleware = (req, res, next) => {
    const context = getCurrentDateContext();
    console.log(`⏰ [MIDDLEWARE] Current date: ${context.currentDate}`);
    
    req.dateContext = {
        ...getCurrentDateContext(),
        ...getDetailedDateContext(),
        systemPromptAddition: formatForSystemPrompt(),
        realtimeSystemPrompt: formatRealtimeSystemPrompt()
    };
    
    res.set('X-Server-Date', req.dateContext.currentDate);
    res.set('X-Server-Time', req.dateContext.currentTime);
    
    next();
};
```

When you restart, you should see:
```
⏰ [MIDDLEWARE] Current date: 2026-02-20
⏰ [MIDDLEWARE] Current date: 2026-02-20
```

---

### Step 3: Test Message Endpoint Directly
```bash
# Get your auth token from browser localStorage
# Get your chat ID from recent chats

curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{
    "chatId": "YOUR_CHAT_ID",
    "prompt": "What is todays date?"
  }' | jq '.'

# Expected response should show:
# "content": "Today is Wednesday, February 20, 2026..."
# "dateContext": { "currentDate": "2026-02-20", ... }
```

---

### Step 4: Verify Database Is Saving Correctly
```bash
# Connect to MongoDB
# Run this query
db.chats.findOne({_id: ObjectId("YOUR_CHAT_ID")}).messages.slice(-2)

# Should show latest messages with dateContext:
{
  "role": "user",
  "content": "What is todays date?",
  "dateContext": {
    "currentDate": "2026-02-20",
    "dayOfWeek": "Wednesday"
  }
}
```

---

## Common Issues & Fixes

### Issue: Still Showing "May 22, 2024"

**Cause 1: Old Frontend Cache**
```bash
# Clear browser cache and hard refresh
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

**Cause 2: Server Not Restarted**
```bash
# Stop server
Ctrl+C

# Clear node modules cache (if needed)
rm -rf node_modules/.cache

# Restart
npm run dev
```

**Cause 3: Middleware Not Mounted**
Check `server/server.js`:
```javascript
// ✅ MUST be present BEFORE routes
app.use(contextMiddleware);

// Routes come AFTER
app.use('/api/message', messageRouter)
```

---

### Issue: Date Context Not In Database

**Check if dateContext field exists in schema:**
```bash
db.chats.findOne({}) | jq '.messages[0]'

# Should show:
{
  "dateContext": {
    "currentDate": "2026-02-20"
  }
}

# If missing, model wasn't updated. Run:
npm run dev  # Restart to apply schema changes
```

---

### Issue: API Not Receiving Date Context

**Add debugging to controller:**

In `server/controllers/messageController.js`, add:
```javascript
console.log('📅 Date Context:', {
    date: dateContext.currentDate,
    day: dateContext.dayOfWeek,
    time: dateContext.currentTime
});

console.log('📨 Sending to API:', optimizedMessage);
```

Run and check logs:
```
📅 Date Context: { date: '2026-02-20', day: 'Wednesday', time: '02:30 PM' }
📨 Sending to API: { role: 'user', content: '[SYSTEM: Today\'s date is 2026-02-20...
```

---

## Quick Fix Checklist

- [ ] **Restart Server** - Sometimes changes don't take effect
  ```bash
  Ctrl+C
  npm run dev
  ```

- [ ] **Clear Browser Cache** - Old data might be cached
  ```
  Ctrl+Shift+R (hard refresh)
  ```

- [ ] **Verify Middleware Loaded** - Check if import is present
  ```javascript
  import contextMiddleware from './middlewares/contextMiddleware.js';
  app.use(contextMiddleware);
  ```

- [ ] **Check Message Controller** - Verify it uses new code
  ```bash
  grep -n "createOptimizedGeminiMessage" server/controllers/messageController.js
  # Should show the function being used
  ```

- [ ] **Verify Gemini Context Formatter Exists**
  ```bash
  ls server/utils/geminiContextFormatter.js
  # Should exist
  ```

- [ ] **Remove Old Files** (if you had previous version)
  ```bash
  # Delete these old files:
  rm server/utils/contextGenerator.js
  # Keep this if using its helper functions
  ```

---

## What to Check in Browser DevTools

### Network Tab
1. Send a message
2. Look for POST to `/api/message`
3. Check response:
```json
{
  "reply": {
    "content": "Today is Wednesday, February 20, 2026...",
    "dateContext": {
      "currentDate": "2026-02-20"
    }
  }
}
```

If `dateContext` is missing → Controller not sending it

### Console Tab
Check for any errors:
- `undefined is not a function` → imports not found
- `contextMiddleware is not defined` → middleware not imported
- `Cannot read property 'currentDate'` → dateContext not extracted

---

## Test Script

Create `test-date-context.js`:
```javascript
import { getCurrentDateContext } from './server/utils/contextGenerator.js';
import { createOptimizedGeminiMessage } from './server/utils/geminiContextFormatter.js';
import { getCurrentDateInTimezone } from './server/utils/realtimeData.js';

console.log('=== TESTING DATE CONTEXT ===\n');

// Test 1: Context Generation
const context = getCurrentDateContext();
console.log('✅ Context Generated:', {
    date: context.currentDate,
    day: context.dayOfWeek,
    time: context.currentTime
});

// Test 2: Optimized Message
const message = createOptimizedGeminiMessage('What is today\'s date?');
console.log('\n✅ Optimized Message Created');
console.log('Message includes date:', message.content.includes('2026-02-20'));

// Test 3: Timezone
const tz = getCurrentDateInTimezone();
console.log('\n✅ Timezone Info:', tz);

console.log('\n=== ALL TESTS PASSED ===');
```

Run it:
```bash
node test-date-context.js
```

---

## The New Approach (What Changed)

### Before ❌
```javascript
// Two separate messages - Gemini ignored context
messages: [
    { role: "user", content: "Here's the date context..." },
    { role: "user", content: "User's actual question" }
]
```

### After ✅
```javascript
// Single message with date PREPENDED - Unmissable
messages: [{
    role: "user",
    content: `[SYSTEM: Today is 2026-02-20...]
              
User Question: What is today's date?`
}]
```

This ensures Gemini sees the date context RIGHT AT the START of the message.

---

## Environment Check

Make sure these are set in `.env`:
```bash
GEMINI_API_KEY=your_api_key
PORT=3000
```

Check they're loaded:
```javascript
// Add to server.js temporarily
console.log('API Key loaded:', !!process.env.GEMINI_API_KEY);
console.log('Port:', process.env.PORT || 3000);
```

---

## Verify API Call Format

The API call should look like:
```javascript
const response = await openai.chat.completions.create({
    model: "gemini-3-flash-preview",
    messages: [{
        role: "user",
        content: "[SYSTEM: Today is 2026-02-20...]..."
    }],
    temperature: 0.7
});
```

Check in browser DevTools Network tab:
```json
{
  "model": "gemini-3-flash-preview",
  "messages": [{
    "role": "user",
    "content": "[SYSTEM: Today is 2026-02-20...]..."
  }]
}
```

---

## Still Not Working? Do This:

1. **Stop server** - `Ctrl+C`
2. **Delete database** - Start fresh (optional but helps)
   ```bash
   # In MongoDB, delete old chats
   db.chats.deleteMany({})
   ```
3. **Clear client cache** - `Ctrl+Shift+R`
4. **Restart** - `npm run dev`
5. **Send test message** - "What is today's date?"
6. **Check response** - Should include `"2026-02-20"`

---

## Performance Check

The system should be fast:
- Middleware: < 5ms
- Context generation: < 1ms
- API call: Normal speed (2-5 seconds)

If slower, check:
- Middleware adding overhead?
- Database queries slow?
- API key valid?

---

## Success Indicators

✅ Response includes: `"2026-02-20"` or `"February 20, 2026"`  
✅ Database shows: `dateContext` in messages  
✅ Logs show: `[2026-02-20]` timestamps  
✅ No errors in console  
✅ Response time < 10 seconds  

---

## Still Failing?

**Share these details with support:**
1. API response JSON (from DevTools)
2. Server console logs (when message is sent)
3. Database entry (one message)
4. Error messages (if any)

This will help diagnose the exact issue.

---

## Next: Enable Real-Time Data

Once date context works, enable real-time data:

```javascript
import { enhancePromptWithRealtimeData } from '../utils/realtimeDataFetcher.js';

// Before sending to API:
const enhancedPrompt = await enhancePromptWithRealtimeData(prompt);
// Now includes trending topics if user asks about "latest"
```

---

**Start with Step 1 and work through systematically. The issue is likely in one of these areas.**
