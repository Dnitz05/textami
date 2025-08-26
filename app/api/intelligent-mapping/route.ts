// app/api/intelligent-mapping/route.ts
// AI-powered intelligent mapping between Excel headers and detected tags
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ApiResponse, ParsedTag } from '../../../lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface IntelligentMappingRequest {
  tags: ParsedTag[];
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
  console.log('🧠 Intelligent AI Mapping Request Started');
  
  try {
    const { tags, excelHeaders, documentContent = '' }: IntelligentMappingRequest = await request.json();
    
    console.log('🔍 AI Mapping request:', {
      tagsCount: tags.length,
      headersCount: excelHeaders.length,
      hasContext: documentContent.length > 0
    });

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tags provided for mapping' },
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

    // Prepare AI prompt - IMPORTANT: Map HEADERS to TAGS (not tags to headers)
    const prompt = `Ets un expert en mapping intel·ligent entre capçaleres d'Excel i tags detectats en documents municipals/administratius.

CAPÇALERES EXCEL DISPONIBLES:
${excelHeaders.map((header, i) => `${i + 1}. "${header}"`).join('\n')}

TAGS DETECTATS EN EL DOCUMENT:
${tags.map(tag => `- ${tag.name} (slug: ${tag.slug})
  Exemple detectat: "${tag.example}"
  Tipus: ${tag.type}
  Confiança: ${Math.round(tag.confidence * 100)}%`).join('\n')}${contextInfo}

TASCA CRÍTICA:
Per a CADA capçalera d'Excel, has d'assignar OBLIGATÒRIAMENT el tag més adequat. NO pots deixar cap capçalera sense assignar.

Analitza cada capçalera Excel i assigna el tag més adequat basant-te en:
1. Significat semàntic i context del nom de la capçalera
2. Tipus de dada que conté probablement (nom, data, import, adreça, etc.)
3. Exemples detectats en el document
4. Context del document complet
5. Coneixement de documents municipals catalans
6. Lògica de substitució: prova mentalment si la capçalera podria contenir el valor de l'exemple del tag

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

REGLES OBLIGATÒRIES:
- CADA capçalera Excel ha de tenir un tag assignat (${excelHeaders.length} capçaleres = ${excelHeaders.length} assignacions)
- Si no hi ha match perfecte, assigna el tag més similar o genèric
- Confiança alta (0.8-1.0): Match molt clar
- Confiança mitjana (0.6-0.8): Match probable
- Confiança baixa (0.4-0.6): Match de fallback, però SEMPRE assigna alguna cosa
- Prioritza tags amb exemples clars i context coherent
- Un mateix tag pot ser assignat a múltiples capçaleres si és necessari`;

    // Call GPT-5 for intelligent mapping
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Ets un expert en anàlisi de documents i mapping de dades. Proporciona suggeriments precisos i útils."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_object"
      },
      max_tokens: 4000,
      temperature: 0.1 // Low temperature for consistent suggestions
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('Empty response from AI');
    }

    console.log('🤖 AI mapping response length:', aiResponse.length);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    const aiHeaderMappings = parsedResponse.headerMappings || [];
    
    // Transform AI header mappings to our suggestion format
    const suggestions: IntelligentMappingSuggestion[] = aiHeaderMappings.map((mapping: any) => ({
      tagSlug: mapping.assignedTagSlug,
      tagName: mapping.assignedTagName,
      tagExample: mapping.assignedTagExample || tags.find(t => t.slug === mapping.assignedTagSlug)?.example || '',
      suggestedHeader: mapping.excelHeader,
      confidence: Math.max(0, Math.min(1, mapping.confidence || 0.5)),
      reasoning: mapping.reasoning || 'AI suggestion',
      alternativeHeaders: [] // Not needed in new format
    }));

    // Ensure ALL headers have a mapping - if AI missed any, create fallback mappings
    const mappedHeaders = new Set(suggestions.map(s => s.suggestedHeader));
    const unmappedHeaders = excelHeaders.filter(header => !mappedHeaders.has(header));
    
    if (unmappedHeaders.length > 0) {
      console.log('⚠️ Creating fallback mappings for unmapped headers:', unmappedHeaders);
      
      // Create fallback mappings for unmapped headers
      unmappedHeaders.forEach(header => {
        // Find best matching tag based on name similarity
        const bestTag = tags.reduce((best, tag) => {
          const similarity = calculateSimilarity(header.toLowerCase(), tag.name.toLowerCase());
          return similarity > calculateSimilarity(header.toLowerCase(), best.name.toLowerCase()) ? tag : best;
        }, tags[0]);

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

    console.log('✅ AI header mapping complete:', {
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
    console.error('❌ Intelligent mapping error:', error);
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