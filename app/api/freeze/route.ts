// app/api/freeze/route.ts
// Template Freeze: Insert placeholders into DOCX template (one-time operation)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PizZip from 'pizzip';
import { ApiResponse, FreezeResponse, ParsedTag, PlaceholderReplacement } from '../../../lib/types';
import { log } from '@/lib/logger';

interface FreezeRequest {
  templateId: string;
  storageUrl: string; // Path to original DOCX in Supabase Storage
  tags: ParsedTag[];
  mappings: Record<string, string>; // tagSlug -> excelHeader
}

// PlaceholderReplacement and FreezeResponse are now imported from types.ts

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<FreezeResponse>>> {
  log.debug('🧊 Template Freeze Request Started');
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      log.error('❌ Supabase environment variables missing');
      return NextResponse.json(
        { success: false, error: 'Storage configuration required' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    log.debug('✅ Supabase client initialized for template freezing');

    // Parse request data
    const { templateId, storageUrl, tags, mappings }: FreezeRequest = await request.json();
    
    log.debug('🧊 Freeze request:', {
      templateId,
      storageUrl,
      tagsCount: tags.length,
      mappingsCount: Object.keys(mappings).length
    });

    if (!templateId || !storageUrl || !tags || !mappings) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: templateId, storageUrl, tags, mappings' },
        { status: 400 }
      );
    }

    // 1. Retrieve original DOCX from Supabase Storage
    log.debug('📥 Retrieving original DOCX for freezing:', storageUrl);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('template-docx')
      .download(storageUrl);

    if (downloadError || !fileData) {
      log.error('❌ Failed to retrieve DOCX for freezing:', downloadError);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve template for freezing', details: downloadError?.message },
        { status: 500 }
      );
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    
    log.debug('✅ Original DOCX retrieved for freezing:', {
      size: originalBuffer.length,
      type: fileData.type
    });

    // 2. Process DOCX and insert placeholders
    log.debug('🔄 Processing DOCX to insert placeholders...');
    
    let modifiedBuffer: Buffer;
    const replacements: PlaceholderReplacement[] = [];
    
    try {
      // Load DOCX with PizZip
      const zip = new PizZip(originalBuffer);
      
      // Get main document XML
      const documentXml = zip.file('word/document.xml')?.asText();
      if (!documentXml) {
        throw new Error('Could not extract document.xml from DOCX');
      }

      log.debug('📄 Original XML length:', documentXml.length);
      
      let modifiedXml = documentXml;
      let successfulReplacements = 0;

      // Process each tag for placeholder insertion
      for (const tag of tags) {
        const mappedHeader = mappings[tag.slug];
        if (!mappedHeader) {
          log.debug(`⚠️ Skipping unmapped tag: ${tag.name}`);
          continue;
        }

        const placeholder = `{{${tag.slug}}}`;
        let replacement: PlaceholderReplacement = {
          original: tag.example,
          placeholder,
          confidence: 0,
          method: 'manual_required',
          applied: false
        };

        // Strategy 1: Exact match replacement
        if (tag.example && tag.example.length > 2) {
          const exactMatches = (modifiedXml.match(new RegExp(escapeRegExp(tag.example), 'g')) || []).length;
          
          if (exactMatches === 1) {
            // Safe to replace - only one occurrence
            const regex = new RegExp(escapeRegExp(tag.example), 'g');
            const beforeLength = modifiedXml.length;
            modifiedXml = modifiedXml.replace(regex, placeholder);
            
            if (modifiedXml.length !== beforeLength) {
              replacement = {
                ...replacement,
                confidence: 0.95,
                method: 'exact_match',
                applied: true
              };
              successfulReplacements++;
              log.debug(`✅ Exact match: "${tag.example}" → ${placeholder}`);
            }
          } else if (exactMatches > 1) {
            replacement.reason = `Multiple matches found (${exactMatches}), manual review required`;
            log.debug(`⚠️ Multiple matches: "${tag.example}" (${exactMatches})`);
          } else {
            replacement.reason = 'No exact matches found';
            log.debug(`❌ No match: "${tag.example}"`);
          }
        }

        // Strategy 2: Anchor-based replacement (if exact match failed)
        if (!replacement.applied && tag.anchor) {
          const anchorPattern = escapeRegExp(tag.anchor);
          const anchorRegex = new RegExp(`(${anchorPattern})([^<]*?)(${escapeRegExp(tag.example)})`, 'g');
          
          const anchorMatches = modifiedXml.match(anchorRegex);
          if (anchorMatches && anchorMatches.length === 1) {
            modifiedXml = modifiedXml.replace(anchorRegex, `$1$2${placeholder}`);
            replacement = {
              ...replacement,
              confidence: 0.8,
              method: 'anchor_based',
              applied: true,
              reason: `Used anchor: "${tag.anchor}"`
            };
            successfulReplacements++;
            log.debug(`✅ Anchor match: "${tag.anchor}" → ${placeholder}`);
          } else {
            replacement.reason = replacement.reason || `Anchor "${tag.anchor}" not found or ambiguous`;
          }
        }

        // Strategy 3: Pattern-based replacement for common cases
        if (!replacement.applied) {
          // For currency amounts, try pattern matching
          if (tag.type === 'currency' && tag.example.includes('€')) {
            const amountPattern = /\d+[,\.]\d{2}\s*€/g;
            const matches = modifiedXml.match(amountPattern);
            
            if (matches && matches.length === 1 && matches[0] === tag.example) {
              modifiedXml = modifiedXml.replace(amountPattern, placeholder);
              replacement = {
                ...replacement,
                confidence: 0.7,
                method: 'pattern_match',
                applied: true,
                reason: 'Currency pattern match'
              };
              successfulReplacements++;
              log.debug(`✅ Pattern match: ${tag.example} → ${placeholder}`);
            }
          }
        }

        replacements.push(replacement);
      }

      // Generate modified DOCX
      zip.file('word/document.xml', modifiedXml);
      modifiedBuffer = zip.generate({ 
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });

      log.debug('✅ DOCX modification complete:', {
        originalSize: originalBuffer.length,
        modifiedSize: modifiedBuffer.length,
        successfulReplacements,
        totalTags: tags.length
      });

    } catch (processingError) {
      log.error('❌ DOCX processing failed:', processingError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to process DOCX for placeholder insertion',
          details: processingError instanceof Error ? processingError.message : 'Unknown processing error'
        },
        { status: 500 }
      );
    }

    // 3. Save frozen template to storage
    const frozenFileName = `frozen_${templateId}_${Date.now()}.docx`;
    log.debug('💾 Saving frozen template:', frozenFileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('template-docx')
      .upload(frozenFileName, modifiedBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });

    if (uploadError) {
      log.error('❌ Failed to save frozen template:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to save frozen template', details: uploadError.message },
        { status: 500 }
      );
    }

    // 4. Get public URL for frozen template
    const { data: publicUrlData } = supabase.storage
      .from('template-docx')
      .getPublicUrl(uploadData.path);

    log.debug('✅ Frozen template saved:', publicUrlData.publicUrl);

    // 5. Identify tags requiring manual review
    const manualReviewRequired = replacements
      .filter(r => !r.applied)
      .map(r => r.original);

    const freezeData: FreezeResponse = {
      templateId,
      frozenTemplateUrl: uploadData.path,
      replacements,
      totalReplacements: replacements.length,
      successfulReplacements: replacements.filter(r => r.applied).length,
      manualReviewRequired,
      frozenAt: new Date().toISOString()
    };

    const response: ApiResponse<FreezeResponse> = {
      success: true,
      data: freezeData
    };

    log.debug('✅ Template freeze complete:', {
      templateId,
      successRate: `${response.data?.successfulReplacements}/${response.data?.totalReplacements}`,
      manualReviewCount: manualReviewRequired.length
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('❌ Unexpected error in template freeze:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Template freeze failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}