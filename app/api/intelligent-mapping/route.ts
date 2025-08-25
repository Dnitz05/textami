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

    // Prepare AI prompt
    const prompt = `Ets un expert en mapping intel·ligent entre dades d'Excel i tags detectats en documents.

TAGS DETECTATS:
${tags.map(tag => `- ${tag.name} (slug: ${tag.slug})
  Exemple: "${tag.example}"
  Tipus: ${tag.type}
  Confiança: ${tag.confidence}`).join('\n')}

CAPÇALERES EXCEL DISPONIBLES:
${excelHeaders.map((header, i) => `${i + 1}. ${header}`).join('\n')}${contextInfo}

TASCA:
Analitza cada tag detectat i suggereix la capçalera Excel més adequada basant-te en:
1. Similitud semàntica entre noms
2. Tipus de dada (string, date, currency, etc.)
3. Exemples de contingut
4. Context del document (si disponible)
5. Patrons comuns en documents municipals/administratius

RESPOSTA EN JSON:
{
  "mappings": [
    {
      "tagSlug": "nom_solicitant",
      "tagName": "Nom solicitant", 
      "suggestedHeader": "Cliente",
      "confidence": 0.95,
      "reasoning": "Ambdós fan referència al nom de la persona que sol·licita",
      "alternativeHeaders": ["Nom", "Solicitant"]
    }
  ]
}

REGLES:
- Confiança alta (0.8-1.0): Match molt clar
- Confiança mitjana (0.6-0.8): Match probable
- Confiança baixa (0.4-0.6): Match incert
- No suggerir si confiança < 0.4
- Màxim 3 alternatives per tag
- Prioritzar coherència amb el context del document`;

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

    const aiMappings = parsedResponse.mappings || [];
    
    // Transform AI suggestions to our format
    const suggestions: IntelligentMappingSuggestion[] = aiMappings.map((mapping: any) => ({
      tagSlug: mapping.tagSlug,
      tagName: mapping.tagName,
      tagExample: tags.find(t => t.slug === mapping.tagSlug)?.example || '',
      suggestedHeader: mapping.suggestedHeader,
      confidence: Math.max(0, Math.min(1, mapping.confidence || 0.5)),
      reasoning: mapping.reasoning || 'AI suggestion',
      alternativeHeaders: mapping.alternativeHeaders || []
    }));

    const mappedCount = suggestions.length;
    const mappingCoverage = tags.length > 0 ? (mappedCount / tags.length) * 100 : 0;

    console.log('✅ AI mapping complete:', {
      totalTags: tags.length,
      mappedTags: mappedCount,
      coverage: `${Math.round(mappingCoverage)}%`,
      highConfidenceCount: suggestions.filter(s => s.confidence >= 0.8).length
    });

    const mappingData: IntelligentMappingResponse = {
      suggestions,
      totalTags: tags.length,
      mappedTags: mappedCount,
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