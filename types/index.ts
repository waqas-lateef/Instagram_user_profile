export interface InstagramProfile {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
}
export interface AuthResponse {
  access_token: string;
  user_id: string;
}
