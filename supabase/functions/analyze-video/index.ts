import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchYouTubeCaptions(videoId: string): Promise<string | null> {
  try {
    // Fetch the video page to extract caption track URLs
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    // Extract captions player response
    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) return null;

    const tracks = JSON.parse(captionMatch[1]);
    // Prefer English, fall back to first available
    const track = tracks.find((t: any) => t.languageCode === "en") || tracks[0];
    if (!track?.baseUrl) return null;

    // Fetch the caption XML
    const captionRes = await fetch(track.baseUrl);
    if (!captionRes.ok) return null;
    const xml = await captionRes.text();

    // Parse XML to extract text with timestamps
    const entries: string[] = [];
    const regex = /<text start="([\d.]+)"[^>]*>(.*?)<\/text>/gs;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const startSec = parseFloat(match[1]);
      const text = match[2]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/<[^>]+>/g, "")
        .trim();
      if (text) {
        const mins = Math.floor(startSec / 60);
        const secs = Math.floor(startSec % 60);
        entries.push(`[${mins}:${secs.toString().padStart(2, "0")}] ${text}`);
      }
    }

    return entries.length > 0 ? entries.join("\n") : null;
  } catch (e) {
    console.error("Caption fetch error:", e);
    return null;
  }
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

async function analyzeImageWithAI(imageBase64: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "You are analyzing a frame from a video. Describe concisely in 1-2 sentences what is happening in this moment, including any visible text, people, actions, or scene changes.",
            },
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("CREDITS_EXHAUSTED");
    throw new Error(`AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No description generated.";
}

// --- YouTube path: fetch real thumbnails ---
async function analyzeYouTube(videoId: string, apiKey: string) {
  // YouTube auto-generates thumbnails at ~25%, 50%, 75% of the video
  // plus the main thumbnail. We also try hq/sd/maxres variants.
  const thumbUrls = [
    { url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, label: "HD Thumbnail" },
    { url: `https://img.youtube.com/vi/${videoId}/0.jpg`, label: "Main" },
    { url: `https://img.youtube.com/vi/${videoId}/1.jpg`, label: "~25%" },
    { url: `https://img.youtube.com/vi/${videoId}/2.jpg`, label: "~50%" },
    { url: `https://img.youtube.com/vi/${videoId}/3.jpg`, label: "~75%" },
  ];

  // Fetch all thumbnails in parallel
  const fetched = await Promise.all(
    thumbUrls.map(async (t) => {
      const base64 = await fetchImageAsBase64(t.url);
      return base64 ? { base64, label: t.label } : null;
    })
  );

  const validFrames = fetched.filter(Boolean) as { base64: string; label: string }[];

  if (validFrames.length === 0) {
    throw new Error("Could not fetch any thumbnails. The video may be private or age-restricted.");
  }

  // Remove duplicates (maxresdefault often falls back to hqdefault)
  const unique: { base64: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const f of validFrames) {
    // Use first 200 chars of base64 as fingerprint
    const sig = f.base64.substring(30, 230);
    if (!seen.has(sig)) {
      seen.add(sig);
      unique.push(f);
    }
  }

  // Analyze each frame with AI
  const results = [];
  for (let i = 0; i < unique.length; i++) {
    const frame = unique[i];
    try {
      const description = await analyzeImageWithAI(frame.base64, apiKey);
      results.push({
        timestamp: formatTimestamp(i * 3), // approximate timestamps
        imageBase64: frame.base64,
        description,
        label: frame.label,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMIT") {
        return { frames: results, error: "Rate limit reached. Partial results returned." };
      }
      if (e instanceof Error && e.message === "CREDITS_EXHAUSTED") {
        return { frames: results, error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." };
      }
      results.push({
        timestamp: formatTimestamp(i * 3),
        imageBase64: frame.base64,
        description: "Failed to analyze this frame.",
        label: frame.label,
      });
    }
  }

  return { frames: results };
}

// --- api.video path: upload, encode, extract frames ---
async function analyzeWithApiVideo(sourceUrl: string, apiVideoKey: string, lovableApiKey: string) {
  // 1. Create video from source URL
  const createRes = await fetch("https://ws.api.video/videos", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(apiVideoKey + ":")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `FrameAI Analysis ${Date.now()}`,
      source: sourceUrl,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`api.video upload failed (${createRes.status}): ${err}`);
  }

  const video = await createRes.json();
  const videoId = video.videoId;

  // 2. Poll for encoding completion (max ~90s)
  let encoded = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`https://ws.api.video/videos/${videoId}/status`, {
      headers: { Authorization: `Basic ${btoa(apiVideoKey + ":")}` },
    });
    if (statusRes.ok) {
      const status = await statusRes.json();
      if (status.encoding?.playable) {
        encoded = true;
        break;
      }
    }
  }

  if (!encoded) {
    throw new Error("Video encoding timed out. Try a shorter video or direct video URL.");
  }

  // 3. Get video duration
  const videoRes = await fetch(`https://ws.api.video/videos/${videoId}`, {
    headers: { Authorization: `Basic ${btoa(apiVideoKey + ":")}` },
  });
  const videoData = await videoRes.json();
  const duration = videoData.metadata?.find((m: any) => m.key === "duration")?.value;
  const durationSec = duration ? parseInt(duration) : 30;

  // 4. Extract frames at 3-second intervals via thumbnail picking
  const frameCount = Math.min(Math.floor(durationSec / 3), 20); // cap at 20 frames
  const results = [];

  for (let i = 0; i < frameCount; i++) {
    const timeSec = (i + 1) * 3;
    const hours = Math.floor(timeSec / 3600);
    const mins = Math.floor((timeSec % 3600) / 60);
    const secs = timeSec % 60;
    const timecode = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.000`;

    // Pick thumbnail at this timecode
    const pickRes = await fetch(`https://ws.api.video/videos/${videoId}/thumbnail`, {
      method: "PATCH",
      headers: {
        Authorization: `Basic ${btoa(apiVideoKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ timecode }),
    });

    if (!pickRes.ok) continue;
    const pickData = await pickRes.json();
    const thumbnailUrl = pickData.assets?.thumbnail;
    if (!thumbnailUrl) continue;

    // Small delay to ensure thumbnail is generated
    await new Promise((r) => setTimeout(r, 500));

    const imageBase64 = await fetchImageAsBase64(thumbnailUrl);
    if (!imageBase64) continue;

    try {
      const description = await analyzeImageWithAI(imageBase64, lovableApiKey);
      results.push({
        timestamp: formatTimestamp(timeSec),
        imageBase64,
        description,
      });
    } catch (e) {
      if (e instanceof Error && (e.message === "RATE_LIMIT" || e.message === "CREDITS_EXHAUSTED")) {
        break;
      }
      results.push({
        timestamp: formatTimestamp(timeSec),
        imageBase64,
        description: "Failed to analyze this frame.",
      });
    }
  }

  // Clean up: delete the video from api.video
  try {
    await fetch(`https://ws.api.video/videos/${videoId}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${btoa(apiVideoKey + ":")}` },
    });
  } catch { /* ignore cleanup errors */ }

  return { frames: results };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Please provide a video URL." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Check if it's a YouTube URL
    const youtubeId = extractYouTubeId(url);

    if (youtubeId) {
      const result = await analyzeYouTube(youtubeId, LOVABLE_API_KEY);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For non-YouTube URLs, try api.video
    const API_VIDEO_KEY = Deno.env.get("API_VIDEO_KEY");
    if (!API_VIDEO_KEY) {
      return new Response(
        JSON.stringify({ error: "api.video API key not configured. Direct video URLs require api.video integration." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await analyzeWithApiVideo(url, API_VIDEO_KEY, LOVABLE_API_KEY);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-video error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
