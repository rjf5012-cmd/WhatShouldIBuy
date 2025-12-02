// functions/api/gifts.js
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const userPrompt = body?.prompt;

    if (!userPrompt || typeof userPrompt !== "string") {
      return jsonResponse(
        { error: "Missing or invalid 'prompt' in request body." },
        400
      );
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse(
        { error: "OPENAI_API_KEY is not configured in environment." },
        500
      );
    }

    // Call OpenAI Chat Completions API directly via fetch
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // or another model you prefer
        messages: [
          {
            role: "system",
            content:
              "You are an expert gift consultant. You ALWAYS respond with valid JSON only, no extra text.",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text().catch(() => "");
      console.error("OpenAI error:", openaiRes.status, text);

      return jsonResponse(
        {
          error: "Error from OpenAI API.",
          status: openaiRes.status,
        },
        502
      );
    }

    const openaiJson = await openaiRes.json();
    const message = openaiJson?.choices?.[0]?.message?.content;

    if (!message) {
      return jsonResponse(
        { error: "No content returned from OpenAI." },
        502
      );
    }

    // The model returns JSON as a string – parse it
    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch (e) {
      console.error("Failed to parse OpenAI JSON:", e, message);
      return jsonResponse(
        { error: "Failed to parse AI response as JSON." },
        502
      );
    }

    // Expecting something like { "gifts": [ ... ] }
    const gifts = Array.isArray(parsed.gifts) ? parsed.gifts : [];

    return jsonResponse({ gifts });
  } catch (err) {
    console.error("Unexpected error in /api/gifts:", err);
    return jsonResponse(
      { error: "Unexpected server error." },
      500
    );
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Helpful if you ever hit it from another origin
      "Access-Control-Allow-Origin": "*",
    },
  });
}
