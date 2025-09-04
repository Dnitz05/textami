/**
 * Google Docs HTML Cleaning Pipeline
 * 
 * This module provides utilities to clean and normalize HTML exported from Google Docs,
 * removing Google-specific noise while preserving semantic structure and important styling.
 */

export interface CleaningOptions {
  preserveFormatting?: boolean;
  preserveColors?: boolean;
  preserveFontSizes?: boolean;
  preserveImages?: boolean;
  removeEmptyElements?: boolean;
  normalizeWhitespace?: boolean;
  convertToSemantic?: boolean;
}

export interface CleaningResult {
  cleanedHtml: string;
  originalHtml: string;
  removedElements: string[];
  preservedStyles: string[];
  warnings: string[];
}

const DEFAULT_OPTIONS: Required<CleaningOptions> = {
  preserveFormatting: true,
  preserveColors: false,
  preserveFontSizes: false,
  preserveImages: true,
  removeEmptyElements: true,
  normalizeWhitespace: true,
  convertToSemantic: true,
};

/**
 * Main HTML cleaning function
 */
export function cleanGoogleDocsHTML(
  html: string, 
  options: CleaningOptions = {}
): CleaningResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalHtml = html;
  const removedElements: string[] = [];
  const preservedStyles: string[] = [];
  const warnings: string[] = [];

  let cleanedHtml = html;

  // Debug logging for empty document troubleshooting
  console.log('🧽 HTML Cleaning Debug - Input:', {
    inputLength: html.length,
    inputPreview: html.substring(0, 200) + '...',
    cleaningOptions: opts
  });

  // Step 1: Remove Google-specific elements and attributes
  cleanedHtml = removeGoogleSpecificElements(cleanedHtml, removedElements);

  // Step 2: Clean CSS classes and inline styles
  cleanedHtml = cleanCSSAndStyles(cleanedHtml, opts, removedElements, preservedStyles);

  // Step 3: Convert to semantic HTML
  if (opts.convertToSemantic) {
    cleanedHtml = convertToSemanticHTML(cleanedHtml, warnings);
  }

  // Step 4: Handle images
  if (opts.preserveImages) {
    cleanedHtml = processImages(cleanedHtml, preservedStyles);
  } else {
    cleanedHtml = cleanedHtml.replace(/<img[^>]*>/gi, '');
    removedElements.push('images');
  }

  // Step 5: Remove empty elements
  if (opts.removeEmptyElements) {
    cleanedHtml = removeEmptyElements(cleanedHtml, removedElements);
  }

  // Step 6: Normalize whitespace
  if (opts.normalizeWhitespace) {
    cleanedHtml = normalizeWhitespace(cleanedHtml);
  }

  // Step 7: Final cleanup and validation
  cleanedHtml = finalCleanup(cleanedHtml);

  // Debug logging for empty document troubleshooting
  console.log('🧽 HTML Cleaning Debug - Output:', {
    originalLength: originalHtml.length,
    cleanedLength: cleanedHtml.length,
    cleanedPreview: cleanedHtml.substring(0, 200) + '...',
    removedElements: removedElements,
    isEmptyAfterCleaning: cleanedHtml.trim().length === 0
  });

  // If cleaning resulted in completely empty content, provide fallback
  if (cleanedHtml.trim().length === 0 && originalHtml.trim().length > 0) {
    console.warn('⚠️ HTML cleaning removed all content - using original HTML as fallback');
    cleanedHtml = originalHtml;
    warnings.push('HTML cleaning was too aggressive - reverted to original HTML');
  }

  return {
    cleanedHtml,
    originalHtml,
    removedElements,
    preservedStyles,
    warnings,
  };
}

/**
 * Remove Google-specific elements and attributes
 */
function removeGoogleSpecificElements(html: string, removedElements: string[]): string {
  let cleaned = html;

  // Remove Google Docs specific comments and metadata
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove Google-specific CSS classes patterns
  const googleClassPatterns = [
    /class="[^"]*c\d+[^"]*"/gi, // Google generated classes like c1, c2, etc.
    /class="[^"]*kix-[^"]*"/gi, // Kix-specific classes
    /class="[^"]*docs-[^"]*"/gi, // Docs-specific classes
  ];

  googleClassPatterns.forEach(pattern => {
    if (pattern.test(cleaned)) {
      removedElements.push(`google-classes-${pattern.source}`);
      cleaned = cleaned.replace(pattern, '');
    }
  });

  // Remove Google-specific attributes
  const googleAttributePatterns = [
    /data-docs-[^=]*="[^"]*"/gi,
    /data-kix-[^=]*="[^"]*"/gi,
    /id="[^"]*kix[^"]*"/gi,
  ];

  googleAttributePatterns.forEach(pattern => {
    if (pattern.test(cleaned)) {
      removedElements.push(`google-attributes-${pattern.source}`);
      cleaned = cleaned.replace(pattern, '');
    }
  });

  return cleaned;
}

/**
 * Clean CSS classes and inline styles
 */
function cleanCSSAndStyles(
  html: string,
  options: Required<CleaningOptions>,
  removedElements: string[],
  preservedStyles: string[]
): string {
  let cleaned = html;

  // Remove all class attributes if not preserving formatting
  if (!options.preserveFormatting) {
    cleaned = cleaned.replace(/class="[^"]*"/g, '');
    removedElements.push('all-classes');
  } else {
    // Remove empty class attributes
    cleaned = cleaned.replace(/class=""/g, '');
    cleaned = cleaned.replace(/class="\s*"/g, '');
  }

  // Handle inline styles
  const styleRegex = /style="([^"]*)"/g;
  cleaned = cleaned.replace(styleRegex, (match, styles) => {
    const cleanedStyles = cleanInlineStyles(styles, options, preservedStyles);
    return cleanedStyles ? `style="${cleanedStyles}"` : '';
  });

  // Remove empty style attributes
  cleaned = cleaned.replace(/style=""/g, '');
  cleaned = cleaned.replace(/style="\s*"/g, '');

  return cleaned;
}

/**
 * Clean individual inline styles
 */
function cleanInlineStyles(
  styles: string,
  options: Required<CleaningOptions>,
  preservedStyles: string[]
): string {
  const styleDeclarations = styles.split(';').filter(s => s.trim());
  const cleanedDeclarations: string[] = [];

  for (const declaration of styleDeclarations) {
    const [property, value] = declaration.split(':').map(s => s.trim());
    
    if (!property || !value) continue;

    // Always preserve essential formatting
    if (['font-weight', 'font-style', 'text-decoration'].includes(property)) {
      cleanedDeclarations.push(`${property}: ${value}`);
      preservedStyles.push(property);
      continue;
    }

    // Preserve colors if requested
    if (options.preserveColors && ['color', 'background-color'].includes(property)) {
      cleanedDeclarations.push(`${property}: ${value}`);
      preservedStyles.push(property);
      continue;
    }

    // Preserve font sizes if requested
    if (options.preserveFontSizes && ['font-size'].includes(property)) {
      cleanedDeclarations.push(`${property}: ${value}`);
      preservedStyles.push(property);
      continue;
    }

    // Skip Google-specific or unwanted styles
    const unwantedProperties = [
      'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
      'padding-left', 'padding-right', 'padding-top', 'padding-bottom',
      'line-height', 'height', 'width', // Often auto-generated and not semantic
      'font-family', // Unless specifically requested
    ];

    if (!unwantedProperties.includes(property)) {
      cleanedDeclarations.push(`${property}: ${value}`);
      preservedStyles.push(property);
    }
  }

  return cleanedDeclarations.join('; ');
}

/**
 * Convert divs and spans to semantic HTML elements
 */
function convertToSemanticHTML(html: string, warnings: string[]): string {
  let semantic = html;

  // Convert div elements that look like headings
  const headingPatterns = [
    { pattern: /<div[^>]*style="[^"]*font-size:\s*2\d+px[^"]*"[^>]*>(.*?)<\/div>/gi, tag: 'h1' },
    { pattern: /<div[^>]*style="[^"]*font-size:\s*1[8-9]px[^"]*"[^>]*>(.*?)<\/div>/gi, tag: 'h2' },
    { pattern: /<div[^>]*style="[^"]*font-size:\s*1[6-7]px[^"]*"[^>]*>(.*?)<\/div>/gi, tag: 'h3' },
    { pattern: /<div[^>]*style="[^"]*font-weight:\s*bold[^"]*"[^>]*>(.*?)<\/div>/gi, tag: 'h3' },
  ];

  headingPatterns.forEach(({ pattern, tag }) => {
    const matches = semantic.match(pattern);
    if (matches) {
      warnings.push(`Converted ${matches.length} div elements to ${tag} based on styling`);
      semantic = semantic.replace(pattern, `<${tag}>$1</${tag}>`);
    }
  });

  // Convert spans with strong styling to semantic elements
  semantic = semantic.replace(
    /<span[^>]*style="[^"]*font-weight:\s*(bold|700|800|900)[^"]*"[^>]*>(.*?)<\/span>/gi,
    '<strong>$2</strong>'
  );
  
  semantic = semantic.replace(
    /<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>(.*?)<\/span>/gi,
    '<em>$1</em>'
  );

  semantic = semantic.replace(
    /<span[^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi,
    '<u>$1</u>'
  );

  // Clean up remaining spans that don't add semantic value
  semantic = semantic.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

  // Convert divs to paragraphs where appropriate
  semantic = semantic.replace(/<div[^>]*>((?:(?!<div|<\/div>).)*?)<\/div>/gi, (match, content) => {
    // Skip if content contains block elements
    if (/<(?:h[1-6]|p|ul|ol|li|table|div|blockquote)[^>]*>/i.test(content)) {
      return match;
    }
    
    // Convert simple divs to paragraphs
    const trimmed = content.trim();
    if (trimmed && trimmed.length > 0) {
      return `<p>${content}</p>`;
    }
    
    return match;
  });

  return semantic;
}

/**
 * Process and clean image elements
 */
function processImages(html: string, preservedStyles: string[]): string {
  return html.replace(/<img([^>]*)>/gi, (match, attributes) => {
    // Clean image attributes
    let cleanAttributes = attributes
      .replace(/style="[^"]*"/g, '') // Remove inline styles for images
      .replace(/class="[^"]*"/g, '') // Remove classes
      .replace(/data-[^=]*="[^"]*"/g, '') // Remove data attributes
      .replace(/id="[^"]*"/g, ''); // Remove ids

    // Preserve essential attributes
    const essentialAttrs = ['src', 'alt', 'title', 'width', 'height'];
    const preservedAttrs: string[] = [];
    
    essentialAttrs.forEach(attr => {
      const attrMatch = cleanAttributes.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
      if (attrMatch) {
        preservedAttrs.push(`${attr}="${attrMatch[1]}"`);
      }
    });

    if (preservedAttrs.length > 0) {
      preservedStyles.push('image-attributes');
      return `<img ${preservedAttrs.join(' ')} />`;
    }

    return '<img />';
  });
}

/**
 * Remove empty HTML elements
 */
function removeEmptyElements(html: string, removedElements: string[]): string {
  let cleaned = html;
  
  // Remove empty paragraphs and divs
  const emptyPatterns = [
    /<p[^>]*>\s*<\/p>/g,
    /<div[^>]*>\s*<\/div>/g,
    /<span[^>]*>\s*<\/span>/g,
    /<h[1-6][^>]*>\s*<\/h[1-6]>/g,
  ];

  emptyPatterns.forEach(pattern => {
    const matches = cleaned.match(pattern);
    if (matches) {
      removedElements.push(`empty-elements-${matches.length}`);
      cleaned = cleaned.replace(pattern, '');
    }
  });

  return cleaned;
}

/**
 * Normalize whitespace in HTML
 */
function normalizeWhitespace(html: string): string {
  return html
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .replace(/\n\s*\n/g, '\n'); // Multiple newlines to single
}

/**
 * Final cleanup and validation
 */
function finalCleanup(html: string): string {
  let cleaned = html;

  // Remove any remaining empty attributes
  cleaned = cleaned.replace(/\s[a-zA-Z-]+=["'][\s]*["']/g, '');
  
  // Fix malformed HTML
  cleaned = cleaned.replace(/\s+>/g, '>'); // Extra spaces before closing brackets
  cleaned = cleaned.replace(/<\s+/g, '<'); // Extra spaces after opening brackets
  
  // Ensure proper HTML structure
  if (!cleaned.includes('<div') && !cleaned.includes('<p>')) {
    // Wrap content in a div if no block elements present
    cleaned = `<div>${cleaned}</div>`;
  }

  return cleaned;
}

/**
 * Utility function to extract plain text from HTML
 */
export function extractPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Validate if HTML is clean and semantic
 */
export function validateCleanHTML(html: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check for Google-specific remnants
  if (/class="[^"]*c\d+/i.test(html)) {
    errors.push('Contains Google-generated class names');
  }

  if (/data-docs-/i.test(html) || /data-kix-/i.test(html)) {
    errors.push('Contains Google Docs specific data attributes');
  }

  // Check for semantic structure
  if (!/<h[1-6]/.test(html)) {
    suggestions.push('Consider adding heading elements for better structure');
  }

  if (/<div[^>]*>(?:(?!<div).)*?<\/div>/i.test(html) && !/<p>/.test(html)) {
    suggestions.push('Consider converting some divs to paragraphs');
  }

  // Check for excessive inline styling
  const styleMatches = html.match(/style="/g);
  if (styleMatches && styleMatches.length > 10) {
    suggestions.push('Consider reducing inline styles for better maintainability');
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions,
  };
}