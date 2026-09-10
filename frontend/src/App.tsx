import { ChatInterface } from './components/ChatInterface';
import { DocumentUpload } from './components/DocumentUpload';
import { Pill } from 'lucide-react';

function App() {
  return (
    <div className="h-screen w-full font-sans text-slate-900 bg-slate-100 flex items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:max-w-5xl sm:h-[90vh] bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden border-0 sm:border border-slate-200 flex flex-col relative">
        {/* Header Navigation */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 z-10">
          <div className="flex items-center space-x-2 text-blue-600">
            <Pill className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">PharmaLens</h1>
          </div>
          <DocumentUpload />
        </header>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}

export default App;
