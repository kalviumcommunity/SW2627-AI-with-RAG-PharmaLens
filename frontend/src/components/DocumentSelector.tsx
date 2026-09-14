import { useState, useEffect } from 'react';
import { getDocuments } from '../services/api';
import { FileText, Loader2, Library } from 'lucide-react';

interface DocumentSelectorProps {
  activeDocumentId: string | null;
  onSelect: (documentId: string | null, filename: string | null) => void;
}

export const DocumentSelector = ({ activeDocumentId, onSelect }: DocumentSelectorProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchDocs = async () => {
    try {
      setIsLoading(true);
      const docs = await getDocuments();
      setDocuments(docs || []);
    } catch (error) {
      console.error('Failed to load documents', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocs();
    }
  }, [isOpen]);

  const activeDoc = documents.find(d => d.documentId === activeDocumentId);
  const displayName = activeDoc ? activeDoc.originalName : 'Global Database Search';

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-sm"
      >
        {activeDoc ? <FileText className="w-4 h-4 text-blue-600" /> : <Library className="w-4 h-4 text-slate-500" />}
        <span className="truncate max-w-[150px]">{displayName}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20">
            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
              Select Context
            </div>
            
            <button
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center space-x-2 transition-colors ${!activeDocumentId ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
              onClick={() => {
                onSelect(null, null);
                setIsOpen(false);
              }}
            >
              <Library className="w-4 h-4" />
              <span>Global Database Search</span>
            </button>

            {isLoading ? (
              <div className="px-4 py-3 flex items-center space-x-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="px-4 py-3 text-slate-400 text-sm italic">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {documents.map((doc) => (
                  <button
                    key={doc.documentId}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center space-x-2 transition-colors ${activeDocumentId === doc.documentId ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    onClick={() => {
                      onSelect(doc.documentId, doc.originalName);
                      setIsOpen(false);
                    }}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{doc.originalName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
