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
        ? `You are creating an audio description for a visually impaired listener. Given the following frame-by-frame descriptions of a video, create a clear, factual, sequential narration that describes exactly what is shown. Use phrases like "The video begins with...", "Next we see...", "At this point...". Include any visible text, people, actions, and scene changes. Keep it concise but thorough — aim for 150-300 words. Do not add opinions or creative embellishments.`
        : `You are a creative storyteller. Given the following frame-by-frame descriptions of a video, weave them into an engaging, flowing narrative story. Use vivid language, smooth transitions between scenes, and dramatic flair where appropriate. Make it feel like a narrator telling a captivating tale. Keep it under 200 words.`;

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
