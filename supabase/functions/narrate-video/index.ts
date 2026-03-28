import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descriptions, mode, captions } = await req.json();

    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide an array of frame descriptions." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validModes = ["describe", "story", "entertainment", "explain", "summary"];
    if (!mode || !validModes.includes(mode)) {
      return new Response(
        JSON.stringify({ error: `Mode must be one of: ${validModes.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const frameList = descriptions
      .map((d: string, i: number) => `Frame ${i + 1}: ${d}`)
      .join("\n");

    const captionBlock = captions
      ? `\n\nYouTube Captions / Transcript:\n${captions}`
      : "";

    const prompts: Record<string, string> = {
      describe: `You are a professional audio describer for visually impaired audiences. Narrate the video so a blind listener can follow along naturally.

Rules:
- Present tense, as if experiencing it live
- Flow continuously — merge consecutive frames showing the same scene
- Use natural connectors: "As this happens…", "Meanwhile…", "A moment later…"
- Mention visible text, graphics, captions
- Describe people's appearance, expressions, body language
- Note meaningful camera movements
- Vary sentence length and rhythm
- Do NOT start with "The video begins with"
${captions ? "- IMPORTANT: Weave in actual dialogue/lyrics from the transcript naturally. Quote key spoken lines." : ""}
- Aim for 200–350 words.`,

      story: `You are a gifted storyteller narrating a short film. Transform the footage into a vivid, emotionally engaging narrative.

Rules:
- Present tense with a cinematic voice
- Create atmosphere — light, mood, tension, energy
- Use metaphor and sensory language sparingly but effectively
- Build a narrative arc: setup → development → payoff
- Vary pacing — quick cuts get short sentences, slow scenes get flowing prose
${captions ? "- IMPORTANT: Incorporate actual dialogue and lyrics from the transcript. Quote memorable lines." : ""}
- Keep it under 250 words.`,

      entertainment: `You are an enthusiastic entertainment host narrating a video for someone who wants to FEEL the experience. This is about vibes, energy, emotion, and fun — NOT academic analysis.

Rules:
- Write like you're hyping up the moment: energetic, immersive, cinematic
- If there's music or singing: highlight the chorus, the beat drops, the mood shifts, the artist's performance energy
- If there's dialogue: quote the best lines, capture the tone
- Use rhythm in your writing — short punchy lines for intense moments, flowing sentences for smooth ones
- Describe the FEELING, not just what you see: "goosebumps as the bass hits", "the crowd goes wild"
- Reference colors, lighting, visual aesthetics — "neon-drenched", "sun-soaked", "moody silhouettes"
${captions ? "- CRITICAL: Use the actual lyrics/dialogue from the transcript. Quote them directly. Example: 'He belts out \"Never gonna give you up\" as the camera zooms in…'" : "- Since no transcript is available, describe the energy and visual performance"}
- Keep it 150–250 words. Every sentence should make the reader feel something.`,

      explain: `You are a clear, thorough video explainer. Walk through exactly what happens in this video, step by step.

Rules:
- Present tense, sequential order
- Be precise about what's shown: people, actions, text, transitions
- Explain context when possible — what's happening and why it matters
- Merge similar consecutive frames but don't skip anything important
${captions ? "- IMPORTANT: Include actual spoken words and dialogue from the transcript. Quote key statements." : ""}
- Aim for 200–350 words. Be complete but not repetitive.`,

      summary: `You are a concise video summarizer. Give a quick, punchy TLDR of what happened.

Rules:
- Maximum 3-4 sentences
- Cover: WHO is in it, WHAT happens, and the KEY takeaway
- Write casually, like texting a friend: "So basically…"
${captions ? "- Include the most important quote or lyric if there is one." : ""}
- Keep it under 60 words. Be direct.`,
    };

    const systemPrompt = prompts[mode] || prompts.explain;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are the video frame descriptions:\n\n${frameList}${captionBlock}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI generation failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const narrationText = data.choices?.[0]?.message?.content || "Could not generate narration.";

    return new Response(
      JSON.stringify({ text: narrationText, mode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("narrate-video error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
