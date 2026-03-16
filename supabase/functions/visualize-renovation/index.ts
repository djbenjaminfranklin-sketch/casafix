// Supabase Edge Function: AI Renovation Visualization
// Takes a photo of a room + description of desired renovation
// Returns an AI-generated image of the renovated room
//
// Deploy with: supabase functions deploy visualize-renovation --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const { photoUrl, description, roomType } = await req.json();

    if (!photoUrl || !description) {
      throw new Error("photoUrl and description are required");
    }

    // Download the source image
    const imgResponse = await fetch(photoUrl);
    if (!imgResponse.ok) {
      throw new Error(`Failed to download image: ${imgResponse.status}`);
    }
    const arrayBuffer = await imgResponse.arrayBuffer();
    const base64Data = base64Encode(new Uint8Array(arrayBuffer));
    const contentType = imgResponse.headers.get("content-type") || "image/jpeg";

    // Use OpenAI Image Edit API (gpt-image-1) to modify the original photo
    // This preserves the room layout, angle, and dimensions
    const editPrompt = `Transform this ${roomType || "room"} photo into a photorealistic renovation render.
Apply ONLY these changes: ${description}
Keep the EXACT same camera angle, room layout, dimensions, windows, doors, and architectural structure.
Only change what the user requested. The result must look like a professional interior design photograph — photorealistic, well-lit, magazine quality.`;

    const blob = new Blob([new Uint8Array(arrayBuffer)], { type: "image/png" });
    const formData = new FormData();
    formData.append("image", blob, "room.png");
    formData.append("model", "gpt-image-1");
    formData.append("prompt", editPrompt);
    formData.append("size", "1024x1024");
    formData.append("quality", "high");

    const editResponse = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!editResponse.ok) {
      const errorBody = await editResponse.text();
      throw new Error(`Image edit error ${editResponse.status}: ${errorBody}`);
    }

    const editResult = await editResponse.json();
    const generatedImageBase64 = `data:image/png;base64,${editResult.data[0].b64_json}`;
    const textResponse = "Visualisation générée";

    return new Response(
      JSON.stringify({
        imageUrl: generatedImageBase64,
        description: textResponse,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
