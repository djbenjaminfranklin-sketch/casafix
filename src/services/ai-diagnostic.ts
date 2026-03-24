import { supabase } from "../lib/supabase";
import { MediaItem } from "./media";
import { decode } from "base64-arraybuffer";

export type Severity = "low" | "medium" | "high" | "urgent";

export interface DiagnosticResult {
  diagnostic: string;
  estimatedPriceRange: string;
  materialsNeeded: string[];
  severity: Severity;
  tips: string;
}

interface AnalyzeProblemParams {
  mediaItems: MediaItem[];
  description: string;
  serviceName: string;
  categoryName: string;
  priceRange: string;
}

const SUPABASE_URL = "https://ivhotilzgjofpbtwdxge.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2aG90aWx6Z2pvZnBidHdkeGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA2NzksImV4cCI6MjA4ODc1NjY3OX0.RcHgOEf8EGxQU28QoS8_f23fznm8SANbDbxLj_opISA";

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

  const { data: urlData } = supabase.storage.from("booking-media").getPublicUrl(path);
  return urlData.publicUrl;
}

/**
 * Uploads photos to temp storage, then calls the Edge Function directly
 * via fetch (not supabase.functions.invoke) to get full error details.
 */
export async function analyzeProblem(
  params: AnalyzeProblemParams
): Promise<DiagnosticResult> {
  const { mediaItems, description, serviceName, categoryName, priceRange } = params;

  const photoItems = mediaItems.filter((m) => m.type === "photo");

  if (photoItems.length === 0) {
    throw new Error("PHOTO_REQUIRED");
  }

  // Step 1: Upload photos to temp storage
  let photoUrls: string[];
  try {
    photoUrls = await Promise.all(
      photoItems.map((item) => uploadTempPhoto(item.uri))
    );
  } catch (e: any) {
    throw new Error(`UPLOAD_FAILED: ${e.message}`);
  }

  // Step 2: Call Edge Function directly with fetch to get full error details
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-photos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      photoUrls,
      description,
      serviceName,
      priceRange,
      categoryName,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || `HTTP ${response.status}`);
  }

  if (!responseData.diagnostic) {
    throw new Error("AI_RESPONSE_INVALID");
  }

  return responseData as DiagnosticResult;
}
