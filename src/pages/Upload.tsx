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
          <h1 className="text-2xl font-semibold text-gray-900">Upload Document</h1>
          <p className="text-sm text-gray-500 mt-1">Upload a bill or receipt to automatically extract details.</p>
        </div>
        <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
          <Lock className="w-4 h-4 mr-1.5 text-gray-400" />
          End-to-end encrypted
        </div>
      </div>

      {!file && !isExtracting && (
        <div 
          className={`mt-6 border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive ? 'border-[#28a745] bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-white'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-[#28a745]' : 'text-gray-400'}`} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Click to upload or drag and drop</h3>
          <p className="text-sm text-gray-500 mb-6">PDF, PNG, JPG or HEIC (max. 10MB)</p>
          
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={handleChange}
          />
          <button 
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]"
          >
            Select File
          </button>
        </div>
      )}

      {isExtracting && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#28a745] rounded-full border-t-transparent animate-spin"></div>
            <FileText className="absolute inset-0 m-auto w-6 h-6 text-[#28a745]" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Extracting data...</h3>
          <p className="text-sm text-gray-500">Our AI is reading your document to save you time.</p>
          
          <div className="max-w-md mx-auto mt-8 space-y-3">
            <div className="h-2 bg-gray-100 rounded overflow-hidden">
              <div className="h-full bg-[#28a745] w-2/3 animate-pulse rounded"></div>
            </div>
            <div className="h-2 bg-gray-100 rounded overflow-hidden">
              <div className="h-full bg-[#28a745] w-1/2 animate-pulse rounded delay-75"></div>
            </div>
            <div className="h-2 bg-gray-100 rounded overflow-hidden">
              <div className="h-full bg-[#28a745] w-5/6 animate-pulse rounded delay-150"></div>
            </div>
          </div>
        </div>
      )}

      {extractionComplete && file && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Preview */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded shadow-sm flex items-center justify-center border border-gray-200">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={resetUpload} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded flex items-center justify-center min-h-[300px]">
              <p className="text-sm text-gray-400">Document Preview</p>
            </div>
          </div>

          {/* Extracted Data Form */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#28a745]" />
              <h3 className="text-base font-medium text-gray-900">Review Extracted Details</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="biller" className="block text-sm font-medium text-gray-700">Biller Name</label>
                  <input type="text" id="biller" value={formData.biller} onChange={handleFormChange} required className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input type="number" step="0.01" id="amount" value={formData.amount} onChange={handleFormChange} required className="focus:ring-[#28a745] focus:border-[#28a745] block w-full pl-7 sm:text-sm border-gray-300 rounded-md py-2 border transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input type="date" id="dueDate" value={formData.dueDate} onChange={handleFormChange} required className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors" />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                  <select id="category" value={formData.category} onChange={handleFormChange} required className="mt-1 shadow-sm focus:ring-[#28a745] focus:border-[#28a745] block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border bg-white transition-colors">
                    <option value="Utilities">Utilities</option>
                    <option value="Housing">Housing</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">Please verify the extracted information against your document before saving.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={resetUpload} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
                  Discard
                </button>
                <button type="submit" className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
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
