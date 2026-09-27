import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Public paths — no auth required
  const publicPaths = ['/', '/auth/login', '/auth/signup', '/auth/verify-email',
    '/auth/reset-password', '/api/webhooks']
  const isPublic = publicPaths.some(p => path === p || path.startsWith('/api/webhooks'))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  if (user && (path === '/auth/login' || path === '/auth/signup')) {
    return NextResponse.redirect(new URL('/portal/dashboard', request.url))
  }

  // Admin route guard
  if (path.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['agent', 'manager', 'super_admin'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url))
    }

    // Super admin only
    if (path.startsWith('/admin/staff') || path.startsWith('/admin/audit-log')) {
      if (profile.role !== 'super_admin' && profile.role !== 'manager') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|fonts|images).*)',
  ],
}
