
// Cập nhật Interface để chứa redirectTo
export interface ActionResponse {
  success: boolean
  message: string
  redirectTo?: string // Thêm trường này
  user?: {
    username: string
    email: string
    role: string
  }
}

export interface GoogleAuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: {
    username: string;
    email: string;
    role: string;
    profile: {
      firstname: string | null;
      lastname: string | null;
      avatar_url: string | null;
    };
  };
}