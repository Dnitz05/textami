// app/api/upload/template/route.ts
// API endpoint per pujar plantilles Word a Supabase Storage
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/serverClient';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // 1. Crear client Supabase Server amb auth (usa helper proven)
    const supabase = await createServerSupabaseClient();

    // 2. Verificar autenticació
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Error d\'autenticació:', authError);
      return NextResponse.json({ 
        error: 'Usuari no autenticat. Inicia sessió primer.',
        details: authError?.message 
      }, { status: 401 });
    }
    
    const userId = user.id;

    // 2. Processar FormData
    const formData = await request.formData();
    const file = formData.get('template') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No s\'ha proporcionat cap fitxer' },
        { status: 400 }
      );
    }

    // 3. Validacions
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'El fitxer ha de ser .docx' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El fitxer no pot superar els 10MB' },
        { status: 400 }
      );
    }

    // 4. Generar templateId únic
    const templateId = crypto.randomUUID();

    // 5. Preparar upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `user-${userId}/template-${templateId}/original.docx`;

    // 6. Pujar a Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('template-docx')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });

    if (uploadError) {
      console.error('Error pujant a Supabase Storage:', uploadError);
      return NextResponse.json(
        { error: 'Error pujant el fitxer a Storage', details: uploadError.message },
        { status: 500 }
      );
    }

    // 7. Resposta amb auth correcta
    const response = {
      success: true,
      templateId,
      userId,
      fileName: file.name,
      size: file.size,
      storagePath: data.path,
      message: 'Plantilla pujada correctament. Pots continuar amb el pas següent.'
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error processant upload:', error);
    return NextResponse.json(
      { error: 'Error intern del servidor' },
      { status: 500 }
    );
  }
}