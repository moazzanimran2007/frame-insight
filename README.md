# FrameAI

A web app that makes online video more accessible: paste a YouTube link and it describes what is happening on screen in plain language, reads it aloud, and writes subtitles you can download.

## Who it's for

When you start, you choose how you want to use it:

- **Visually impaired:** the app describes each moment of the video and reads the descriptions aloud.
- **Hearing impaired:** the app writes subtitles you can download as an `.srt` file and add to the video.
- **Full experience:** frame descriptions on screen, with narration if you want it.

You also pick a style: **Entertainment** (mood, music, energy), **Explain video** (a detailed walkthrough) or **Quick summary** (a short recap).

## What it does

- **Describes key frames.** For a YouTube link it pulls YouTube's own preview stills (the main thumbnail and the auto-generated stills at roughly 25%, 50% and 75% of the video) and the video's captions where they exist, and asks a vision model to describe each one.
- **Narrates.** Descriptions are turned into a narration script and read aloud with your browser's built-in voices.
- **Writes subtitles** in a choice of ten languages, ready to download.
- **Answers questions about the video** in a chat panel, by text or by voice using the browser's speech recognition.
- **Plays the video** in place next to the analysis.

Other video links can be analyzed through api.video, which uploads the video and extracts frames, but only when an api.video key is configured.

## How it works

The React front end calls Supabase Edge Functions, which call Google Gemini models through the Lovable AI Gateway:

| Function | Job |
| :--- | :--- |
| `analyze-video` | Gets the frames and captions for a link |
| `analyze-frames` | Describes each frame |
| `narrate-video` | Writes the narration script |
| `generate-subtitles` | Writes the subtitle file |
| `video-chat`, `chat-assistant` | Answer questions about the video and the app |

## Run it

You need Node.js 18 or newer.

```bash
git clone https://github.com/moazzanimran2007/frame-insight.git
cd frame-insight
npm install
npm run dev
```

The front end connects to the Supabase project named in `.env`. To run your own backend, deploy the functions in `supabase/functions` to your own Supabase project and set `LOVABLE_API_KEY` (and optionally `API_VIDEO_KEY`) as function secrets.

## Tech stack

React and TypeScript on Vite, Tailwind CSS with shadcn/ui, Supabase Edge Functions (Deno), Google Gemini models (2.5 Flash for vision, subtitles and narration, a Gemini 3 Flash preview for chat), and the Web Speech API for narration and voice input. Built with Lovable.

## Limits

- For YouTube links the app sees only a handful of preview stills, not every frame, so fast-moving videos get a summary of a few moments rather than a full scene-by-scene account.
- Videos without captions get descriptions from the images alone.
