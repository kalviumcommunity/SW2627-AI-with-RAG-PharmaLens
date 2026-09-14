import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadDocument } from '../services/api';

interface DocumentUploadProps {
  onUploadSuccess?: (documentId: string, filename: string) => void;
}

export const DocumentUpload = ({ onUploadSuccess }: DocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate type and size (10MB limit)
    if (!['application/pdf', 'text/plain'].includes(selectedFile.type)) {
      setUploadStatus('error');
      setErrorMessage('Invalid file type. Only PDF and TXT are allowed.');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadStatus('error');
      setErrorMessage('File exceeds 10MB limit.');
      return;
    }

    setFile(selectedFile);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const result = await uploadDocument(file);
      setUploadStatus('success');
      setFile(null); // Clear file after successful upload
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      if (onUploadSuccess && result.documentId) {
        onUploadSuccess(result.documentId, result.file.originalName);
      }
    } catch (error: any) {
      setUploadStatus('error');
      setErrorMessage(error.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
      // Auto-hide success message after 3 seconds
      if (uploadStatus === 'success') {
         setTimeout(() => setUploadStatus('idle'), 3000);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    setUploadStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept=".pdf,.txt"
      />
      
      {!file ? (
        <button 
          onClick={triggerFileInput}
          className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      ) : (
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-700 max-w-[120px] truncate" title={file.name}>
              {file.name}
            </span>
            <button onClick={removeFile} className="text-slate-400 hover:text-red-500" disabled={isUploading}>
              <X className="w-3 h-3" />
            </button>
          </div>
          
          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Upload</span>}
          </button>
        </div>
      )}

      {/* Status Messages */}
      {uploadStatus === 'success' && (
        <div className="flex items-center space-x-1 text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-medium">Uploaded</span>
        </div>
      )}
      
      {uploadStatus === 'error' && (
        <div className="flex items-center space-x-1 text-red-600" title={errorMessage}>
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-medium max-w-[100px] truncate">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
