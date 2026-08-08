import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { createServerClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Prefer admin client (bypasses RLS), fall back to regular server client
    const supabase = createAdminClient() || createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Serviço não configurado' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'uploads';

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WEBP ou GIF.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Arquivo muito grande. Tamanho máximo: 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalName = file.name || 'image';
    const fileExt = originalName.split('.').pop() || 'png';
    const fileName = `${folder}/${timestamp}-${randomString}.${fileExt}`;

    // Convert to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[Upload API] Storage error:', error);
      return NextResponse.json(
        { success: false, error: `Erro no upload: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('[Upload API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro inesperado no upload' },
      { status: 500 }
    );
  }
}
