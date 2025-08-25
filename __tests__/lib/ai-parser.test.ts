// __tests__/lib/ai-parser.test.ts
// Tests for AI response parsing and normalization
import { 
  normalizeValue, 
  parseAIAnalysis, 
  TagType,
  ParsedTag,
  ParsedAnalysis 
} from '../../lib/ai-parser';

describe('normalizeValue', () => {
  describe('currency normalization', () => {
    it('should normalize currency values with €', () => {
      expect(normalizeValue('683,00 €', 'currency')).toBe(683.00);
      expect(normalizeValue('1.250,50 €', 'currency')).toBe(1250.50);
      expect(normalizeValue('€ 500,00', 'currency')).toBe(500.00);
    });

    it('should handle currency without € symbol', () => {
      expect(normalizeValue('1.500,75', 'currency')).toBe(1500.75);
      expect(normalizeValue('250,00', 'currency')).toBe(250.00);
    });

    it('should return original value for invalid currency', () => {
      expect(normalizeValue('not a number', 'currency')).toBe('not a number');
      expect(normalizeValue('€€€', 'currency')).toBe('€€€');
    });
  });

  describe('percent normalization', () => {
    it('should normalize percentage values', () => {
      expect(normalizeValue('25%', 'percent')).toBe(0.25);
      expect(normalizeValue('100%', 'percent')).toBe(1.0);
      expect(normalizeValue('0,5%', 'percent')).toBe(0.005);
    });

    it('should handle percent without % symbol', () => {
      expect(normalizeValue('50', 'percent')).toBe(0.5);
      expect(normalizeValue('75,5', 'percent')).toBe(0.755);
    });

    it('should return original for invalid percent', () => {
      expect(normalizeValue('not a percent', 'percent')).toBe('not a percent');
    });
  });

  describe('number normalization', () => {
    it('should normalize numeric values', () => {
      expect(normalizeValue('123', 'number')).toBe(123);
      expect(normalizeValue('456,78', 'number')).toBe(456.78);
      expect(normalizeValue('1.234,56', 'number')).toBe(1234.56);
    });

    it('should return original for invalid numbers', () => {
      expect(normalizeValue('not a number', 'number')).toBe('not a number');
      expect(normalizeValue('abc123', 'number')).toBe('abc123');
    });
  });

  describe('date normalization', () => {
    it('should normalize Catalan date formats', () => {
      expect(normalizeValue("8 d'abril de 2021", 'date')).toBe('2021-04-08');
      expect(normalizeValue("15 de març de 2023", 'date')).toBe('2023-03-15');
      expect(normalizeValue("1 de gener de 2024", 'date')).toBe('2024-01-01');
    });

    it('should normalize Spanish date formats', () => {
      expect(normalizeValue('8 de abril de 2021', 'date')).toBe('2021-04-08');
      expect(normalizeValue('25 de diciembre de 2023', 'date')).toBe('2023-12-25');
    });

    it('should handle ISO dates', () => {
      expect(normalizeValue('2021-04-08', 'date')).toBe('2021-04-08');
      expect(normalizeValue('2023-12-25', 'date')).toBe('2023-12-25');
    });

    it('should return original for invalid dates', () => {
      expect(normalizeValue('invalid date', 'date')).toBe('invalid date');
      expect(normalizeValue('32 de abril de 2021', 'date')).toBe('32 de abril de 2021');
    });
  });

  describe('string and other types', () => {
    it('should return original value for string type', () => {
      expect(normalizeValue('Test String', 'string')).toBe('Test String');
      expect(normalizeValue('123', 'string')).toBe('123');
    });

    it('should return original value for id type', () => {
      expect(normalizeValue('ID-123456', 'id')).toBe('ID-123456');
    });

    it('should return original value for address type', () => {
      const address = 'Carrer Major, 123, Barcelona';
      expect(normalizeValue(address, 'address')).toBe(address);
    });
  });
});

describe('parseAIAnalysis', () => {
  const mockAnalysisResponse = {
    sections: [
      {
        id: 'intro',
        title: 'Introducció',
        markdown: 'Contingut de la introducció'
      },
      {
        id: 'details',
        title: 'Detalls',
        markdown: 'Contingut dels detalls'
      }
    ],
    tables: [
      {
        id: 'costs',
        title: 'Taula de costos',
        headers: ['Concepte', 'Import'],
        rows: [
          ['Taxa', '50,00 €'],
          ['Impost', '25,00 €']
        ]
      }
    ],
    tags: [
      {
        name: 'nom_client',
        example: 'Joan García',
        type: 'string',
        confidence: 0.95,
        page: 1,
        anchor: 'Client:'
      },
      {
        name: 'import_total',
        example: '75,00 €',
        type: 'currency',
        confidence: 0.99,
        page: 1
      },
      {
        name: 'data_document',
        example: "15 d'abril de 2023",
        type: 'date',
        confidence: 0.90,
        page: 1
      }
    ],
    signatura: {
      nom: 'Maria López',
      carrec: 'Responsable',
      data_lloc: 'Barcelona, 15 de abril de 2023'
    }
  };

  it('should parse complete analysis response', () => {
    const result = parseAIAnalysis(mockAnalysisResponse);

    expect(result.sections).toHaveLength(2);
    expect(result.tables).toHaveLength(1);
    expect(result.tags).toHaveLength(3);
    expect(result.signatura).toBeDefined();
  });

  it('should generate slugs for tags', () => {
    const result = parseAIAnalysis(mockAnalysisResponse);

    expect(result.tags[0].slug).toBe('nom_client');
    expect(result.tags[1].slug).toBe('import_total');
    expect(result.tags[2].slug).toBe('data_document');
  });

  it('should normalize tag values', () => {
    const result = parseAIAnalysis(mockAnalysisResponse);

    expect(result.tags[0].normalized).toBe('Joan García'); // string - no change
    expect(result.tags[1].normalized).toBe(75.00); // currency normalized
    expect(result.tags[2].normalized).toBe('2023-04-15'); // date normalized
  });

  it('should handle missing sections gracefully', () => {
    const partialResponse = {
      ...mockAnalysisResponse,
      sections: undefined
    };

    const result = parseAIAnalysis(partialResponse);
    expect(result.sections).toEqual([]);
  });

  it('should handle missing tables gracefully', () => {
    const partialResponse = {
      ...mockAnalysisResponse,
      tables: undefined
    };

    const result = parseAIAnalysis(partialResponse);
    expect(result.tables).toEqual([]);
  });

  it('should handle missing tags gracefully', () => {
    const partialResponse = {
      ...mockAnalysisResponse,
      tags: undefined
    };

    const result = parseAIAnalysis(partialResponse);
    expect(result.tags).toEqual([]);
  });

  it('should validate tag structure', () => {
    const result = parseAIAnalysis(mockAnalysisResponse);
    
    result.tags.forEach(tag => {
      expect(tag).toHaveProperty('name');
      expect(tag).toHaveProperty('slug');
      expect(tag).toHaveProperty('example');
      expect(tag).toHaveProperty('type');
      expect(tag).toHaveProperty('confidence');
      expect(tag).toHaveProperty('normalized');
      
      expect(typeof tag.name).toBe('string');
      expect(typeof tag.slug).toBe('string');
      expect(typeof tag.example).toBe('string');
      expect(['string', 'date', 'currency', 'percent', 'number', 'id', 'address']).toContain(tag.type);
      expect(tag.confidence).toBeGreaterThanOrEqual(0);
      expect(tag.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('should preserve table structure', () => {
    const result = parseAIAnalysis(mockAnalysisResponse);
    
    expect(result.tables[0].id).toBe('costs');
    expect(result.tables[0].title).toBe('Taula de costos');
    expect(result.tables[0].headers).toEqual(['Concepte', 'Import']);
    expect(result.tables[0].rows).toHaveLength(2);
    expect(result.tables[0].rows[0]).toEqual(['Taxa', '50,00 €']);
  });

  it('should preserve signature structure', () => {
    const result = parseAIAnalysis(mockAnalysisResponse);
    
    expect(result.signatura?.nom).toBe('Maria López');
    expect(result.signatura?.carrec).toBe('Responsable');
    expect(result.signatura?.data_lloc).toBe('Barcelona, 15 de abril de 2023');
  });
});