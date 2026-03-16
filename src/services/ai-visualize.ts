import { supabase } from "../lib/supabase";
import { MediaItem } from "./media";
import { decode } from "base64-arraybuffer";

const SUPABASE_URL = "https://ivhotilzgjofpbtwdxge.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2aG90aWx6Z2pvZnBidHdkeGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA2NzksImV4cCI6MjA4ODc1NjY3OX0.RcHgOEf8EGxQU28QoS8_f23fznm8SANbDbxLj_opISA";

export interface VisualizationResult {
  imageUrl: string; // base64 data URI of the generated image
  description: string;
}

/**
 * Upload a photo to temp storage and return its public URL
 */
async function uploadTempPhoto(uri: string): Promise<string> {
  const path = `temp/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const { error } = await supabase.storage
    .from("booking-media")
    .upload(path, decode(base64), {
      contentType: "image/jpeg",
    });

  if (error) {
    throw new Error(`Upload: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("booking-media")
    .getPublicUrl(path);
  return urlData.publicUrl;
}

/**
 * Generate an AI visualization of a renovated room
 */
export async function visualizeRenovation(params: {
  photo: MediaItem;
  description: string;
  roomType: string;
}): Promise<VisualizationResult> {
  const { photo, description, roomType } = params;

  // Upload the photo to get a public URL
  let photoUrl: string;
  try {
    photoUrl = await uploadTempPhoto(photo.uri);
  } catch (e: any) {
    throw new Error(`Upload échoué: ${e.message}`);
  }

  // Call the Edge Function
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || SUPABASE_ANON_KEY;

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/visualize-renovation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        photoUrl,
        description,
        roomType,
      }),
    }
  );

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || `HTTP ${response.status}`);
  }

  if (!responseData.imageUrl) {
    throw new Error("Pas d'image générée");
  }

  return responseData as VisualizationResult;
}
