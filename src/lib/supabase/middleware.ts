import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Paths that don't require authentication
  const publicPaths = ['/', '/auth/callback']
  const isPublicPath = publicPaths.some(p => request.nextUrl.pathname === p)

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // If logged in and trying to access login page, redirect to appropriate home
  if (user && request.nextUrl.pathname === '/') {
    // Fetch user role from users table
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const activeRoleCookie = request.cookies.get('activeRole')?.value
    let targetRole = activeRoleCookie
    if (!targetRole || !profile?.role?.includes(targetRole)) {
      targetRole = profile?.role?.includes('staff') ? 'staff' : profile?.role?.split(',')[0]?.trim()
    }

    const url = request.nextUrl.clone()
    if (targetRole === 'admin') {
      url.pathname = '/admin/manajemen-iku'
    } else if (['rektor', 'pimpinan_sukpa', 'pimpinan_unit'].includes(targetRole || '')) {
      url.pathname = '/monitoring'
    } else {
      url.pathname = '/dashboard'
    }
    return NextResponse.redirect(url)
  }

  // Role-based route protection for admin routes
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const activeRoleCookie = request.cookies.get('activeRole')?.value
    const hasAdminInRoles = profile?.role?.includes('admin')

    // Disallow if user has no admin role at all or currently active role is explicitly not admin
    if (!hasAdminInRoles || (activeRoleCookie && activeRoleCookie !== 'admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
