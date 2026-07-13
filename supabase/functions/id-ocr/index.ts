// Edge function: extract an ID/document number from a photo using Lovable AI (Gemini vision).
// Public (no JWT) — input is a data URL or base64 image; output { number: string | null, raw: string }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, idType } = await req.json();
    if (!image || typeof image !== "string") {
      return json({ error: "image (data URL) required" }, 400);
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const prompt = `Tu es un OCR spécialisé pour les pièces d'identité ivoiriennes et africaines (CNI, Permis, Passeport, Carte du producteur, etc.).
Analyse cette photo de "${idType || "pièce d'identité"}" et extrais UNIQUEMENT le numéro d'identification principal du document.
Réponds STRICTEMENT au format JSON: {"number":"<numéro extrait ou null>","confidence":"high|medium|low"}.
Pas de texte avant ou après le JSON. Si illisible, number=null.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return json({ error: "AI gateway error", detail: txt }, 502);
    }
    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content || "";
    let number: string | null = null;
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (parsed && typeof parsed.number === "string" && parsed.number.trim()) {
          number = parsed.number.trim();
        }
      }
    } catch { /* ignore */ }
    return json({ number, raw });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
