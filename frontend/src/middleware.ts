import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path === '/unauthorized' || path.startsWith('/login')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value
  const userRole = request.cookies.get('user_role')?.value

  const isProtectedPath = [
    '/admin',
    '/training-management',
    '/dashboard-student',
    '/instructor-management',
    '/home',
    '/tester-dashboard'
  ].some(p => path.startsWith(p))

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login?mode=login', request.url))
  }

  if (token) {
    const roleClean = userRole?.toLowerCase().trim()

    if (!roleClean) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    if (path.startsWith('/admin') && roleClean !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    if (path.startsWith('/instructor-management') && roleClean !== 'instructor' && roleClean !== 'faculty') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    if (path.startsWith('/training-management') && roleClean !== 'manager') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    if (path.startsWith('/dashboard-student') && roleClean !== 'user' && roleClean !== 'student') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    if (path.startsWith('/tester-dashboard') && roleClean !== 'tester') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // CHO PHÉP TẤT CẢ ROLE ĐÃ ĐĂNG NHẬP VÀO /home
    if (path.startsWith('/home') && !['student', 'user', 'tester', 'instructor', 'faculty', 'manager', 'admin'].includes(roleClean)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  return response
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/training-management',
    '/training-management/:path*',
    '/dashboard-student',
    '/dashboard-student/:path*',
    '/instructor-management',
    '/instructor-management/:path*',
    '/home',
    '/home/:path*',
    '/tester-dashboard',
    '/tester-dashboard/:path*',
  ],
}