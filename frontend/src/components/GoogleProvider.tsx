'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function GoogleProvider({ children }: { children: React.ReactNode }) {
    // Nếu không có biến môi trường (ví dụ lúc Docker build), dùng clientId tạm để tránh lỗi Provider
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "dummy-client-id-for-build";

    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing. Using dummy client ID for build/dev.");
    }

    return (
        <GoogleOAuthProvider clientId={clientId}>
            {children}
        </GoogleOAuthProvider>
    );
}