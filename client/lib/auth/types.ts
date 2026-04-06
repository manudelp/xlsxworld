export interface AuthProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  metadata_json: Record<string, unknown>;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSessionResponse {
  user: AuthProfile;
  detail?: string;
}

export interface AuthLoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthSignupInput extends AuthLoginInput {
  displayName?: string;
}

export interface AuthProfileUpdateInput {
  displayName?: string | null;
}
