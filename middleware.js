import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Proteger rotas do painel do afiliado
  if (pathname.startsWith('/afiliado/adm')) {
    const affiliateSession = request.cookies.get('affiliate_session');

    // Se não houver sessão, redirecionar para login
    if (!affiliateSession) {
      const loginUrl = new URL('/afiliado/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar se a sessão não está expirada
    try {
      const sessionData = JSON.parse(
        Buffer.from(affiliateSession.value, 'base64').toString()
      );

      const SESSION_DURATION = 60 * 60 * 24 * 30 * 1000; // 30 dias em ms
      const sessionAge = Date.now() - sessionData.timestamp;

      if (sessionAge > SESSION_DURATION) {
        // Sessão expirada, redirecionar para login
        const loginUrl = new URL('/afiliado/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const response = NextResponse.redirect(loginUrl);

        // Deletar cookie expirado
        response.cookies.delete('affiliate_session');

        return response;
      }
    } catch (error) {
      console.error('Error parsing affiliate session:', error);
      // Se houver erro ao parsear, considerar sessão inválida
      const loginUrl = new URL('/afiliado/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('affiliate_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/afiliado/adm/:path*',
  ],
};
