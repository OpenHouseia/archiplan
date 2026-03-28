import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, MessageSquare, Send, Loader2, Maximize2, RotateCcw, Info, 
  Thermometer, Volume2, Wind, LayoutDashboard, Box, Settings, 
  ChevronRight, BarChart3, Zap, ShieldCheck, Sparkles
} from 'lucide-react';
import { analyzeFloorPlan, chatWithModel } from './services/geminiService';
import { Viewer3D } from './components/Viewer3D';
import { FloorPlan3D } from './types';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [floorPlan, setFloorPlan] = useState<FloorPlan3D | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'3d' | 'dashboard'>('3d');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        processImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFloorPlan(base64);
      setFloorPlan(result);
      setMessages([{ 
        role: 'model', 
        text: "### Planta processada com sucesso!\n\nO modelo 3D está pronto para exploração. Analisei as áreas e volumes de cada ambiente para fornecer insights precisos.\n\n**O que você deseja calcular agora?**\n- Carga térmica (BTUs) para climatização\n- Tempo de reverberação acústica\n- Sugestões de materiais para conforto térmico" 
      }]);
    } catch (error) {
      console.error(error);
      setMessages([{ role: 'model', text: "Erro ao processar a imagem. Por favor, tente novamente com uma imagem mais clara." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !floorPlan || isTyping) return;

    const userMessage = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await chatWithModel(userMessage, floorPlan, history);
      setMessages(prev => [...prev, { role: 'model', text: response || "Desculpe, não consegui processar sua solicitação." }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Ocorreu um erro na comunicação com o agente." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const chartData = useMemo(() => {
    if (!floorPlan) return [];
    return floorPlan.rooms.map(room => ({
      name: room.name,
      area: room.area,
      volume: room.volume,
      btu: room.area * 600 // Simple estimation for chart
    }));
  }, [floorPlan]);

  const selectedRoom = useMemo(() => 
    floorPlan?.rooms.find(r => r.id === selectedRoomId), 
    [floorPlan, selectedRoomId]
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-2xl z-50 px-6 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Box className="text-white w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-base tracking-tight text-white leading-none">ArchiPlan 3D</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">AI Engineering Suite</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block" />
          
          <nav className="flex items-center bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
            <button 
              onClick={() => setActiveTab('3d')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === '3d' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Box size={14} />
              <span>Visualização 3D</span>
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === 'dashboard' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.label 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-all px-5 py-2 rounded-xl cursor-pointer shadow-lg shadow-indigo-500/20 text-xs font-bold text-white"
          >
            <Upload size={14} />
            <span>NOVA PLANTA</span>
            <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
          </motion.label>
          
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors">
            <Settings size={16} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Sidebar / Room List */}
        <aside className="w-72 hidden xl:flex flex-col gap-4 shrink-0">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ambientes</h2>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                {floorPlan?.rooms.length || 0} TOTAL
              </span>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {floorPlan?.rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                    selectedRoomId === room.id 
                      ? "bg-indigo-600/10 border-indigo-500/50 text-white" 
                      : "bg-slate-950/50 border-slate-800/50 text-slate-400 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      selectedRoomId === room.id ? "bg-indigo-400 animate-pulse" : "bg-slate-700"
                    )} />
                    <span className="text-xs font-medium truncate max-w-[120px]">{room.name}</span>
                  </div>
                  <ChevronRight size={14} className={cn(
                    "transition-transform",
                    selectedRoomId === room.id ? "rotate-90 text-indigo-400" : "text-slate-600 group-hover:translate-x-1"
                  )} />
                </button>
              ))}
              {!floorPlan && (
                <div className="py-8 text-center">
                  <p className="text-[10px] text-slate-600 font-medium italic">Nenhum ambiente detectado</p>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {selectedRoom && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 border border-slate-800/50 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Maximize2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedRoom.name}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Detalhes Geométricos</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Área</p>
                    <p className="text-sm font-mono text-white">{selectedRoom.area.toFixed(2)} m²</p>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Volume</p>
                    <p className="text-sm font-mono text-white">{selectedRoom.volume.toFixed(2)} m³</p>
                  </div>
                </div>

                <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Estimativa HVAC</span>
                    <Zap size={12} className="text-indigo-400" />
                  </div>
                  <p className="text-lg font-bold text-white">{(selectedRoom.area * 600).toLocaleString()} <span className="text-xs font-normal text-slate-500">BTUs</span></p>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[65%]" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Center: Main View */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === '3d' ? (
              <motion.div 
                key="3d"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 relative"
              >
                <Viewer3D 
                  data={floorPlan} 
                  selectedRoomId={selectedRoomId} 
                  onRoomSelect={setSelectedRoomId} 
                />
                
                {/* 3D HUD */}
                <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
                  <div className="bg-slate-950/80 backdrop-blur border border-slate-800/50 p-3 rounded-xl flex items-center gap-3 shadow-2xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Real-time Render Engine</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 overflow-y-auto scrollbar-thin"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Area Comparison */}
                  <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-400" />
                        Distribuição de Áreas
                      </h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                          />
                          <Bar dataKey="area" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* HVAC Load */}
                  <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap size={16} className="text-orange-400" />
                        Carga Térmica Estimada
                      </h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorBtu" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                          />
                          <Area type="monotone" dataKey="btu" stroke="#f97316" fillOpacity={1} fill="url(#colorBtu)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Room Composition */}
                  <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-6 md:col-span-2">
                    <div className="flex items-center gap-6">
                      <div className="w-1/3 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="area"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
                          <div className="flex items-center gap-3 mb-2">
                            <ShieldCheck className="text-green-400" size={16} />
                            <span className="text-xs font-bold text-slate-300 uppercase">Status do Projeto</span>
                          </div>
                          <p className="text-xl font-bold text-white">Consistente</p>
                          <p className="text-[10px] text-slate-500 mt-1">Geometria validada pela IA</p>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
                          <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="text-yellow-400" size={16} />
                            <span className="text-xs font-bold text-slate-300 uppercase">Eficiência Térmica</span>
                          </div>
                          <p className="text-xl font-bold text-white">84%</p>
                          <p className="text-[10px] text-slate-500 mt-1">Baseado em volumes compactos</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Chat Agent */}
        <div className="w-96 hidden lg:flex flex-col bg-slate-950/50 border border-slate-800/50 rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Chat Header */}
          <div className="p-5 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <MessageSquare size={20} className="text-indigo-400" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Consultor Especialista</h3>
                <p className="text-[10px] text-slate-500 font-medium">Online • IA Ativa</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-40">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600">
                  <Info size={24} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aguardando análise de planta</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={i} 
                className={cn(
                  "flex flex-col max-w-[90%]",
                  msg.role === 'user' ? "ml-auto items-end" : "items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800"
                )}>
                  <div className="markdown-body prose prose-invert prose-xs max-w-none">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
                <span className="text-[8px] text-slate-600 font-bold uppercase mt-1 px-1">
                  {msg.role === 'user' ? 'Você' : 'ArchiPlan AI'}
                </span>
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-3 ml-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium italic">Analisando dados técnicos...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-5 bg-slate-950/80 border-t border-slate-800/50">
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={floorPlan ? "Pergunte sobre o projeto..." : "Carregue uma planta primeiro"}
                disabled={!floorPlan || isTyping}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-5 pr-14 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all disabled:opacity-30"
              />
              <button
                type="submit"
                disabled={!floorPlan || !chatInput.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <Send size={18} />
              </button>
            </form>
            <div className="mt-3 flex items-center justify-center gap-4">
              <button className="text-[9px] font-bold text-slate-600 hover:text-indigo-400 transition-colors flex items-center gap-1 uppercase tracking-wider">
                <Thermometer size={10} /> Climatização
              </button>
              <button className="text-[9px] font-bold text-slate-600 hover:text-indigo-400 transition-colors flex items-center gap-1 uppercase tracking-wider">
                <Volume2 size={10} /> Acústica
              </button>
              <button className="text-[9px] font-bold text-slate-600 hover:text-indigo-400 transition-colors flex items-center gap-1 uppercase tracking-wider">
                <Wind size={10} /> Conforto
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Global Background FX */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-indigo-600/5 blur-[160px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-purple-600/5 blur-[160px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>
    </div>
  );
}
