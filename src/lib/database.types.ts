export type BookingType = "emergency" | "appointment";
export type BookingStatus =
  | "pending"
  | "searching"
  | "matched"
  | "in_progress"
  | "price_proposed"
  | "price_accepted"
  | "work_in_progress"
  | "pending_client_confirmation"
  | "work_completed"
  | "completed"
  | "disputed"
  | "cancelled";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
};

export type Artisan = {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  bio: string | null;
  rating: number;
  review_count: number;
  categories: string[];
  is_available: boolean;
  latitude: number | null;
  longitude: number | null;
  radius_km: number;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  client_id: string;
  artisan_id: string | null;
  category_id: string;
  service_id: string;
  service_name: string;
  price_range: string;
  type: BookingType;
  status: BookingStatus;
  scheduled_date: string | null;
  scheduled_slot: string | null;
  max_price: number;
  final_price: number | null;
  deposit_amount: number | null;
  proposed_price: number | null;
  artisan_marked_done_at: string | null;
  auto_confirmed: boolean;
  description: string | null;
  client_latitude: number | null;
  client_longitude: number | null;
  stripe_payment_intent_id: string | null;
  payment_released_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Review = {
  id: string;
  booking_id: string;
  client_id: string;
  artisan_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};
