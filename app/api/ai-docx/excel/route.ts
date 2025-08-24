// app/api/ai-docx/excel/route.ts  
// AI-First Excel Analysis and Column Intelligence
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ColumnAnalysis {
  column: string;
  header: string;
  dataType: 'string' | 'number' | 'date' | 'email' | 'phone' | 'address' | 'boolean';
  sampleData: any[];
  confidence: number;
  aiDescription: string;
}

interface ExcelIntelligence {
  success: boolean;
  fileName: string;
  sheetName: string;
  totalRows: number;
  totalColumns: number;
  columns: ColumnAnalysis[];
  processingTime: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const file = formData.get('excel') as File;

    if (!file) {
      return NextResponse.json({ error: 'No Excel file provided' }, { status: 400 });
    }

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json({ error: 'File must be Excel (.xlsx, .xls) or CSV' }, { status: 400 });
    }

    // Parse Excel file
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      return NextResponse.json({ error: 'No sheets found in Excel file' }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return NextResponse.json({ error: 'No data found in Excel file' }, { status: 400 });
    }

    // Extract headers and sample data
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1, 6); // First 5 rows for AI analysis

    // Prepare data for GPT-5 analysis
    const sampleDataForAI = {
      headers,
      sampleRows: dataRows,
      totalRows: jsonData.length - 1
    };

    // GPT-5 Column Intelligence Analysis  
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini", // GPT-5 Mini for cost efficiency on simple tasks
      messages: [
        {
          role: "system", 
          content: `You are an AI data analysis expert. Analyze Excel column data and determine:
1. Data type of each column (string, number, date, email, phone, address, boolean)
2. Confidence score (0-100) for the data type detection
3. Brief description of what each column contains
4. Potential mapping suggestions for document placeholders

Return JSON with columns array containing: column, dataType, confidence, description.`
        },
        {
          role: "user",
          content: `Analyze this Excel data structure:
${JSON.stringify(sampleDataForAI, null, 2)}

For each column, determine the data type and provide intelligent insights about its content.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    // Process columns with AI insights
    const columns: ColumnAnalysis[] = headers.map((header, index) => {
      const columnLetter = XLSX.utils.encode_col(index);
      const sampleData = dataRows
        .map(row => (row as any[])[index])
        .filter(value => value !== undefined && value !== null && value !== '');

      // Get AI analysis for this column
      const aiColumn = (aiResponse.columns || []).find((c: any) => 
        c.column === columnLetter || c.header === header || c.index === index
      );

      return {
        column: columnLetter,
        header: header || `Column ${columnLetter}`,
        dataType: aiColumn?.dataType || 'string',
        sampleData: sampleData.slice(0, 3), // Top 3 samples
        confidence: Math.min(Math.max(aiColumn?.confidence || 75, 0), 100),
        aiDescription: aiColumn?.description || 'Standard data column'
      };
    });

    const result: ExcelIntelligence = {
      success: true,
      fileName: file.name,
      sheetName,
      totalRows: jsonData.length - 1,
      totalColumns: headers.length,
      columns,
      processingTime: Date.now() - startTime
    };

    console.log(`[AI-EXCEL-ANALYZE] Success: ${columns.length} columns analyzed in ${result.processingTime}ms`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[AI-EXCEL-ANALYZE] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Excel AI analysis failed',
      details: error.message,
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
}