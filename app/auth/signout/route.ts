import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/site-auth'

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  response.cookies.delete(AUTH_COOKIE_NAME)
  return response
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  response.cookies.delete(AUTH_COOKIE_NAME)
  return response
}
