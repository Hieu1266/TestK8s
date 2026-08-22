# ==========================================
# Stage 1: Cài đặt dependencies
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package management files
COPY package.json package-lock.json ./
RUN npm install

# ==========================================
# Stage 2: Biên dịch ứng dụng (Build)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies từ stage deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Tắt Telemetry của Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# --- Khai báo ARG để nhận biến môi trường lúc build ---
ARG NEXT_PUBLIC_FRONTEND
ARG NEXT_PUBLIC_USER_BACKEND_URL
ARG NEXT_PUBLIC_COURSE_BACKEND_URL
ARG NEXT_PUBLIC_EXAM_BACKEND_URL
ARG NEXT_PUBLIC_PROGRESS_BACKEND_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

# --- Chuyển ARG thành ENV để Next.js nhúng vào bundle JS ---
ENV NEXT_PUBLIC_FRONTEND=$NEXT_PUBLIC_FRONTEND
ENV NEXT_PUBLIC_USER_BACKEND_URL=$NEXT_PUBLIC_USER_BACKEND_URL
ENV NEXT_PUBLIC_COURSE_BACKEND_URL=$NEXT_PUBLIC_COURSE_BACKEND_URL
ENV NEXT_PUBLIC_EXAM_BACKEND_URL=$NEXT_PUBLIC_EXAM_BACKEND_URL
ENV NEXT_PUBLIC_PROGRESS_BACKEND_URL=$NEXT_PUBLIC_PROGRESS_BACKEND_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Thực hiện build dự án
RUN npm run build

# ==========================================
# Stage 3: Runner (Image siêu nhẹ chỉ dùng để chạy)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Tạo User & Group riêng (Không dùng root)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy thư mục public
COPY --from=builder /app/public ./public

# Cấp quyền cho thư mục cache .next
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Tận dụng tính năng Standalone: Chỉ copy các file tối thiểu cần thiết để chạy
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]