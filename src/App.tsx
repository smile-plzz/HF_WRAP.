import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Cpu, 
  Settings, 
  MessageSquare, 
  History, 
  AlertCircle, 
  Loader2, 
  ChevronDown,
  Sparkles,
  Terminal,
  Eraser,
  Copy,
  Trash2,
  ExternalLink,
  Check
} from "lucide-react";
import { POPULAR_MODELS, ModelOption, InferenceResponse, HistoryItem } from "./types";

export default function App() {
  const [model, setModel] = useState<string>(POPULAR_MODELS[0].id);
  const [customModel, setCustomModel] = useState<string>("");
  const [customTask, setCustomTask] = useState<string>("text-generation");
  const [customProvider, setCustomProvider] = useState<string>("hf-inference");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [input, setInput] = useState("");
  const [userToken, setUserToken] = useState<string>(() => localStorage.getItem("hf_user_token") || "");
  const [isTokenValid, setIsTokenValid] = useState<boolean>(true);

  const validateToken = (token: string) => {
    if (!token) return true;
    // Modern HF tokens typically start with hf_ and followed by ~34 chars
    const hfPattern = /^hf_[a-zA-Z0-9]{34,}$/;
    return hfPattern.test(token);
  };
  const [results, setResults] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem("hf_inference_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tokenVisible, setTokenVisible] = useState(false);

  useEffect(() => {
    localStorage.setItem("hf_user_token", userToken);
    setIsTokenValid(validateToken(userToken));
  }, [userToken]);

  useEffect(() => {
    localStorage.setItem("hf_inference_history", JSON.stringify(results));
  }, [results]);

  const clearHistory = () => {
    setResults([]);
  };
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results, isLoading]);

  const handleInference = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    const activeModel = isCustomMode ? customModel : model;
    const modelOption = POPULAR_MODELS.find(m => m.id === model);
    const activeTask = (isCustomMode ? customTask : modelOption?.task) || "text-generation";
    const activeProvider = isCustomMode ? customProvider : modelOption?.provider;

    try {
      if (!isTokenValid) {
        throw new Error("Invalid token format detected. Correct your configuration.");
      }

      if (isCustomMode && !activeModel.trim()) {
        throw new Error("Target Model ID required for propagation.");
      }

      if (!activeTask) {
        throw new Error("Task vector undefined. Select an inference type.");
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userToken.trim()) {
        headers["x-hf-token"] = userToken;
      }

      const parameters: any = {
        wait_for_model: true,
        use_cache: true
      };

      if (activeTask === "text-generation" || activeTask === "summarization") {
        parameters.return_full_text = false;
        parameters.max_new_tokens = 250;
      }

      const response = await fetch("/api/inference", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: activeModel,
          task: activeTask,
          provider: activeProvider,
          inputs: input,
          parameters
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = data.error || "Inference cycle aborted";
        if (msg.includes("No Inference Provider")) {
          msg = `Node "${activeModel}" unavailable on free-tier topology. Try an instruction-tuned alternative or check provider status.`;
        }
        if (data.status === 401) {
          msg = "Access Token rejected. Verify HF_TOKEN in System_Config.";
        }
        if (msg.includes("ENOTFOUND")) {
          msg = "Network Isolation detected. The server is unable to resolve HF DNS. Attempting recovery protocol...";
        }
        setError(msg);
        throw new Error(msg);
      }

      setResults(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 11),
        prompt: input,
        response: data,
        model: activeModel,
        timestamp: new Date().toLocaleTimeString()
      }]);
      setInput("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResults(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans overflow-hidden border-8 border-[#1A1A1A] selection:bg-[#FFD21E] selection:text-black">
      {/* Sidebar - Model Config & Stats */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 340 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#0C0C0C] border-r border-[#222] flex flex-col justify-between overflow-hidden"
      >
        <div className="p-8 space-y-12">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FFD21E] mb-6 opacity-80">Active_Node</h2>
            <div className="space-y-1">
              <p className="text-4xl font-light leading-none text-white overflow-hidden whitespace-nowrap text-ellipsis">
                {(isCustomMode ? customModel : model).split('/').shift()}/
              </p>
              <p className="text-5xl font-black leading-none text-white tracking-tighter break-all">
                {(isCustomMode ? customModel : model).split('/').pop() || "NONE"}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-6">
              {POPULAR_MODELS.find(m => m.id === model)?.type && (
                <span className="border border-[#333] px-2 py-1 text-[9px] font-mono rounded-sm uppercase tracking-wider opacity-60">
                  {POPULAR_MODELS.find(m => m.id === model)?.type}
                </span>
              )}
              <span className="border border-[#333] px-2 py-1 text-[9px] font-mono rounded-sm uppercase tracking-wider opacity-60">F16 QUANT</span>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FFD21E] opacity-80">Metrics</h2>
            <div>
              <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-40 mb-2"><span>Latency</span><span>142ms</span></div>
              <div className="h-1 bg-[#222]"><motion.div initial={{ width: 0 }} animate={{ width: "14%" }} className="h-full bg-white"></motion.div></div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-40 mb-2"><span>Inference_Load</span><span>88%</span></div>
              <div className="h-1 bg-[#222]"><motion.div initial={{ width: 0 }} animate={{ width: "88%" }} className="h-full bg-[#FFD21E]"></motion.div></div>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-white/5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FFD21E] opacity-80">System_Config</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-bold">
                   <label className={`transition-colors ${isTokenValid ? 'opacity-40' : 'text-red-500 opacity-100'}`}>
                     HF_Access_Token {!isTokenValid && "[FORMAT_ERROR]"}
                   </label>
                   <button 
                    onClick={() => setTokenVisible(!tokenVisible)}
                    className="opacity-30 hover:opacity-100"
                   >
                     {tokenVisible ? "[hide]" : "[show]"}
                   </button>
                </div>
                <div className="relative">
                  <input 
                    type={tokenVisible ? "text" : "password"}
                    placeholder="hf_xxxxxxxxxxxx"
                    value={userToken}
                    onChange={(e) => setUserToken(e.target.value)}
                    className={`w-full bg-[#111] border p-2 text-xs font-mono focus:outline-none transition-all text-white tracking-widest ${isTokenValid ? 'border-[#222] focus:border-[#FFD21E]' : 'border-red-500/50 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]'}`}
                  />
                  {!isTokenValid && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500">
                      <AlertCircle size={14} />
                    </div>
                  )}
                </div>
                <p className={`text-[8px] font-mono leading-tight transition-colors ${isTokenValid ? 'opacity-20' : 'text-red-500/60'}`}>
                  {isTokenValid 
                    ? "If provided, this token bypasses server-level keys." 
                    : "Invalid token structure. Tokens should start with 'hf_' followed by at least 34 alphanumeric characters."}
                </p>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded mt-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#FFD21E] opacity-60 mb-1">Token_Guide</p>
                  <p className="text-[8px] opacity-40 leading-relaxed font-mono">Use a [READ] or [FINE-GRAINED] token with the [inference] scope for neural bridge stability.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FFD21E] opacity-80">History</h2>
              <button 
                onClick={clearHistory}
                className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
              >
                Clear
              </button>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {results.length === 0 ? (
                <p className="text-[10px] font-mono opacity-20 uppercase tracking-widest italic">Stack_Empty</p>
              ) : (
                results.slice().reverse().map((res) => (
                  <div key={res.id} onClick={() => {
                    const el = document.getElementById(`res-${res.id}`);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }} className="text-[10px] font-mono border-l border-[#333] pl-3 py-1 space-y-1 group active:bg-white/5 cursor-pointer relative">
                    <div className="opacity-40">{res.timestamp}</div>
                    <div className="text-gray-400 truncate pr-6">{res.prompt}</div>
                    <button 
                      onClick={(e) => deleteHistoryItem(res.id, e)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 hover:opacity-100 p-1"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-4">
          <div className="p-6 bg-[#151515] rounded border border-[#222]">
            <h3 className="text-[9px] font-bold uppercase tracking-widest mb-4 opacity-40">Load Chart</h3>
            <div className="flex items-end gap-1.5 h-12">
              {[40, 60, 30, 95, 50, 75, 45, 80, 20, 65].map((h, i) => (
                <div key={i} className={`flex-1 ${h > 80 ? 'bg-[#FFD21E]' : 'bg-[#333]'} transition-all`} style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
          <p className="text-[9px] font-mono opacity-30 uppercase tracking-[0.2em] font-bold">Bridge_Layer v1.0.8</p>
        </div>
      </motion.aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background text decoration */}
        <div className="absolute -right-20 bottom-10 text-[20rem] font-black text-white/[0.02] rotate-90 pointer-events-none select-none tracking-tighter italic z-0">
          PROMPT
        </div>

        {/* Header */}
        <header className="flex-none border-b border-[#222] p-8 flex justify-between items-end bg-[#0D0D0D] z-10">
          <div>
            <h1 className="text-7xl font-black tracking-tighter leading-none text-white">HF_WRAP<span className="text-[#FFD21E]">.</span></h1>
            <p className="text-[10px] font-mono mt-3 opacity-40 uppercase tracking-[0.4em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFD21E] shadow-[0_0_8px_#FFD21E]"></span> 
              Neural Inference Bridge Session
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
             <div className="flex gap-2">
                <button 
                  onClick={() => setIsCustomMode(false)}
                  className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-widest transition-all ${!isCustomMode ? 'bg-[#FFD21E] text-black shadow-lg shadow-[#FFD21E]/10' : 'bg-[#1A1A1A] text-gray-500 hover:text-gray-300'}`}
                >
                  Presets
                </button>
                <button 
                  onClick={() => setIsCustomMode(true)}
                  className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-widest transition-all ${isCustomMode ? 'bg-[#FFD21E] text-black shadow-lg shadow-[#FFD21E]/10' : 'bg-[#1A1A1A] text-gray-500 hover:text-gray-300'}`}
                >
                  Custom
                </button>
             </div>
             
             {!isCustomMode && (
               <div className="flex gap-2">
                 <div className="relative group">
                   <select 
                     value={model}
                     onChange={(e) => setModel(e.target.value)}
                     className="appearance-none bg-[#111] border border-[#222] px-4 py-2 pr-10 text-xs font-mono focus:outline-none focus:border-[#FFD21E] cursor-pointer w-64 text-white uppercase tracking-wider"
                   >
                     {POPULAR_MODELS.map(opt => (
                       <option key={opt.id} value={opt.id} className="bg-[#1a1a1e]">{opt.id.toUpperCase()}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                 </div>
                 <div className="flex items-center px-4 bg-[#111] border border-[#222] text-[10px] font-mono text-[#FFD21E] uppercase tracking-tighter">
                   Vector: {POPULAR_MODELS.find(m => m.id === model)?.task || "AUTO"}
                 </div>
               </div>
             )}
             
             {isCustomMode && (
               <div className="flex gap-2">
                 <input 
                   type="text"
                   placeholder="AUTHOR / MODEL_ID"
                   value={customModel}
                   onChange={(e) => setCustomModel(e.target.value)}
                   className="bg-[#111] border border-[#222] px-4 py-2 text-xs font-mono focus:outline-none focus:border-[#FFD21E] w-48 text-white uppercase tracking-wider"
                 />
                 <select 
                   value={customTask}
                   onChange={(e) => setCustomTask(e.target.value)}
                   className="appearance-none bg-[#111] border border-[#222] px-4 py-2 text-xs font-mono focus:outline-none focus:border-[#FFD21E] cursor-pointer w-32 text-white uppercase tracking-wider"
                 >
                    <option value="text-generation">Task: Text Gen</option>
                    <option value="translation">Task: Translation</option>
                    <option value="summarization">Task: Summarization</option>
                    <option value="text-to-image">Task: Text2Img</option>
                    <option value="text-classification">Task: Classify</option>
                 </select>
                 <select 
                   value={customProvider}
                   onChange={(e) => setCustomProvider(e.target.value)}
                   className="appearance-none bg-[#111] border border-[#222] px-4 py-2 text-xs font-mono focus:outline-none focus:border-[#FFD21E] cursor-pointer w-32 text-white uppercase tracking-wider"
                 >
                    <option value="hf-inference">Prov: Default</option>
                    <option value="together">Prov: Together</option>
                    <option value="fireworks-ai">Prov: Fireworks</option>
                    <option value="fal-ai">Prov: Fal.ai</option>
                    <option value="replicate">Prov: Replicate</option>
                 </select>
               </div>
             )}
          </div>
        </header>

        {/* Content Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar z-10 pb-40">
          {results.length === 0 && !isLoading && !error && (
            <div className="h-full flex flex-col justify-center max-w-3xl space-y-8">
               <motion.div 
                 initial={{ x: -40, opacity: 0 }}
                 animate={{ x: 0, opacity: 1 }}
               >
                 <h2 className="text-8xl font-black tracking-tighter text-white italic opacity-10">READY_</h2>
                 <p className="text-xl font-light text-gray-500 max-w-xl leading-relaxed mt-4 italic">
                    Establish a bridge to the Hugging Face topology. Input a sequence to initiate the inference vector.
                 </p>
               </motion.div>
            </div>
          )}

          <AnimatePresence>
            {results.map((res, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={res.id}
                id={`res-${res.id}`}
                className="max-w-5xl space-y-6"
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FFD21E]">Input_Sequence</label>
                  <div className="bg-[#111] border border-[#222] p-6 font-mono text-sm leading-relaxed rounded shadow-2xl text-white/80 italic">
                    "{res.prompt}"
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FFD21E]">Model_Output</label>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          const text = res.response.image 
                            ? "Image sequence - non-textual" 
                            : (Array.isArray(res.response) ? res.response[0]?.generated_text : JSON.stringify(res.response));
                          copyToClipboard(text, res.id);
                        }}
                        className={`flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest transition-all ${copiedId === res.id ? 'text-emerald-500' : 'text-white/20 hover:text-white'}`}
                      >
                        {copiedId === res.id ? <Check size={10} /> : <Copy size={10} />}
                        {copiedId === res.id ? "Copied" : "Copy"}
                      </button>
                      <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">{res.model} @ {res.timestamp}</span>
                    </div>
                  </div>
                  <div className="bg-[#050505] border border-white/5 p-8 font-mono text-base leading-relaxed rounded-lg shadow-inner text-[#BBB] relative overflow-hidden">
                    {res.response.image ? (
                        <div className="space-y-4">
                          <img 
                            src={res.response.image} 
                            alt="Generated" 
                            className="max-w-full h-auto rounded border border-white/10 shadow-2xl"
                            referrerPolicy="no-referrer"
                          />
                          <a 
                            href={res.response.image} 
                            download={`hf_${res.id}.png`}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 text-[9px] uppercase tracking-widest text-white/60 rounded transition-colors"
                          >
                            <ExternalLink size={10} />
                            Download Stream
                          </a>
                        </div>
                    ) : Array.isArray(res.response) ? (
                         res.response.map((r, idx) => (
                           <p key={idx} className="whitespace-pre-wrap text-emerald-50/80 drop-shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                             {r.generated_text || JSON.stringify(r)}
                           </p>
                         ))
                       ) : (
                         <pre className="text-[10px] opacity-60">
                            {JSON.stringify(res.response, null, 2)}
                         </pre>
                       )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="max-w-5xl space-y-3 animate-pulse">
              <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FFD21E]">Executing_Inference...</label>
              <div className="bg-[#050505] border border-white/5 p-8 h-32 rounded-lg flex items-center gap-4">
                 <div className="w-2.5 h-5 bg-[#FFD21E] animate-cursor shrink-0"></div>
                 <div className="h-1 flex-1 bg-white/5">
                    <motion.div 
                      className="h-full bg-[#FFD21E]"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                 </div>
              </div>
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-5xl p-6 bg-red-500/5 border border-red-500/40 rounded text-red-500 font-mono text-sm uppercase tracking-widest italic"
            >
              Sequence Termination Error :: {error}
            </motion.div>
          )}
        </div>

        {/* Input Surface */}
        <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent pt-20 z-20">
          <div className="max-w-5xl mx-auto space-y-4">
             <div className="flex justify-between items-end">
               <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FFD21E] opacity-60">Terminal_Input</label>
               <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-[10px] font-mono text-gray-600 hover:text-white transition-colors"
               >
                 [toggle_bridge_info]
               </button>
             </div>
             <div className="relative bg-[#111] border-2 border-[#222] flex items-end focus-within:border-[#FFD21E] transition-all group p-1">
               <textarea 
                rows={1}
                placeholder="AWAITING SYSTEM_COMMAND..."
                value={input}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleInference();
                  }
                }}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-white py-4 px-6 font-mono text-lg resize-none max-h-48 custom-scrollbar placeholder:text-gray-800"
               />
               <button 
                onClick={handleInference}
                disabled={isLoading || !input.trim()}
                className="m-2 px-8 py-4 bg-[#FFD21E] text-black font-black uppercase tracking-tighter text-sm italic hover:bg-white disabled:bg-[#222] disabled:text-gray-600 transition-all hover:scale-[1.02] active:scale-95"
               >
                {isLoading ? "BUSY" : "PUSH_"}
               </button>
             </div>
          </div>
        </div>

        <footer className="flex-none bg-[#FFD21E] text-black px-8 py-2 flex justify-between items-center font-black text-[10px] uppercase italic tracking-tighter z-30">
          <div>System_Status: All_Nodes_Nominal // Region: Global_Inference // Encrypted_Tunnel: ACTIVE</div>
          <div className="flex gap-6">
            <span>Session: {new Date().toLocaleTimeString()}</span>
            <span>AIS_BRIDGED: TRUE</span>
          </div>
        </footer>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #FFD21E;
        }
      `}</style>
    </div>
  );
}
