import { supabase } from "../lib/supabase";
import { decode } from "base64-arraybuffer";

const BUCKET = "booking-media";

export type MediaItem = {
  id?: string;
  uri: string;
  type: "photo" | "video";
  fileName?: string;
  fileSize?: number;
  uploaded?: boolean;
  url?: string;
};

// Upload a single file to Supabase Storage
export async function uploadMedia(
  bookingId: string,
  clientId: string,
  media: MediaItem
): Promise<{ url: string } | null> {
  const ext = media.type === "video" ? "mp4" : "jpg";
  const path = `${bookingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  // Read file as base64
  const response = await fetch(media.uri);
  const blob = await response.blob();

  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve) => {
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.readAsDataURL(blob);
  });

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), {
      contentType: media.type === "video" ? "video/mp4" : "image/jpeg",
    });

  if (uploadError) {

    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Save reference in database
  await supabase.from("booking_media").insert({
    booking_id: bookingId,
    client_id: clientId,
    file_url: urlData.publicUrl,
    file_type: media.type,
    file_name: media.fileName,
    file_size: media.fileSize,
  });

  return { url: urlData.publicUrl };
}

// Upload multiple files - returns public URLs of successfully uploaded files
export async function uploadAllMedia(
  bookingId: string,
  clientId: string,
  mediaList: MediaItem[]
): Promise<{ count: number; urls: string[] }> {
  const urls: string[] = [];
  for (const media of mediaList) {
    const result = await uploadMedia(bookingId, clientId, media);
    if (result) urls.push(result.url);
  }
  return { count: urls.length, urls };
}

// Get media for a booking
export async function getBookingMedia(bookingId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from("booking_media")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((item: any) => ({
    id: item.id,
    uri: item.file_url,
    url: item.file_url,
    type: item.file_type,
    fileName: item.file_name,
    fileSize: item.file_size,
    uploaded: true,
  }));
}
