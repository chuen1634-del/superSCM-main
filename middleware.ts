import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseEnv } from '@/lib/supabase/env';

const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  const { url, publishableKey } = requireSupabaseEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => cookiesToSet.forEach(({ name, value, options }) => { request.cookies.set(name, value); response = NextResponse.next({ request }); response.cookies.set(name, value, options); }),
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return response;
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase.schema('core').from('app_user').select('role, active').eq('user_id', user.id).maybeSingle();
    if (profile?.role !== 'ADMIN' || profile.active !== true) return new NextResponse('Forbidden', { status: 403 });
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health/supabase).*)'] };
