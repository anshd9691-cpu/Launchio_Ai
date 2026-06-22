---
name: Launchio agent endpoint
description: Key decisions for the /api/agent Groq endpoint — message filtering, context injection pattern
---

**Filter the leading assistant greeting:** The chat UI inserts an initial assistant greeting message as a UX affordance. This must be stripped before sending to Groq: `messages.filter((m, i) => !(i === 0 && m.role === 'assistant'))`. Sending it causes Groq to treat it as prior conversation context and produce confused follow-ups.

**Context injection pattern:** `currentContent` and `attachments` are appended to `enhancedSystem` (the system instruction string), NOT injected into the last user message. Injecting into user messages buries the user's actual request under 1000+ chars of content, causing the model to focus on the injected text instead of the user's intent.

**Why:** Both bugs caused AI responses that ignored user edits or produced non-sequitur replies. The fix (separate system context) produced correct, focused responses.
