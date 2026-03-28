

# Accessibility Mode + Subtitle Generation

## What changes

### 1. Start page accessibility selector
Before showing the URL input, display a clean selection asking:
**"How would you like to experience this video?"**

Three options as cards:
- **👁 Visually Impaired** — "AI describes what's happening in each frame, read aloud to you"
- **👂 Hearing Impaired** — "Generate downloadable subtitles you can add to any video"
- **🎬 Full Experience** — "See frame analysis with optional narration" (default/current flow)

Selection is stored in state and determines what UI appears after analysis.

### 2. Hearing impaired flow — subtitle generation

After frames are analyzed, instead of showing the narration player, show:
- A **language selector** dropdown (English, Spanish, French, German, Arabic, Hindi, Chinese, Japanese, Korean, Portuguese — expandable)
- A **"Generate Subtitles"** button
- On click: calls a new `generate-subtitles` edge function
- Displays a preview of the subtitle text
- A **"Download .srt"** button that downloads the file

### 3. New edge function: `generate-subtitles`

**Input:** `{ descriptions: string[], language: string }`

Uses Gemini (`google/gemini-2.5-flash`) to convert frame descriptions into properly formatted SRT subtitles in the selected language. The prompt instructs the model to:
- Use the timestamps from the descriptions
- Translate content into the target language
- Output valid SRT format with numbered entries

Returns `{ srt: string, language: string }`.

### 4. Visually impaired flow

Same as current — shows the narration player (Audio Description + Story buttons). No changes needed, just conditionally rendered based on mode selection.

## Files changed

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add mode state, accessibility selector UI, conditional rendering |
| `src/components/AccessibilitySelector.tsx` | New — three-card selector component |
| `src/components/SubtitlePanel.tsx` | New — language dropdown, generate button, SRT preview, download |
| `supabase/functions/generate-subtitles/index.ts` | New edge function |

## Technical details

- SRT format: numbered entries with `HH:MM:SS,mmm --> HH:MM:SS,mmm` timing lines
- Download via `Blob` + `URL.createObjectURL` + programmatic anchor click
- Language list stored as a constant array of `{ code, label }` objects
- Mode selection persists only for the session (React state, not localStorage)
- Full Experience mode shows both frame cards and narration player (current behavior)

