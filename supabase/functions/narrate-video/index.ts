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
    const { descriptions, mode } = await req.json();

    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide an array of frame descriptions." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mode || !["describe", "story"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "Mode must be 'describe' or 'story'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const frameList = descriptions
      .map((d: string, i: number) => `Frame ${i + 1}: ${d}`)
      .join("\n");

    const systemPrompt =
      mode === "describe"
        ? `You are a professional audio describer for visually impaired audiences. Your job is to narrate a video so a blind listener can follow along naturally, as if watching it themselves.

Rules:
- Write in present tense, as if the viewer is experiencing it live: "A man steps forward…", "The camera pans across…"
- Flow continuously — do NOT list frames one by one. Merge consecutive frames that show the same scene into a single fluid passage.
- Use natural temporal connectors: "As this happens…", "Meanwhile…", "A moment later…", "The scene shifts to…"
- Mention visible text, on-screen graphics, and captions when they appear.
- Describe people's appearance, clothing, expressions, and body language when relevant.
- Note camera movements (zoom, pan, cut) only when they change the viewer's perspective meaningfully.
- Vary sentence length and rhythm — mix short punchy observations with longer descriptive sentences so the narration feels alive, not robotic.
- Do NOT start with "The video begins with" — open directly with what's happening.
- Aim for 200–350 words. Be thorough but never repetitive.`
        : `You are a gifted storyteller narrating a short film. Given frame-by-frame descriptions of a video, transform them into a vivid, emotionally engaging narrative.

Rules:
- Write in present tense with a cinematic voice.
- Create atmosphere — describe light, mood, tension, energy.
- Use metaphor and sensory language sparingly but effectively.
- Build a narrative arc: setup → development → payoff, even from mundane footage.
- Vary pacing — quick cuts get short sentences, slow scenes get flowing prose.
- Keep it under 250 words. Every sentence should earn its place.`;

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
          { role: "user", content: `Here are the video frame descriptions:\n\n${frameList}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
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
