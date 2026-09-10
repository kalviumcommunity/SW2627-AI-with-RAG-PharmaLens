import { ChatInterface } from './components/ChatInterface';

function App() {
  return (
    <div className="h-screen w-full font-sans text-slate-900 bg-slate-100 flex items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:max-w-5xl sm:h-[90vh] bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden border-0 sm:border border-slate-200 flex flex-col relative">
        {/* We can eventually add a sidebar here for document uploads, but for now we'll just have the chat taking up the space */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}

export default App;
