import OpenAI from "openai";

/**
 * Cloudflare Pages Function
 * Handles POST /api/gifts
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing OPENAI_API_KEY environment variable." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { prompt, meta } = body || {};
  if (!prompt || typeof prompt !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing or invalid 'prompt' field." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const client = new OpenAI({
      apiKey: env.OPENAI_API_KEY
      // baseURL: "https://api.openai.com/v1" // optional, defaults to this
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini", // cost-effective + good quality
      messages: [
        { role: "system", content: "You are an expert gift consultant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.85,
      max_tokens: 600
    });

    const raw = (completion.choices?.[0]?.message?.content || "").trim();

    let gifts = [];
    try {
      gifts = JSON.parse(raw);
      if (!Array.isArray(gifts)) {
        gifts = [];
      }
    } catch (e) {
      // If JSON parsing fails, return empty array or handle gracefully.
      gifts = [];
    }

    return new Response(
      JSON.stringify({ gifts, meta }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("OpenAI error:", err);

    return new Response(
      JSON.stringify({ error: "AI generation failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
