import { useState, useRef } from 'react';
import { uploadProof } from '../services/api';

interface UploadFormProps {
  token: string;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export const UploadForm = ({ token }: UploadFormProps) => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus('idle'); // Reset status when a new file is chosen
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setErrorMessage('');

    try {
      await uploadProof(token, selectedFile);
      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Upload failed. Please try again.');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (status === 'success') {
    return (
      <div>
        <h2>Upload Successful!</h2>
        <p>Thank you. Your proof of delivery has been submitted.</p>
      </div>
    );
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      {selectedFile && (
        <div>
          <p>Selected file: {selectedFile.name}</p>
          <img src={URL.createObjectURL(selectedFile)} alt="Preview" width="200" />
        </div>
      )}

      {status === 'idle' && !selectedFile && (
         <button onClick={triggerFileInput}>Take Photo / Select File</button>
      )}
      
      {selectedFile && (
        <button onClick={handleUpload} disabled={status === 'uploading'}>
          {status === 'uploading' ? 'Uploading...' : 'Upload Proof'}
        </button>
      )}

      {status === 'error' && (
        <div>
          <p style={{ color: 'red' }}>{errorMessage}</p>
          <button onClick={handleUpload}>Retry Upload</button>
        </div>
      )}
    </div>
  );
};
