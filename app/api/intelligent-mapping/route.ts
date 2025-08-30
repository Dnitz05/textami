// app/api/intelligent-mapping/route.ts
// AI-powered intelligent mapping between Excel headers and detected tags
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ApiResponse, ParsedTag } from '../../../lib/types';
import { log } from '@/lib/logger';

// Initialize OpenAI client lazily to avoid build errors
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

interface IntelligentMappingRequest {
  tags?: ParsedTag[]; // Legacy format for backwards compatibility
  placeholders?: Array<{  // New OOXML+IA format
    text: string;
    variable: string;
    confidence: number;
    context: string;
    type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
  }>;
  excelHeaders: string[];
  documentContent?: string; // Optional context from document
}

interface IntelligentMappingSuggestion {
  tagSlug: string;
  tagName: string;
  tagExample: string;
  suggestedHeader: string;
  confidence: number; // 0-1
  reasoning: string;
  alternativeHeaders: string[]; // Other possible matches
}

interface IntelligentMappingResponse {
  suggestions: IntelligentMappingSuggestion[];
  totalTags: number;
  mappedTags: number;
  mappingCoverage: number;
}

// Helper function to convert OOXML+IA placeholder types to DocumentType
function mapPlaceholderTypeToDocumentType(placeholderType: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other'): 'string' | 'date' | 'currency' | 'percent' | 'number' | 'id' | 'address' {
  switch (placeholderType) {
    case 'date':
      return 'date';
    case 'currency':
      return 'currency';
    case 'number':
      return 'number';
    case 'email':
      return 'id'; // Email is treated as ID type
    case 'other':
      return 'address'; // Other types mapped to address for flexibility
    case 'text':
    default:
      return 'string';
  }
}

// Simple string similarity function (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const editDistance = levenshteinDistance(longer, shorter);
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<IntelligentMappingResponse>>> {
  log.debug('🧠 Intelligent AI Mapping Request Started');
  
  try {
    const { tags, placeholders, excelHeaders, documentContent = '' }: IntelligentMappingRequest = await request.json();
    
    // Convert placeholders to ParsedTag format if using new OOXML+IA pipeline
    let normalizedTags: ParsedTag[] = [];
    
    if (placeholders && Array.isArray(placeholders) && placeholders.length > 0) {
      // New OOXML+IA format - convert placeholders to ParsedTag
      normalizedTags = placeholders.map((placeholder, index) => ({
        name: placeholder.variable || placeholder.text,
        slug: placeholder.variable.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        example: placeholder.text,
        type: mapPlaceholderTypeToDocumentType(placeholder.type),
        confidence: placeholder.confidence / 100, // Convert percentage to 0-1 scale
        page: 1,
        anchor: placeholder.context || '',
        normalized: null
      }));
      
      log.debug('🔄 Converted placeholders to ParsedTag format:', {
        placeholdersCount: placeholders.length,
        convertedTagsCount: normalizedTags.length
      });
    } else if (tags && Array.isArray(tags) && tags.length > 0) {
      // Legacy format - use as is
      normalizedTags = tags;
      log.debug('📜 Using legacy ParsedTag format:', {
        tagsCount: tags.length
      });
    }
    
    log.debug('🔍 AI Mapping request:', {
      normalizedTagsCount: normalizedTags.length,
      headersCount: excelHeaders.length,
      hasContext: documentContent.length > 0,
      headers: excelHeaders
    });

    if (!normalizedTags || normalizedTags.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tags or placeholders provided for mapping' },
        { status: 400 }
      );
    }

    if (!excelHeaders || !Array.isArray(excelHeaders) || excelHeaders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No Excel headers provided for mapping' },
        { status: 400 }
      );
    }

    // Build context for AI analysis
    const contextInfo = documentContent.length > 0 
      ? `\n\nCONTEXT DEL DOCUMENT:\n${documentContent.substring(0, 2000)}\n`
      : '';

    // Prepare AI prompt with ULTRATHINK reasoning - IMPORTANT: Map HEADERS to TAGS (not tags to headers)
    const prompt = `Ets un expert en mapping intel·ligent entre capçaleres d'Excel i tags detectats en documents municipals/administratius.

CAPÇALERES EXCEL DISPONIBLES:
${excelHeaders.map((header, i) => `${i + 1}. "${header}"`).join('\n')}

TAGS DETECTATS EN EL DOCUMENT:
${normalizedTags.map(tag => `- ${tag.name} (slug: ${tag.slug})
  Exemple detectat: "${tag.example}"
  Tipus: ${tag.type}
  Confiança: ${Math.round(tag.confidence * 100)}%`).join('\n')}${contextInfo}

🧠 ULTRATHINK MODE ACTIVAT:
Abans de respondre, PENSA PROFUNDAMENT sobre cada capçalera:

1. ANÀLISI SEMÀNTICA: Quin és el significat real de la capçalera?
2. CONTEXT MUNICIPAL: Com s'usen aquestes dades en documents oficials?
3. TIPUS DE DADA: Quin format tindria realment el contingut?
4. EXEMPLES REALS: Els exemples del document encaixen amb aquesta capçalera?
5. RAONAMENT LÒGIC: Si fossis un funcionari, quina dada posaries sota aquesta capçalera?
6. ALTERNATIVES: Hi ha altres tags que també podrien encaixar? Per què aquest és millor?

TASCA CRÍTICA - ZERO EXCEPCIONS:
Per a CADA capçalera d'Excel, has d'assignar OBLIGATÒRIAMENT el tag més adequat. 
Si no trobes match perfecte, usa raonament creatiu per trobar el més similar.
NO pots deixar cap capçalera sense assignar. És millor una assignació imperfecta que cap assignació.

PROCÉS DE RAONAMENT PER CADA CAPÇALERA:
1. Llegeix la capçalera i entén què vol dir
2. Revisa TOTS els tags disponibles un per un
3. Per cada tag potencial, pregunta't: "Podria aquesta capçalera contenir aquest tipus de dada?"
4. Avalua exemples: "L'exemple del tag té sentit sota aquesta capçalera?"
5. Si múltiples opcions, tria la més específica i contextual
6. Si cap opció és perfecta, tria la millor aproximació disponible

EXEMPLES OBLIGATORIS DE MAPATGE EVIDENTS:
- "NOM" → "nom_solicitant" (100% segur)
- "CLIENTE" → "nom_solicitant" (100% segur)
- "SOLICITANTE" → "nom_solicitant" (100% segur)
- "DATA" → tags amb tipus "date" (100% segur)
- "FECHA" → tags amb tipus "date" (100% segur)
- "IMPORT" → tags amb tipus "currency" (100% segur)
- "DIRECCIÓ" → tags de tipus "address" (100% segur)

RESPOSTA OBLIGATÒRIA EN JSON:
{
  "headerMappings": [
    {
      "excelHeader": "Cliente",
      "assignedTagSlug": "nom_solicitant",
      "assignedTagName": "Nom solicitant",
      "assignedTagExample": "Paquita Ferre SL",
      "confidence": 0.95,
      "reasoning": "La capçalera 'Cliente' clarament correspon al nom del solicitant. L'exemple 'Paquita Ferre SL' encaixa perfectament."
    }
  ]
}

⚠️ REGLES ABSOLUTES - CAP EXCEPCIÓ PERMESA:
1. OBLIGATORI: ${excelHeaders.length} capçaleres = ${excelHeaders.length} assignacions exactes
2. CAP capçalera pot quedar sense tag - és inacceptable
3. Si dubtes entre opcions, tria la que tingui millor exemple contextual
4. Si cap tag sembla perfecte, usa el més genèric però SEMPRE assigna
5. Un tag pot reutilitzar-se per múltiples capçaleres si és necessari
6. Confiança realista: 
   - 0.9-1.0: Match perfecte i evident
   - 0.7-0.9: Match molt probable amb bon raonament
   - 0.5-0.7: Match raonable amb lògica sòlida
   - 0.3-0.5: Match de fallback però justificat
   - MAI menys de 0.3 - sempre hi ha alguna connexió lògica
7. Raonament obligatori i detallat per cada assignació
8. Pensa com un expert: cada capçalera CONTÉ alguna informació, i aquesta informació SEMPRE correspon a algun dels tags disponibles`;

    // Call GPT-4o with enhanced reasoning (fallback from GPT-5)
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Ets el millor expert mundial en anàlisi de documents i mapping de dades. La teva tasca és crítica: CADA capçalera Excel OBLIGATÒRIAMENT ha de tenir un tag assignat. No pots fallar en aquesta tasca. Usa tot el teu coneixement i raonament per trobar la millor correspondència possible."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_object"
      },
      max_tokens: 6000 // Més tokens per raonament profund
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('Empty response from AI');
    }

    log.debug('🤖 AI mapping response length:', aiResponse.length);
    log.debug('🧠 Raw AI response:', aiResponse);
    log.debug('🔍 DEBUGGING ESPECÍFIC - Headers esperats:', excelHeaders);
    log.debug('🔍 DEBUGGING ESPECÍFIC - Tags disponibles:', normalizedTags.map(t => `${t.name} (${t.slug}) - exemple: ${t.example}`));

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      log.error('❌ Failed to parse AI response:', parseError);
      log.debug('💥 Problematic response:', aiResponse);
      throw new Error('Invalid JSON response from AI');
    }

    const aiHeaderMappings = parsedResponse.headerMappings || [];
    log.debug('📋 AI returned mappings for headers:', aiHeaderMappings.map((m: any) => m.excelHeader));
    log.debug('📋 Expected headers:', excelHeaders);
    
    // Transform AI header mappings to our suggestion format (headers are already clean)
    const suggestions: IntelligentMappingSuggestion[] = aiHeaderMappings.map((mapping: any) => ({
      tagSlug: mapping.assignedTagSlug,
      tagName: mapping.assignedTagName,
      tagExample: mapping.assignedTagExample || normalizedTags.find(t => t.slug === mapping.assignedTagSlug)?.example || '',
      suggestedHeader: mapping.excelHeader,
      confidence: Math.max(0, Math.min(1, mapping.confidence || 0.5)),
      reasoning: mapping.reasoning || 'AI suggestion',
      alternativeHeaders: [] // Not needed in new format
    }));

    // Ensure ALL headers have a mapping - if AI missed any, create fallback mappings
    const mappedHeaders = new Set(suggestions.map(s => s.suggestedHeader));
    const unmappedHeaders = excelHeaders.filter(header => !mappedHeaders.has(header));
    
    if (unmappedHeaders.length > 0) {
      log.debug('⚠️ Creating fallback mappings for unmapped headers:', unmappedHeaders);
      
      // Create fallback mappings for unmapped headers
      unmappedHeaders.forEach(header => {
        // Find best matching tag based on name similarity
        const bestTag = normalizedTags.reduce((best, tag) => {
          const similarity = calculateSimilarity(header.toLowerCase(), tag.name.toLowerCase());
          return similarity > calculateSimilarity(header.toLowerCase(), best.name.toLowerCase()) ? tag : best;
        }, normalizedTags[0]);

        suggestions.push({
          tagSlug: bestTag.slug,
          tagName: bestTag.name,
          tagExample: bestTag.example || '',
          suggestedHeader: header,
          confidence: 0.4, // Low confidence fallback
          reasoning: `Mapping de fallback basat en similitud de nom`,
          alternativeHeaders: []
        });
      });
    }

    const mappedCount = suggestions.length;
    const mappingCoverage = excelHeaders.length > 0 ? (mappedCount / excelHeaders.length) * 100 : 0;

    log.debug('✅ AI header mapping complete:', {
      totalHeaders: excelHeaders.length,
      mappedHeaders: mappedCount,
      coverage: `${Math.round(mappingCoverage)}%`,
      highConfidenceCount: suggestions.filter(s => s.confidence >= 0.8).length,
      allHeadersMapped: mappedCount === excelHeaders.length
    });

    const mappingData: IntelligentMappingResponse = {
      suggestions,
      totalTags: excelHeaders.length, // Now represents total headers
      mappedTags: mappedCount, // Now represents mapped headers
      mappingCoverage
    };

    return NextResponse.json({
      success: true,
      data: mappingData
    });

  } catch (error) {
    log.error('❌ Intelligent mapping error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Intelligent mapping failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}