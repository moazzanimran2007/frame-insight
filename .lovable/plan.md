

# Plan: Audio Description + Story Narration

## What it does

Two audio playback modes appear after frame analysis completes:

1. **🔊 Audio Description** — A factual, sequential narration of exactly what's happening in each frame, designed for visually impaired users. Example: *"At 0:03, a person is standing at a whiteboard writing the word 'Goals'. At 0:06, the camera zooms in on a chart showing revenue growth…"*

2. **📖 Story Mode** — A creative narrative that weaves the frame descriptions into a flowing story with transitions and dramatic flair.

Both use Gemini to compose the text, then ElevenLabs TTS to narrate it aloud.

## Setup required

**ElevenLabs API key** — you'll be prompted to add it as a secret before implementation begins.

## Implementation steps

### 1. Add ElevenLabs API key secret

### 2. Create `narrate-video` edge function

Accepts `{ descriptions: string[], mode: "describe" | "story" }`.

- **"describe" mode**: Sends descriptions to Gemini with prompt: *"You are creating an audio description for a visually impaired listener. Describe each frame factually and sequentially, including timestamps, so the listener understands exactly what is shown in the video. Keep it clear and concise."*
- **"story" mode**: Sends descriptions to Gemini with prompt: *"Weave these video frame descriptions into an engaging, flowing narrative story. Use transitions between scenes. Keep it under 200 words."*
- Sends the resulting text to ElevenLabs TTS (`eleven_turbo_v2_5`, voice "George")
- Returns binary MP3 audio + the generated text

### 3. Update frontend — narration UI

After frames load, show two buttons below the timeline header:

- **"Listen to Description"** — triggers describe mode (accessibility-first, factual)
- **"Listen as Story"** — triggers story mode (creative narration)

On click: loading spinner → inline `<audio>` player appears with the narrated text displayed alongside.

Uses `fetch()` with `.blob()` (not `supabase.functions.invoke()`) to handle binary audio correctly.

### 4. Files changed

| File | Change |
|------|--------|
| `supabase/functions/narrate-video/index.ts` | New edge function |
| `src/pages/Index.tsx` | Add narration state, buttons, audio player |
| `src/components/NarrationPlayer.tsx` | New component for audio player + text display |

## Technical details

- ElevenLabs TTS: `POST https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb` with `eleven_turbo_v2_5` model
- Story text capped at ~200 words, description text at ~300 words
- Audio returned as raw MP3 binary, played via `URL.createObjectURL(blob)`
- Gemini `google/gemini-2.5-flash` used for text composition (fast, low cost)

