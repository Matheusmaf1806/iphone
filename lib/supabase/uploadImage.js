import { supabase, isSupabaseConfigured } from './client';

/**
 * Upload de imagem para o Supabase Storage
 * @param {File} file - Arquivo de imagem
 * @param {string} folder - Pasta onde a imagem será salva (ex: 'products', 'affiliates')
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadImage(file, folder = 'products') {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase não está configurado. Verifique as variáveis de ambiente.',
    };
  }

  if (!file) {
    return {
      success: false,
      error: 'Nenhum arquivo fornecido',
    };
  }

  // Validar tipo de arquivo
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WEBP ou GIF.',
    };
  }

  // Validar tamanho do arquivo (máx 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      success: false,
      error: 'Arquivo muito grande. Tamanho máximo: 5MB',
    };
  }

  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${timestamp}-${randomString}.${fileExt}`;

    // Upload para o bucket 'images'
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Erro no upload:', error);
      return {
        success: false,
        error: `Erro ao fazer upload: ${error.message}`,
      };
    }

    // Obter URL pública da imagem
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Erro inesperado no upload:', error);
    return {
      success: false,
      error: 'Erro inesperado ao fazer upload da imagem',
    };
  }
}

/**
 * Deletar imagem do Supabase Storage
 * @param {string} url - URL pública da imagem
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteImage(url) {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase não está configurado',
    };
  }

  if (!url) {
    return {
      success: false,
      error: 'URL não fornecida',
    };
  }

  try {
    // Extrair o caminho do arquivo da URL
    // Formato: https://xxx.supabase.co/storage/v1/object/public/images/products/123-abc.jpg
    const urlParts = url.split('/images/');
    if (urlParts.length < 2) {
      return {
        success: false,
        error: 'URL inválida',
      };
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);

    if (error) {
      console.error('Erro ao deletar imagem:', error);
      return {
        success: false,
        error: `Erro ao deletar: ${error.message}`,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Erro inesperado ao deletar:', error);
    return {
      success: false,
      error: 'Erro inesperado ao deletar imagem',
    };
  }
}
