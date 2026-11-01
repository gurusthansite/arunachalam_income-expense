import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/site-auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Allow Next.js internals, static images, and public files
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next()
  }

  // 2. Allow auth endpoints
  if (pathname === '/login' || pathname === '/auth/signout') {
    // If user is already authenticated and visits /login, redirect directly to dashboard
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
    if (token && (await verifyAuthToken(token))) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // 3. Check for valid authentication token
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const isValid = token ? await verifyAuthToken(token) : false

  if (!isValid) {
    // Return 401 for background API requests
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized: site password required' },
        { status: 401 }
      )
    }

    // Redirect to login page and preserve destination path
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
