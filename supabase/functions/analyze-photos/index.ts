// Supabase Edge Function: Analyze photos with Claude Vision for AI diagnostic
// Deploy with: supabase functions deploy analyze-photos
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const { photoUrls, description, serviceName, categoryName, priceRange } =
      await req.json();

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      throw new Error("At least one photo URL is required");
    }

    if (!description || !serviceName) {
      throw new Error("description and serviceName are required");
    }

    // Download images and convert to base64 (Claude can't fetch URLs directly)
    const imageContent = [];
    for (const url of photoUrls) {
      try {
        const imgResponse = await fetch(url);
        if (!imgResponse.ok) {
          console.error(`Failed to download image: ${url} - ${imgResponse.status}`);
          continue;
        }
        const arrayBuffer = await imgResponse.arrayBuffer();
        const base64Data = base64Encode(new Uint8Array(arrayBuffer));
        const contentType = imgResponse.headers.get("content-type") || "image/jpeg";

        imageContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: contentType,
            data: base64Data,
          },
        });
      } catch (e) {
        console.error(`Error downloading image ${url}:`, e);
      }
    }

    if (imageContent.length === 0) {
      throw new Error("Could not download any of the provided images");
    }

    const systemPrompt = `Tu es un expert technique en maintenance et réparation immobilière sur la Costa del Sol.
Tu travailles pour CasaFix, une plateforme qui met en relation des clients avec des artisans qualifiés.
Tu dois analyser les photos et la description fournie par le client pour établir un diagnostic technique précis et professionnel.

Tu dois TOUJOURS répondre en JSON valide avec la structure suivante :
{
  "diagnostic": "Description détaillée du problème identifié, causes probables et recommandations",
  "estimatedPriceRange": "XX€ - YY€",
  "materialsNeeded": ["matériau 1", "matériau 2"],
  "severity": "low | medium | high | urgent",
  "tips": "Conseils pratiques pour l'artisan qui va intervenir"
}

Règles pour l'estimation du prix :
- La fourchette de prix du service est indiquée dans le message. Tu dois t'appuyer dessus.
- Ta fourchette haute doit correspondre au prix maximum du service
- Ta fourchette basse doit être environ 25% en dessous du prix maximum (pas plus bas)
- Exemple : si le service coûte "150€ - 250€", ton estimation doit être entre "185€ - 250€"
- Inclus la main d'oeuvre et les matériaux
- Zone géographique : Costa del Sol, Espagne

Règles pour la sévérité :
- "low" : Problème esthétique ou mineur, pas d'urgence
- "medium" : Problème fonctionnel qui nécessite une intervention dans les prochains jours
- "high" : Problème important qui peut s'aggraver rapidement
- "urgent" : Danger potentiel, fuite active, risque électrique, etc.

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après. Adapte la langue de ton diagnostic à la langue utilisée par le client dans sa description.`;

    const userMessage = `Analyse ces photos et cette description pour le service suivant :

**Catégorie** : ${categoryName || "Non spécifiée"}
**Service** : ${serviceName}
**Fourchette de prix du service** : ${priceRange || "Non spécifiée"}
**Description du client** : ${description}

Fournis un diagnostic complet avec estimation de prix basée sur la fourchette du service.`;

    // Call Claude API with vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              ...imageContent,
              {
                type: "text",
                text: userMessage,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API error:", response.status, errorBody);
      throw new Error(
        `Anthropic API returned ${response.status}: ${errorBody}`
      );
    }

    const claudeResponse = await response.json();

    // Extract the text content from Claude's response
    const textBlock = claudeResponse.content?.find(
      (block: { type: string }) => block.type === "text"
    );

    if (!textBlock) {
      throw new Error("No text response received from Claude");
    }

    // Parse the JSON response from Claude
    let diagnosticResult;
    try {
      diagnosticResult = JSON.parse(textBlock.text);
    } catch {
      // If Claude didn't return valid JSON, try to extract it
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        diagnosticResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse diagnostic result from AI response");
      }
    }

    return new Response(JSON.stringify(diagnosticResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-photos error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
