// app/api/map/route.ts
// Excel Mapping with Fuzzy Matching for AI-extracted tags
import { NextRequest, NextResponse } from 'next/server';
import { distance } from 'fastest-levenshtein';
import { ApiResponse, MappingResponse, TagMapping, ParsedTag, MappingSuggestion } from '../../../lib/types';
import { log } from '@/lib/logger';

interface MappingRequest {
  tags: ParsedTag[];
  excelHeaders: string[];
  confidenceThreshold?: number; // Default 0.7
}

// MappingSuggestion is now TagMapping in types.ts
// MappingResponse structure updated in types.ts

/**
 * Calculate fuzzy matching score between tag and header
 */
function calculateFuzzyScore(tagName: string, header: string): number {
  const tag = tagName.toLowerCase().replace(/[_\s]+/g, '');
  const h = header.toLowerCase().replace(/[_\s]+/g, '');
  
  // Calculate Levenshtein distance
  const dist = distance(tag, h);
  const maxLen = Math.max(tag.length, h.length);
  
  if (maxLen === 0) return 0;
  
  // Convert distance to similarity score (0-1)
  const similarity = 1 - (dist / maxLen);
  
  return Math.max(0, similarity);
}

/**
 * Enhanced matching with semantic understanding
 */
function enhancedMatch(tagName: string, tagExample: string, header: string): {
  score: number;
  reasoning: string;
} {
  const tag = tagName.toLowerCase();
  const example = tagExample.toLowerCase();
  const h = header.toLowerCase();
  
  let score = calculateFuzzyScore(tagName, header);
  let reasoning = `Fuzzy match: ${Math.round(score * 100)}%`;
  
  // Boost score for semantic matches
  const semanticMappings = [
    // Names
    { tags: ['nom', 'name', 'solicitant', 'client'], headers: ['nom', 'name', 'cliente', 'solicitant'], boost: 0.3 },
    { tags: ['cognoms', 'apellidos', 'surname'], headers: ['cognoms', 'apellidos', 'surname', 'cognom'], boost: 0.3 },
    
    // Addresses
    { tags: ['adreca', 'direccio', 'address'], headers: ['adreca', 'direccio', 'address', 'carrer'], boost: 0.25 },
    { tags: ['municipi', 'city', 'ciudad'], headers: ['municipi', 'city', 'ciudad', 'poblacio'], boost: 0.25 },
    
    // Financial
    { tags: ['pressupost', 'import', 'amount', 'preu'], headers: ['import', 'pressupost', 'amount', 'preu', 'total'], boost: 0.3 },
    { tags: ['quota', 'taxa'], headers: ['quota', 'taxa', 'tax', 'fee'], boost: 0.25 },
    
    // Dates
    { tags: ['data', 'fecha', 'date'], headers: ['data', 'fecha', 'date'], boost: 0.3 },
    
    // Documents
    { tags: ['expedient', 'referencia'], headers: ['expedient', 'referencia', 'ref', 'numero'], boost: 0.2 }
  ];
  
  for (const mapping of semanticMappings) {
    const tagMatch = mapping.tags.some(t => tag.includes(t) || t.includes(tag));
    const headerMatch = mapping.headers.some(h => h.includes(h) || header.toLowerCase().includes(h));
    
    if (tagMatch && headerMatch) {
      score = Math.min(1, score + mapping.boost);
      reasoning += `, semantic boost (+${Math.round(mapping.boost * 100)}%)`;
      break;
    }
  }
  
  // Example content analysis
  if (example && header.length > 2) {
    // Check if example content hints at the header type
    if (example.includes('€') && (h.includes('import') || h.includes('total') || h.includes('preu'))) {
      score = Math.min(1, score + 0.2);
      reasoning += ', currency example match';
    }
    
    if (example.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) && h.includes('data')) {
      score = Math.min(1, score + 0.2);
      reasoning += ', date format match';
    }
    
    if (example.includes('%') && (h.includes('pct') || h.includes('percent') || h.includes('taxa'))) {
      score = Math.min(1, score + 0.2);
      reasoning += ', percentage match';
    }
  }
  
  return { score, reasoning };
}

export async function POST(request: NextRequest) {
  log.debug('🔗 Excel Mapping Request Started');
  
  try {
    const { tags, excelHeaders, confidenceThreshold = 0.7 }: MappingRequest = await request.json();
    
    log.debug('📊 Mapping request:', {
      tagsCount: tags.length,
      headersCount: excelHeaders.length,
      threshold: confidenceThreshold
    });

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: 'No tags provided for mapping' },
        { status: 400 }
      );
    }

    if (!excelHeaders || !Array.isArray(excelHeaders) || excelHeaders.length === 0) {
      return NextResponse.json(
        { error: 'No Excel headers provided for mapping' },
        { status: 400 }
      );
    }

    const suggestions: MappingSuggestion[] = [];
    let mappedCount = 0;

    // Generate suggestions for each tag
    for (const tag of tags) {
      let bestMatch = { header: '', score: 0, reasoning: '' };
      
      // Test against all headers
      for (const header of excelHeaders) {
        const matchResult = enhancedMatch(tag.name, tag.example, header);
        
        if (matchResult.score > bestMatch.score) {
          bestMatch = {
            header,
            score: matchResult.score,
            reasoning: matchResult.reasoning
          };
        }
      }

      // Only suggest if above threshold
      if (bestMatch.score >= confidenceThreshold) {
        const confidence = bestMatch.score;

        suggestions.push({
          tagSlug: tag.slug,
          tagName: tag.name,
          tagExample: tag.example,
          suggestedHeader: bestMatch.header,
          confidence,
          reasoning: bestMatch.reasoning
        });

        mappedCount++;
        
        log.debug(`✅ Match: ${tag.name} → ${bestMatch.header} (${Math.round(bestMatch.score * 100)}%)`);
      } else {
        log.debug(`❌ No match: ${tag.name} (best: ${Math.round(bestMatch.score * 100)}%)`);
      }
    }

    const mappingCoverage = tags.length > 0 ? (mappedCount / tags.length) * 100 : 0;

    log.debug('✅ Mapping analysis complete:', {
      totalTags: tags.length,
      mappedTags: mappedCount,
      coverage: `${Math.round(mappingCoverage)}%`,
      suggestionsGenerated: suggestions.length
    });

    const mappingData: MappingResponse = {
      suggestions,
      totalTags: tags.length,
      mappedTags: mappedCount,
      mappingCoverage
    };

    const response: ApiResponse<MappingResponse> = {
      success: true,
      data: mappingData
    };

    return NextResponse.json(response);

  } catch (error) {
    log.error('❌ Mapping error:', error);
    return NextResponse.json(
      { 
        error: 'Mapping analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}