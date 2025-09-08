'use client'

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';

interface UploadResult {
  filename: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedType: string | null;
}

interface ExcelUploadProps {
  onUploadComplete?: () => void;
}

export default function ExcelUpload({ onUploadComplete }: ExcelUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Define expected files for complete analytics
  const expectedFiles = [
    { key: 'wave_macros', name: 'wave_macros (Wave parameters)', category: 'core' },
    { key: 'line_completion_2', name: 'line_completion_2 (SBL completion)', category: 'core' },
    { key: 'sbl_productivity', name: 'sbl_productivity (SBL trends)', category: 'core' },
    { key: 'ptl_productivity', name: 'ptl_productivity (PTL trends)', category: 'core' },
    { key: 'updated_loading_dashboard_query', name: 'updated_loading_dashboard_query (Trip data)', category: 'enhanced' },
    { key: 'secondary_sortation', name: 'secondary_sortation (QC data)', category: 'enhanced' },
    { key: 'ptl_table_lines', name: 'ptl_table_lines (Station data)', category: 'enhanced' },
    { key: 'sbl_table_lines', name: 'sbl_table_lines (Station data)', category: 'enhanced' }
  ];

  // Check which files are present
  const getFileCoverage = () => {
    if (!uploadResult) return { present: [], missing: [], total: expectedFiles.length };
    
    const presentFiles = uploadResult
      .filter(result => result.isValid && result.detectedType !== 'ignored')
      .map(result => result.detectedType);
    
    const present = expectedFiles.filter(file => presentFiles.includes(file.key));
    const missing = expectedFiles.filter(file => !presentFiles.includes(file.key));
    
    return { present, missing, total: expectedFiles.length };
  };
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Handle escape key for modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    setUploadResult(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadResult(null);
    setUploadProgress('Uploading files...');

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      setUploadProgress('Validating files...');
      console.log('Uploading files:', selectedFiles.map(f => f.name));
      
      const response = await fetch('/api/upload/replace-excel', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      setUploadProgress('Processing data...');
      const result = await response.json();
      console.log('Upload result:', result);
      
      if (result.success) {
        setUploadProgress('Generating analytics...');
        // Add a small delay to show the analytics generation step
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setUploadProgress('Complete! Refreshing dashboard...');
        setUploadResult(result.validationResults);
        setSelectedFiles([]);
        
        // Trigger data refresh
        if (onUploadComplete) {
          onUploadComplete();
        }
        
        // Show success message briefly before closing
        setTimeout(() => {
          setUploadProgress('Upload successful! Dashboard refreshed.');
          setTimeout(() => {
            setIsOpen(false);
          }, 1000);
        }, 1500);
      } else {
        setUploadProgress('Upload failed');
        setUploadResult(result.validationResults || []);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress('Upload failed');
      setUploadResult([{
        filename: 'Upload Error',
        isValid: false,
        errors: [`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        detectedType: null
      }]);
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openModal = () => {
    console.log('Opening modal...');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedFiles([]);
    setUploadResult(null);
  };

  return (
    <>
      {/* Upload Button */}
      <button
        onClick={openModal}
        className="flex items-center gap-2 text-xs px-2 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
      >
        <Upload size={14} />
        Upload Excel
      </button>

      {/* Modal */}
      {isOpen && isMounted && (
        <>
          {createPortal(
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) closeModal();
              }}
            >
              <div 
                className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
                style={{ 
                  position: 'relative',
                  zIndex: 10000,
                  margin: 'auto'
                }}
              >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upload Excel Files</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* File Selection */}
            <div className="mb-6">
              <div
                onClick={openFileDialog}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors min-h-[120px] flex flex-col items-center justify-center"
              >
                <Upload size={40} className="text-gray-400 mb-3" />
                <p className="text-base font-medium text-gray-700 mb-1">
                  Click to select Excel files
                </p>
                <p className="text-sm text-gray-500">
                  Select all required Excel files at once
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-medium mb-3">Selected Files ({selectedFiles.length})</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">{uploadProgress}</p>
                      <p className="text-xs text-blue-600">Please wait while we process your data...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Results */}
            {uploadResult && (
              <div className="mb-6">
                <h3 className="text-base font-medium mb-3">Upload Results</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                  {uploadResult.map((result, index) => (
                    <div key={index} className="p-3 rounded border bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        {result.isValid ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <AlertCircle size={14} className="text-red-500" />
                        )}
                        <span className="text-sm font-medium truncate">{result.filename}</span>
                        {result.detectedType && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex-shrink-0">
                            {result.detectedType}
                          </span>
                        )}
                      </div>
                      
                      {result.errors.length > 0 && (
                        <div className="text-xs text-red-600">
                          <strong>Errors:</strong>
                          <ul className="list-disc list-inside ml-2">
                            {result.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.warnings.length > 0 && (
                        <div className="text-xs text-yellow-600">
                          <strong>Warnings:</strong>
                          <ul className="list-disc list-inside ml-2">
                            {result.warnings.map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Key Input */}
            <div className="mb-6">
              <h3 className="text-base font-medium mb-3">API Configuration</h3>
              {!showApiKeyInput ? (
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="w-full px-4 py-2 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 border border-blue-200"
                >
                  Set Gemini API Key (Required for Copilot)
                </button>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-blue-800">Gemini API Key</span>
                    <button 
                      onClick={() => setShowApiKeyInput(false)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API Key"
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <button
                    onClick={() => {
                      if (apiKey) {
                        localStorage.setItem('gemini_api_key', apiKey);
                        setShowApiKeyInput(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Save API Key
                  </button>
                </div>
              )}
            </div>

            {/* Missing Files Indicator */}
            {uploadResult && (
              <div className="mb-6">
                <h3 className="text-base font-medium mb-3">Data Coverage</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 mb-2">Expected Files for Complete Analytics:</p>
                      {(() => {
                        const coverage = getFileCoverage();
                        const coreFiles = expectedFiles.filter(f => f.category === 'core');
                        const enhancedFiles = expectedFiles.filter(f => f.category === 'enhanced');
                        
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="font-medium text-amber-700 mb-1">Core Files:</p>
                                <ul className="space-y-1 text-amber-600">
                                  {coreFiles.map(file => {
                                    const isPresent = coverage.present.some(p => p.key === file.key);
                                    return (
                                      <li key={file.key} className="flex items-center gap-2">
                                        <span className={isPresent ? "text-green-600" : "text-red-500"}>
                                          {isPresent ? "✓" : "✗"}
                                        </span>
                                        <span>{file.name}{!isPresent ? " - Missing" : ""}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                              <div>
                                <p className="font-medium text-amber-700 mb-1">Enhanced Analytics:</p>
                                <ul className="space-y-1 text-amber-600">
                                  {enhancedFiles.map(file => {
                                    const isPresent = coverage.present.some(p => p.key === file.key);
                                    return (
                                      <li key={file.key} className="flex items-center gap-2">
                                        <span className={isPresent ? "text-green-600" : "text-red-500"}>
                                          {isPresent ? "✓" : "✗"}
                                        </span>
                                        <span>{file.name}{!isPresent ? " - Missing" : ""}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                            <p className="text-amber-600 mt-2">
                              <strong>Status:</strong> {coverage.present.length}/{coverage.total} files uploaded. 
                              {coverage.missing.length > 0 && (
                                <> Upload {coverage.missing.map(f => f.name.split(' ')[0]).join(', ')} for complete analytics!</>
                              )}
                              {coverage.missing.length === 0 && " All files uploaded! Analytics complete."}
                            </p>
                          </>
                        );
                      })()}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            // Continue with current files
                            if (onUploadComplete) {
                              onUploadComplete();
                            }
                            setIsOpen(false);
                          }}
                          className="px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"
                        >
                          Continue with Current Files
                        </button>
                        <button
                          onClick={() => {
                            // Reset to allow more file selection
                            setUploadResult(null);
                            setSelectedFiles([]);
                          }}
                          className="px-4 py-2 bg-amber-100 text-amber-800 text-sm rounded-md hover:bg-amber-200 border border-amber-300"
                        >
                          Upload More Files
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Upload & Replace Files
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
          )}
        </>
      )}
    </>
  );
}
