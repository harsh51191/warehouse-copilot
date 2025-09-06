'use client'

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload/replace-excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        setUploadResult(result.validationResults);
        setSelectedFiles([]);
        setIsOpen(false);
        onUploadComplete?.();
      } else {
        setUploadResult(result.validationResults || []);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult([{
        filename: 'Upload Error',
        isValid: false,
        errors: ['Failed to upload files'],
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
