// app/api/upload/excel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: 'Invalid file type. Only .xlsx and .xls files are allowed' }, { status: 400 })
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    
    if (!sheetName) {
      return NextResponse.json({ error: 'No sheets found in Excel file' }, { status: 400 })
    }

    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return NextResponse.json({ error: 'No data found in Excel file' }, { status: 400 })
    }

    // Extract headers and sample data
    const headers = jsonData[0] as string[]
    const sampleRows = jsonData.slice(1, 4) // Take first 3 data rows as samples

    // Generate column metadata
    const columns = headers.map((header, index) => {
      const columnLetter = XLSX.utils.encode_col(index)
      const sampleData = sampleRows
        .map(row => (row as any[])[index])
        .filter(value => value !== undefined && value !== null && value !== '')

      // Determine data type based on sample data
      let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string'
      
      if (sampleData.length > 0) {
        const firstSample = sampleData[0]
        
        if (typeof firstSample === 'number') {
          dataType = 'number'
        } else if (typeof firstSample === 'boolean') {
          dataType = 'boolean'
        } else if (firstSample instanceof Date || 
                  (typeof firstSample === 'string' && !isNaN(Date.parse(firstSample)))) {
          dataType = 'date'
        }
      }

      return {
        column: columnLetter,
        header: header || `Column ${columnLetter}`,
        sample_data: sampleData,
        data_type: dataType
      }
    })

    return NextResponse.json({
      success: true,
      filename: file.name,
      sheet_name: sheetName,
      total_rows: jsonData.length - 1, // Exclude header row
      columns: columns
    })

  } catch (error) {
    console.error('Excel processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process Excel file' },
      { status: 500 }
    )
  }
}