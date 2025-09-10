import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { readFirstSheetAsJsonFromBuffer } from '@/lib/xlsx';
import { validateExcelFile, EXCEL_SCHEMAS } from '@/lib/excel-validation';
import { ArtifactGenerator } from '@/lib/analytics/artifact-generator';
import { getProcessedMacros } from '@/server/datasource/macros-adapter';
import { BlobStorage } from '@/lib/blob-storage';

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

    // Check validation results and provide detailed feedback
    const invalidFiles = validationResults.filter(r => !r.validation.isValid);
    const validFiles = validationResults.filter(r => r.validation.isValid && r.validation.detectedType !== 'ignored');
    
    // If no valid files at all, reject the upload
    if (validFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid files found for upload',
        validationResults: validationResults.map(r => ({
          filename: r.filename,
          isValid: r.validation.isValid,
          errors: r.validation.errors,
          warnings: r.validation.warnings,
          detectedType: r.validation.detectedType
        }))
      }, { status: 400 });
    }
    
    // If there are invalid files, provide warning but continue with valid files
    const hasInvalidFiles = invalidFiles.length > 0;
    if (hasInvalidFiles) {
      console.warn(`Upload proceeding with ${validFiles.length} valid files, ${invalidFiles.length} files will be skipped due to validation errors`);
    }

    // Use Vercel Blob storage for file persistence (required for Vercel)
    const blobStorage = BlobStorage.getInstance();
    console.log('[UPLOAD] Using Vercel Blob storage for file persistence');
    console.log('VERCEL env:', process.env.VERCEL);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Clear existing files from blob storage
    try {
      await blobStorage.clearAllFiles();
      console.log('[UPLOAD] Cleared existing files from blob storage');
    } catch (error) {
      console.warn('[UPLOAD] Could not clear existing files from blob storage:', error);
    }

    // Store new files in blob storage
    const filesToStore = fileContents.map(fileData => ({
      filename: fileData.filename,
      originalName: fileData.filename,
      buffer: fileData.buffer,
      detectedType: fileData.detectedType!
    }));
    
    const storedFiles = await blobStorage.storeFiles(filesToStore);
    
    const savedFiles = storedFiles.map(storedFile => {
      const schema = EXCEL_SCHEMAS[storedFile.detectedType];
      return {
        originalName: storedFile.originalName,
        savedName: storedFile.filename,
        type: storedFile.detectedType,
        description: schema.description,
        url: storedFile.url
      };
    });
    
    console.log('[UPLOAD] Successfully stored', savedFiles.length, 'files in Vercel Blob');

    // Generate dashboard artifacts after successful upload
    let artifactsGenerated = false;
    try {
      console.log('[UPLOAD] Starting artifact generation...');
      const macros = await getProcessedMacros();
      if (macros) {
        console.log('[UPLOAD] Macros found, generating artifacts...');
        const generator = new ArtifactGenerator();
        await generator.generateDashboardArtifacts(macros);
        artifactsGenerated = true;
        console.log('[UPLOAD] Dashboard artifacts generated successfully');
      } else {
        console.log('[UPLOAD] No macros found, skipping artifact generation');
      }
    } catch (error) {
      console.error('[UPLOAD] Error generating artifacts:', error);
      // Don't fail the upload if artifact generation fails
    }

    // Prepare response with detailed validation results
    const responseValidationResults = validationResults.map(r => ({
      filename: r.filename,
      isValid: r.validation.isValid,
      errors: r.validation.errors,
      warnings: r.validation.warnings,
      detectedType: r.validation.detectedType
    }));

    const skippedFiles = invalidFiles.map(f => ({
      filename: f.filename,
      errors: f.validation.errors,
      detectedType: f.validation.detectedType
    }));

    let message = `Successfully uploaded ${savedFiles.length} Excel files${artifactsGenerated ? ' and generated analytics' : ''}`;
    if (hasInvalidFiles) {
      message += `. ${invalidFiles.length} files were skipped due to validation errors.`;
    }

    return NextResponse.json({
      success: true,
      message,
      savedFiles,
      artifactsGenerated,
      skippedFiles: hasInvalidFiles ? skippedFiles : [],
      validationResults: responseValidationResults
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
