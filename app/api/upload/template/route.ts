// app/api/upload/template/route.ts
// API endpoint per processar plantilles Word
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Crear directori d'uploads si no existeix
async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), 'uploads', 'templates');
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
}

// Extreure variables de plantilla Word
function extractVariables(content: string): string[] {
  // Buscar patrons com {nom}, {data}, etc.
  const regex = /\{([^}]+)\}/g;
  const matches = content.match(regex) || [];
  const uniqueVars = [...new Set(matches)];
  return uniqueVars;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('template') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No s\'ha proporcionat cap fitxer' },
        { status: 400 }
      );
    }

    // Validar que sigui un fitxer .docx
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'El fitxer ha de ser .docx' },
        { status: 400 }
      );
    }

    // Validar mida (màx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El fitxer no pot superar els 10MB' },
        { status: 400 }
      );
    }

    const uploadDir = await ensureUploadDir();
    
    // Generar nom únic
    const fileId = crypto.randomUUID();
    const fileName = `${fileId}.docx`;
    const filePath = path.join(uploadDir, fileName);
    
    // Guardar fitxer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // Extreure text per buscar variables (simplificat)
    const textContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 5000));
    const variables = extractVariables(textContent);

    const response = {
      success: true,
      fileId,
      fileName: file.name,
      size: file.size,
      variables,
      message: `Plantilla pujada correctament. Detectades ${variables.length} variables.`
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error pujant plantilla:', error);
    return NextResponse.json(
      { error: 'Error intern del servidor' },
      { status: 500 }
    );
  }
}