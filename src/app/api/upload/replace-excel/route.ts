import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { readFirstSheetAsJsonFromBuffer } from '@/lib/xlsx';
import { validateExcelFile, EXCEL_SCHEMAS } from '@/lib/excel-validation';
import { ArtifactGenerator } from '@/lib/analytics/artifact-generator';
import { getProcessedMacros } from '@/server/datasource/macros-adapter';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No files provided' 
      }, { status: 400 });
    }

    // Validate all files first
    const validationResults = [];
    const fileContents = [];
    
    for (const file of files) {
      try {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
          throw new Error('File must be an Excel file (.xlsx)');
        }

        // Read file content
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Validate file size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error('File size too large (max 10MB)');
        }
        
        // Parse Excel content
        const content = readFirstSheetAsJsonFromBuffer(buffer);
        
        // Validate file
        const validation = validateExcelFile(file, content);
        validationResults.push({
          filename: file.name,
          validation,
          content
        });
        
        if (validation.isValid) {
          // Only process non-ignored files
          if (validation.detectedType !== 'ignored') {
            fileContents.push({
              filename: file.name,
              content,
              buffer,
              detectedType: validation.detectedType
            });
          }
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        validationResults.push({
          filename: file.name,
          validation: {
            isValid: false,
            errors: [`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`],
            warnings: [],
            detectedType: null
          },
          content: null
        });
      }
    }

    // Check if all files are valid
    const invalidFiles = validationResults.filter(r => !r.validation.isValid);
    if (invalidFiles.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'File validation failed',
        validationResults: validationResults.map(r => ({
          filename: r.filename,
          isValid: r.validation.isValid,
          errors: r.validation.errors,
          warnings: r.validation.warnings,
          detectedType: r.validation.detectedType
        }))
      }, { status: 400 });
    }

    // Get data directory - use /tmp for Vercel compatibility
    const dataDir = process.env.VERCEL === '1' 
      ? '/tmp/data' 
      : (process.env.DATA_DIR || join(process.cwd(), 'data'));
    console.log('Data directory:', dataDir);
    console.log('VERCEL env:', process.env.VERCEL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Ensure directory exists
    try {
      await import('fs').then(fs => fs.promises.mkdir(dataDir, { recursive: true }));
    } catch (error) {
      console.warn('Could not create data directory:', error);
    }
    
    // Clear existing Excel files
    try {
      const existingFiles = await readdir(dataDir);
      const excelFiles = existingFiles.filter(f => f.endsWith('.xlsx'));
      console.log('Found existing Excel files:', excelFiles);
      
      for (const file of excelFiles) {
        const filePath = join(dataDir, file);
        console.log('Deleting file:', filePath);
        await unlink(filePath);
      }
    } catch (error) {
      console.warn('Could not clear existing files:', error);
      // Continue anyway - this is not critical
    }

    // Save new files
    const savedFiles = [];
    for (const fileData of fileContents) {
      const schema = EXCEL_SCHEMAS[fileData.detectedType!];
      const newFilename = `${schema.filename}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      const filePath = join(dataDir, newFilename);
      
      await writeFile(filePath, fileData.buffer);
      savedFiles.push({
        originalName: fileData.filename,
        savedName: newFilename,
        type: fileData.detectedType,
        description: schema.description
      });
    }

    // Generate dashboard artifacts after successful upload
    let artifactsGenerated = false;
    try {
      const macros = await getProcessedMacros();
      if (macros) {
        const generator = new ArtifactGenerator();
        await generator.generateDashboardArtifacts(macros);
        artifactsGenerated = true;
        console.log('Dashboard artifacts generated successfully');
      } else {
        console.log('No macros found, skipping artifact generation');
      }
    } catch (error) {
      console.error('Error generating artifacts:', error);
      // Don't fail the upload if artifact generation fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully replaced ${savedFiles.length} Excel files${artifactsGenerated ? ' and generated analytics' : ''}`,
      savedFiles,
      artifactsGenerated,
      validationResults: validationResults.map(r => ({
        filename: r.filename,
        isValid: r.validation.isValid,
        errors: r.validation.errors,
        warnings: r.validation.warnings,
        detectedType: r.validation.detectedType
      }))
    });

  } catch (error) {
    console.error('Error replacing Excel files:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      success: false, 
      error: `Failed to replace Excel files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
