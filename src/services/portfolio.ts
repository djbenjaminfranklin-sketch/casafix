import { supabase } from "../lib/supabase";

export type PortfolioImage = {
  id: string;
  artisan_id: string;
  image_url: string;
  description: string | null;
  created_at: string;
};

export async function getArtisanPortfolio(
  artisanId: string
): Promise<PortfolioImage[]> {
  try {
    const { data, error } = await supabase
      .from("artisan_portfolio")
      .select("id, artisan_id, image_url, description, created_at")
      .eq("artisan_id", artisanId)
      .order("created_at", { ascending: false });

    if (error) {

      return [];
    }

    return data || [];
  } catch (e) {

    return [];
  }
}
