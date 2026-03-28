

# Fix: YouTube Shorts URL Support

## Problem
The frontend URL validation regex rejects YouTube Shorts URLs (`youtube.com/shorts/...`). The backend already supports them — only the client-side regex needs updating.

## Fix

**File: `src/components/AnalyzerInput.tsx`** — Update the `YOUTUBE_REGEX` on line 10 to include the `/shorts/` pattern:

```
/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)[\w-]{11}/
```

That's it — one line change.

