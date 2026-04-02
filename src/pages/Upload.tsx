import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';

export default function Upload() {
  const navigate = useNavigate();
  const addBill = useStore((state) => state.addBill);
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);
  
  const [formData, setFormData] = useState({
    biller: '',
    amount: '',
    dueDate: '',
    category: 'Utilities',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const simulateExtraction = (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsExtracting(true);
    
    // Simulate API call for OCR/Data extraction
    setTimeout(() => {
      setIsExtracting(false);
      setExtractionComplete(true);
      // Mock extracted data
      setFormData({
        biller: 'Comcast Internet',
        amount: '89.99',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'Utilities',
      });
      toast.success('Document processed successfully');
    }, 2500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateExtraction(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      simulateExtraction(e.target.files[0]);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.biller || !formData.amount || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    addBill({
      biller: formData.biller,
      amount: parseFloat(formData.amount),
      category: formData.category,
      dueDate: formData.dueDate,
      frequency: 'Monthly',
      status: 'upcoming',
      autoPay: false,
    });

    toast.success('Bill added from document');
    navigate('/bills');
  };

  const resetUpload = () => {
    setFile(null);
    setExtractionComplete(false);
    setFormData({ biller: '', amount: '', dueDate: '', category: 'Utilities' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Upload Document</h1>
          <p className="text-sm text-zinc-400 mt-1">Upload a bill or receipt to automatically extract details.</p>
        </div>
        <div className="flex items-center text-sm text-zinc-400 bg-[#141414] px-3 py-1.5 rounded-full border border-[#262626]">
          <Lock className="w-4 h-4 mr-1.5 text-zinc-500" />
          End-to-end encrypted
        </div>
      </div>

      {!file && !isExtracting && (
        <div 
          className={`mt-6 border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive ? 'border-indigo-500 bg-[#1C1C1C]' : 'border-[#262626] hover:border-[#3f3f46] bg-[#141414]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-[#1C1C1C] border border-[#262626] rounded-full flex items-center justify-center mx-auto mb-4">
            <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-indigo-500' : 'text-zinc-500'}`} />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#FAFAFA] mb-1">Click to upload or drag and drop</h3>
          <p className="text-sm text-zinc-400 mb-6">PDF, PNG, JPG or HEIC (max. 10MB)</p>
          
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={handleChange}
          />
          <button 
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
          >
            Select File
          </button>
        </div>
      )}

      {isExtracting && (
        <div className="bg-[#141414] rounded-lg border border-[#262626] p-12 text-center">
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-[#1C1C1C] rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
            <FileText className="absolute inset-0 m-auto w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#FAFAFA] mb-1">Extracting data...</h3>
          <p className="text-sm text-zinc-400">Our AI is reading your document to save you time.</p>
          
          <div className="max-w-md mx-auto mt-8 space-y-3">
            <div className="h-2 bg-[#1C1C1C] rounded overflow-hidden">
              <div className="h-full bg-indigo-500 w-2/3 animate-pulse rounded"></div>
            </div>
            <div className="h-2 bg-[#1C1C1C] rounded overflow-hidden">
              <div className="h-full bg-indigo-500 w-1/2 animate-pulse rounded delay-75"></div>
            </div>
            <div className="h-2 bg-[#1C1C1C] rounded overflow-hidden">
              <div className="h-full bg-indigo-500 w-5/6 animate-pulse rounded delay-150"></div>
            </div>
          </div>
        </div>
      )}

      {extractionComplete && file && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Preview */}
          <div className="bg-[#141414] rounded-lg border border-[#262626] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1C1C1C] rounded flex items-center justify-center border border-[#262626]">
                  <FileText className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#FAFAFA] truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={resetUpload} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-[#1C1C1C] rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-[#0A0A0A] border border-[#262626] rounded flex items-center justify-center min-h-[300px]">
              <p className="text-sm text-zinc-500">Document Preview</p>
            </div>
          </div>

          {/* Extracted Data Form */}
          <div className="bg-[#141414] rounded-lg border border-[#262626]">
            <div className="px-6 py-5 border-b border-[#262626] flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#22C55E]" />
              <h3 className="text-base font-semibold tracking-tight text-[#FAFAFA]">Review Extracted Details</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="biller" className="block text-sm font-semibold text-zinc-300">Biller Name</label>
                  <input type="text" id="biller" value={formData.biller} onChange={handleFormChange} required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-semibold text-zinc-300">Amount</label>
                    <div className="mt-1 relative rounded-md">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-zinc-500 sm:text-sm">$</span>
                      </div>
                      <input type="number" step="0.01" id="amount" value={formData.amount} onChange={handleFormChange} required className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md py-2 border transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-semibold text-zinc-300">Due Date</label>
                    <input type="date" id="dueDate" value={formData.dueDate} onChange={handleFormChange} required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors" />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-zinc-300">Category</label>
                  <select id="category" value={formData.category} onChange={handleFormChange} required className="mt-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-[#262626] bg-[#0A0A0A] text-zinc-200 rounded-md px-3 py-2 border transition-colors">
                    <option value="Utilities">Utilities</option>
                    <option value="Housing">Housing</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-md p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                <p className="text-sm text-indigo-200">Please verify the extracted information against your document before saving.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={resetUpload} className="px-4 py-2 bg-transparent border border-[#262626] rounded-md text-sm font-medium text-zinc-300 hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                  Discard
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
