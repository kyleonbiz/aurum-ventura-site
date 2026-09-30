# Chat Widget Feature

A real-time chat widget for Aurum Ventura website visitors to ask questions about services.

## Overview

The chat feature includes:
- **Floating chat widget** - Always-accessible bubble in the bottom-right corner
- **Real-time streaming** - Claude responses stream in real-time for better UX
- **Session-only history** - Conversations persist during the session but don't get saved to database
- **Service-focused** - AI is trained to answer questions about Aurum Ventura services only
- **Responsive design** - Works on desktop and mobile

## Components

### 1. ChatWidget Component (`src/ChatWidget.jsx`)
React component that renders:
- Floating chat bubble button in bottom-right corner
- Chat window with conversation history
- Message input field
- Streaming response display

**Features:**
- Auto-scrolls to latest messages
- Shows "Thinking..." indicator while loading
- Disabled send button during response
- Color-coordinated messages (blue for user, light blue for assistant)

### 2. Chat API Endpoint (`api/chat.js`)
Node.js handler that:
- Accepts POST requests with user message and conversation history
- Sends requests to Claude API using Anthropic SDK
- Streams responses back to the client in real-time
- Uses system prompt to keep responses focused on Aurum services

**System Prompt Includes:**
- Information about all Aurum services
- Guidelines for professional, friendly responses
- Instructions to redirect off-topic questions
- Contact information (admin@aurumventura.net, +1-850-653-7797)

## How It Works

1. **User clicks chat bubble** → Chat window opens
2. **User types message** → Sent to `/api/chat` endpoint
3. **API processes message** → Sent to Claude with conversation history
4. **Claude responds** → Streamed back to frontend in real-time
5. **Messages display** → Shown in conversation thread with styling

## Usage

### For Visitors
- Click the 💬 bubble in the bottom-right corner
- Type a question about Aurum Ventura or our services
- Wait for response (it streams in real-time)
- Continue conversation or close with ✕ button

### For Developers

**Environment Requirements:**
- `ANTHROPIC_API_KEY` environment variable must be set
  - Get from Anthropic console: https://console.anthropic.com
  - Add to Vercel environment variables in project settings

**Testing Locally:**
```bash
npm run dev
# Chat endpoint will be available at http://localhost:5173/api/chat
```

**Customizing the System Prompt:**
Edit `api/chat.js` → Modify `SYSTEM_PROMPT` variable to:
- Add/remove services from the description
- Change behavior guidelines
- Add new contact information
- Adjust tone or response style

**Customizing Widget Appearance:**
Edit `src/ChatWidget.jsx` → Modify `COLORS` object and inline styles:
- Change colors to match your brand
- Adjust window size (width, height)
- Modify font sizes or spacing
- Change button emoji or position

## Files Modified

- `src/App.jsx` - Added ChatWidget import and component
- `src/ChatWidget.jsx` - NEW: Chat UI component
- `api/chat.js` - NEW: Chat API endpoint
- `vercel.json` - Added chat endpoint rewrite

## Features & Behavior

### Session-Only Conversations
- No database storage of conversations
- History only exists for the current browser session
- Refreshing the page starts a new conversation
- No user data collected or retained

### Service-Focused AI
- AI only answers questions about Aurum Ventura services
- Redirects off-topic questions politely
- Provides contact info for sales/inquiries
- Declines to give legal/tax/accounting advice

### Real-Time Streaming
- Uses Anthropic SDK streaming for low-latency responses
- Messages appear character-by-character
- "Thinking..." indicator shown while waiting
- Better UX compared to waiting for full response

### Error Handling
- Catches API errors gracefully
- Shows user-friendly error message
- Can retry by sending another message

## Troubleshooting

**Chat widget not appearing?**
- Check browser console for errors (F12 → Console tab)
- Verify ChatWidget is imported in App.jsx
- Ensure ChatWidget component is rendered before closing </div>

**API returns 500 error?**
- Check ANTHROPIC_API_KEY is set in environment
- Verify API key is valid at https://console.anthropic.com
- Check server logs for detailed error message

**Responses are off-topic?**
- System prompt may need adjustment
- Edit SYSTEM_PROMPT in api/chat.js
- Test locally before deploying

**Streaming not working?**
- Check browser supports fetch streaming (all modern browsers do)
- Verify API endpoint is accessible
- Check network tab in browser DevTools (F12)

## Future Enhancements

Potential improvements:
- Save conversation transcripts to database
- Add conversation analytics/dashboard
- Rate limiting per IP/session
- User feedback collection (thumbs up/down)
- Handoff to human support
- Multi-language support
- Canned responses/quick replies
