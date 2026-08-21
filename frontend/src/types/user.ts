export interface UserDataInfo {
    user_id: string;
    role_name: string;
    username: string;
    email: string;
    created_at: string;
    display_status: string;
    birthdate: string;
}

export interface ProfileInfo {
    firstname: string;
    lastname: string;
    birthdate: string;
    bio: string;
    avatar_url: string
}

export interface UserInfoUpdate {
    username?: string;
    birthdate?: string; // Định dạng YYYY-MM-DD hoặc null
}

export interface ProfileUpdate {
    firstname?: string;
    lastname?: string;
    bio?: string;
    avatar_url?: string;
}

export interface UserGeneralInfo {
    user_id: string;
    role_name: string;
    username: string;
    email: string;
    birthdate?: string | null;
    created_at: string;
    status_id: string;
    display_status: string;
}