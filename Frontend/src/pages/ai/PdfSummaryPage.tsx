import React, { useState, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { aiApi } from '../../services/aiApi';
import toast from 'react-hot-toast';

export const PdfSummaryPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      // Check if file is a PDF
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a PDF file');
        setSelectedFile(null);
        return;
      }
      
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');

    try {
      const response = await aiApi.summarizePdf(selectedFile);
      setSummary(response.summary);
      toast.success('PDF processed successfully!');
    } catch (err: any) {
      console.error('Failed to process PDF:', err);
      setError(err.response?.data?.message || err.message || 'Failed to process PDF');
      toast.error('Failed to process PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSummary('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AI PDF Summary</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a PDF document and get an AI-generated summary instantly.
        </p>
      </div>

      <Card className="flex flex-col gap-6">
        <form onSubmit={handleSummarize} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select PDF File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={loading}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-slate-600">
                Selected file: <span className="font-medium">{selectedFile.name}</span> 
                {' '}({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Upload a PDF file (maximum 10MB). The file will be processed to generate a summary.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !selectedFile}>
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span className="ml-2">Processing...</span>
                </>
              ) : (
                'Generate Summary'
              )}
            </Button>
            <Button type="button" variant="secondary" onClick={handleReset} disabled={loading}>
              Reset
            </Button>
          </div>
        </form>

        {summary && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
            </div>
            <Card className="bg-slate-50 p-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</p>
            </Card>
          </div>
        )}
      </Card>

      <Card className="bg-blue-50 border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">How to use</h3>
        <ul className="text-xs text-blue-700 list-disc pl-5 space-y-1">
          <li>Click "Choose File" to select a PDF document from your device</li>
          <li>Click "Generate Summary" to process the PDF file</li>
          <li>The AI-generated summary will appear below in a few seconds</li>
          <li>Use "Reset" to clear the current selection and start over</li>
        </ul>
      </Card>
    </div>
  );
};