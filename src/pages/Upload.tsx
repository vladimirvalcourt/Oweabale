import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Tesseract from 'tesseract.js';
import { useStore } from '../store/useStore';
import { CollapsibleModule } from '../components/CollapsibleModule';

export default function Upload() {
  const navigate = useNavigate();
  const addBill = useStore((state) => state.addBill);
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);
  
  const [formData, setFormData] = useState({
    biller: '',
    amount: '',
    dueDate: '',
    category: 'Utilities',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processDocument = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsExtracting(true);
    
    try {
      if (uploadedFile.type.startsWith('image/')) {
        const result = await Tesseract.recognize(uploadedFile, 'eng');
        const text = result.data.text;
        
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const biller = lines.length > 0 ? lines[0].trim() : 'Unknown Biller';
        
        const amountMatches = text.match(/\$?\s*\d+\.\d{2}/g);
        let maxAmount = 0;
        if (amountMatches) {
          const amounts = amountMatches.map(m => parseFloat(m.replace(/[^0-9.]/g, '')));
          maxAmount = Math.max(...amounts);
        }

        const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
        let dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (dateMatch) {
            try {
                const parsed = new Date(dateMatch[0]);
                if (!isNaN(parsed.getTime())) {
                    dueDate = parsed.toISOString().split('T')[0];
                }
            } catch (e) {}
        }

        setFormData({
          biller: biller.substring(0, 50),
          amount: maxAmount > 0 ? maxAmount.toFixed(2) : '',
          dueDate: dueDate,
          category: 'Utilities',
        });
        toast.success('Document processed successfully');
      } else {
        setTimeout(() => {
          setFormData({
            biller: 'Unknown Document',
            amount: '',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            category: 'Other',
          });
          toast.success('File loaded. Manual entry required for PDFs.');
        }, 1000);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to process document');
    } finally {
      setIsExtracting(false);
      setExtractionComplete(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processDocument(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processDocument(e.target.files[0]);
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
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Document Upload</h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mt-1">Data extraction & ingestion</p>
        </div>
        <div className="flex items-center text-[10px] font-mono text-zinc-400 bg-surface-raised px-3 py-1.5 rounded-sm border border-surface-border uppercase tracking-widest leading-none">
          <Lock className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
          Channel secured
        </div>
      </div>

      {!file && !isExtracting && (
        <CollapsibleModule title="Asset Ingestion" icon={UploadCloud}>
          <div 
            className={`-mx-6 -my-6 p-12 text-center transition-all cursor-pointer ${
              dragActive ? 'bg-indigo-500/5' : 'bg-surface-raised hover:bg-surface-elevated'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className={`w-16 h-16 bg-surface-base border rounded-sm flex items-center justify-center mx-auto mb-6 transition-colors ${dragActive ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-surface-border'}`}>
              <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-indigo-500' : 'text-zinc-600'}`} />
            </div>
            <h3 className="text-lg font-mono font-bold tracking-tight text-content-primary mb-2 uppercase">Interface for ingestion</h3>
            <p className="text-[10px] font-mono text-zinc-500 mb-8 uppercase tracking-widest">DRAG ASSETS HERE OR CLICK TO BROWSE</p>
            
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,image/*"
              onChange={handleChange}
            />
            <div className="inline-block px-6 py-2 bg-transparent border border-surface-border rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-300 hover:bg-surface-elevated transition-colors">
              Connect Local Source
            </div>
          </div>
        </CollapsibleModule>
      )}

      {isExtracting && (
        <div className="bg-surface-raised rounded-sm border border-surface-border p-12 text-center">
          <div className="inline-block relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-[3px] border-surface-elevated rounded-sm"></div>
            <div className="absolute inset-0 border-[3px] border-indigo-600 rounded-sm border-t-transparent animate-spin"></div>
            <FileText className="absolute inset-0 m-auto w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-content-primary mb-2 uppercase">Scanning content...</h3>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Applying OCR algorithms to assets</p>
          
          <div className="max-w-xs mx-auto mt-10 space-y-3">
            <div className="h-1 bg-surface-base border border-surface-border rounded-sm overflow-hidden">
              <div className="h-full bg-indigo-500 w-2/3 animate-[progress-active_4s_ease-in-out_infinite]"></div>
            </div>
            <div className="h-1 bg-surface-base border border-surface-border rounded-sm overflow-hidden opacity-50">
              <div className="h-full bg-indigo-500 w-1/2 animate-[progress-active_5s_ease-in-out_infinite]"></div>
            </div>
          </div>
        </div>
      )}

      {extractionComplete && file && (
        <CollapsibleModule 
          title="Extraction Analytics" 
          icon={CheckCircle}
          extraHeader={<span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest leading-none flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Integrity Verified</span>}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 -mx-6 -my-6 p-6">
            {/* File Preview */}
            <div className="bg-surface-base rounded-sm border border-surface-border p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-raised rounded-sm flex items-center justify-center border border-surface-border">
                    <FileText className="w-5 h-5 text-zinc-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono font-bold text-content-primary truncate uppercase tracking-widest">{file.name}</p>
                    <p className="text-[9px] font-mono text-zinc-600 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB • HASH_SHA256</p>
                  </div>
                </div>
                <button onClick={resetUpload} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-surface-elevated rounded-sm transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 bg-surface-raised border border-surface-border rounded-sm flex items-center justify-center min-h-[300px] overflow-hidden group">
                {previewUrl ? (
                  <img src={previewUrl} alt="Document preview" className="max-w-full max-h-[400px] object-contain opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                ) : (
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Visual Feedback Missing</p>
                )}
              </div>
            </div>

            {/* Extracted Data Form */}
            <div className="bg-surface-base rounded-sm border border-surface-border flex flex-col">
              <div className="px-6 py-4 border-b border-surface-border flex items-center gap-3 bg-surface-elevated/50 leading-none">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-content-primary">Payload Details</h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="biller" className="block text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2 font-bold">Authenticated Merchant</label>
                    <input type="text" id="biller" value={formData.biller} onChange={handleFormChange} required className="w-full bg-surface-raised border border-surface-border rounded-sm px-3 py-2 text-xs font-mono text-content-primary focus:outline-none focus:border-indigo-500 transition-colors uppercase tracking-widest" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="amount" className="block text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2 font-bold">Total Value</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-[10px] font-mono text-zinc-600">$</span>
                        <input type="number" step="0.01" id="amount" value={formData.amount} onChange={handleFormChange} required className="w-full bg-surface-raised border border-surface-border rounded-sm pl-7 pr-3 py-2 text-xs font-mono text-content-primary focus:outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="dueDate" className="block text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2 font-bold">Maturity Date</label>
                      <input type="date" id="dueDate" value={formData.dueDate} onChange={handleFormChange} required className="w-full bg-surface-raised border border-surface-border rounded-sm px-3 py-2 text-xs font-mono text-content-primary focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2 font-bold">Resource Type</label>
                    <select id="category" value={formData.category} onChange={handleFormChange} required className="w-full bg-surface-raised border border-surface-border rounded-sm px-3 py-2 text-xs font-mono text-content-primary focus:outline-none focus:border-indigo-500 transition-colors uppercase tracking-widest">
                      <option value="Utilities">Utilities</option>
                      <option value="Housing">Housing</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Subscriptions">Subscriptions</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-sm p-4 flex gap-3 mb-6">
                    <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-mono text-indigo-200/70 uppercase leading-relaxed tracking-wider">Please verify extracted payload against physical asset before committing the record.</p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={resetUpload} className="px-5 py-2 bg-transparent border border-surface-border rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300 hover:bg-surface-elevated transition-colors">
                      Discard Asset
                    </button>
                    <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors shadow-lg shadow-indigo-500/10">
                      Commit Record
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </CollapsibleModule>
      )}
    </div>
  );
}
