import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Sparkles, LayoutDashboard, Download, Maximize2, 
  X, Send, BarChart3, ChevronRight, Play, Compass, Cpu, 
  Check, AlertCircle, Code, ShieldAlert, Heart, BarChart2
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import UploadZone from './components/UploadZone';

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  const [file, setFile] = useState(null);
  const [datasetId, setDatasetId] = useState(null);
  const [dataInfo, setDataInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: 'Hello! I am Obsidian Architecture. Upload a dataset and ask me anything about it. I specialize in deep analytics and visualization.' }
  ]);
  const [query, setQuery] = useState('');
  const chatEndRef = useRef(null);

  const [chartGallery, setChartGallery] = useState([]);
  const [selectedChart, setSelectedChart] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Cleaning States
  const [cleaningLoading, setCleaningLoading] = useState(false);
  const [deepCleaningLoading, setDeepCleaningLoading] = useState(false);
  const [quickCleanData, setQuickCleanData] = useState(null);
  const [deepCleanData, setDeepCleanData] = useState(null);
  const [autoModelSelection, setAutoModelSelection] = useState(true);
  const [manualModelChoice, setManualModelChoice] = useState('flash');
  const [activeRoutingInfo, setActiveRoutingInfo] = useState({
    model: 'None',
    desc: 'Select a clean option or query below to route models.'
  });
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState('Routing query...');

  useEffect(() => {
    const saved = localStorage.getItem('chartGallery');
    if (saved) {
      try { setChartGallery(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const downloadChart = (imgBase64, title) => {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${imgBase64}`;
    a.download = `${title ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'chart'}.png`;
    a.click();
  };

  const downloadCleanedCsv = (base64Str, filename) => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;base64," + base64Str);
    element.setAttribute("download", filename || "cleaned_dataset.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleUpload = async (selectedFile) => {
    setFile(selectedFile);
    setLoading(true);
    setQuickCleanData(null);
    setDeepCleanData(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/upload', formData);
      if (res.data.status === 'success') {
        setDatasetId(res.data.datasetId);
        setDataInfo(res.data);
        setChatHistory(prev => [
            ...prev,
            { role: 'ai', text: `Loaded **${res.data.filename}**.\n\nI found ${res.data.rowCount.toLocaleString()} rows and ${res.data.colCount} features. What should we analyze first?` }
        ]);
      } else alert("Upload error");
    } catch (err) { alert("Error: " + err.message); } 
    finally { setLoading(false); }
  };

  const handleQuickClean = async () => {
    if (!datasetId) return;
    setCleaningLoading(true);
    setQuickCleanData(null);
    
    const formData = new FormData();
    formData.append('datasetId', datasetId);
    if (!autoModelSelection && manualModelChoice === 'pro') {
      formData.append('mode', 'deep');
    } else {
      formData.append('mode', 'quick');
    }
    
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/quick-clean', formData);
      if (res.data.status === 'success') {
        setQuickCleanData(res.data);
        setDatasetId(res.data.datasetId);
        
        if (res.data.ai_report) {
          setActiveRoutingInfo({
            model: res.data.ai_report._model_routed,
            desc: res.data.ai_report._routing_desc
          });
        }
        
        setDataInfo(prev => ({
          ...prev,
          datasetId: res.data.datasetId,
          rowCount: res.data.rowCount,
          colCount: res.data.colCount,
          columns: res.data.columns,
          preview: res.data.preview
        }));
        
        setChatHistory(prev => [
          ...prev,
          { 
            role: 'ai', 
            text: `🧹 **Quick Clean Complete**!\n\n` +
                  `I ran the pre-processing checks:\n` +
                  `- Duplicates removed: ${res.data.before_stats.duplicates}\n` +
                  `- Missing values resolved: ${res.data.before_stats.missing}\n` +
                  `- Outliers detected: ${res.data.before_stats.outliers}\n` +
                  `- Columns normalized: ${res.data.stats.columns_normalized}\n\n` +
                  `Active workspace has been switched to this cleaned version. View detailed stats and generated Pandas code in the **AI Clean & Health** tab!` 
          }
        ]);
      } else {
        alert("Quick clean failed: " + (res.data.error || "unknown error"));
      }
    } catch (err) {
      alert("Error executing Quick Clean: " + err.message);
    } finally {
      setCleaningLoading(false);
    }
  };

  const handleDeepClean = async () => {
    if (!datasetId) return;
    setDeepCleaningLoading(true);
    setDeepCleanData(null);
    
    const formData = new FormData();
    formData.append('datasetId', datasetId);
    if (!autoModelSelection && manualModelChoice === 'flash') {
      formData.append('mode', 'quick');
    } else {
      formData.append('mode', 'deep');
    }
    
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/deep-clean', formData);
      if (res.data.status === 'success') {
        setDeepCleanData(res.data);
        
        if (res.data.analysis) {
          setActiveRoutingInfo({
            model: res.data.analysis._model_routed,
            desc: res.data.analysis._routing_desc
          });
        }
        
        setChatHistory(prev => [
          ...prev,
          { 
            role: 'ai', 
            text: `🧠 **Deep ML-Readiness Audit Complete**!\n\n` +
                  `**Dataset Health Score**: ${res.data.health_score}/100\n` +
                  `_${res.data.analysis.health_explanation}_\n\n` +
                  `* Key anomalies detected: ${res.data.analysis.anomalies.length}\n` +
                  `* Feature suggestions proposed: ${res.data.analysis.feature_engineering_suggestions.length}\n` +
                  `* Skewness check: ${res.data.analysis.skewness_analysis}\n\n` +
                  `I've also generated dark-themed distribution heatmaps and BoxPlots. Check the **AI Clean & Health** tab to view them!`
          }
        ]);
      } else {
        alert("Deep clean failed: " + (res.data.error || "unknown error"));
      }
    } catch (err) {
      alert("Error executing Deep Clean: " + err.message);
    } finally {
      setDeepCleaningLoading(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!query.trim() || !datasetId) return;
    
    const userQuery = query;
    const newHistory = [...chatHistory, { role: 'user', text: userQuery }];
    setChatHistory(newHistory);
    setQuery('');
    
    let loadingMsg = "Routing to Gemini 2.5 Flash...";
    if (!autoModelSelection) {
      loadingMsg = manualModelChoice === 'flash' 
        ? "Routing to Gemini 2.5 Flash (forced speed mode)..." 
        : "Routing to Gemini 2.5 Pro (forced reasoning mode)...";
    } else {
      const qLower = userQuery.toLowerCase();
      const complexTerms = [
        "advanced",
        "deep analysis",
        "feature engineering",
        "business insights",
        "anomaly",
        "ml recommendation",
        "correlation reasoning"
      ];
      let matchedTerm = null;
      for (let term of complexTerms) {
        if (qLower.includes(term)) {
          matchedTerm = term;
          break;
        }
      }
      if (matchedTerm) {
        loadingMsg = `Routing to Gemini 2.5 Pro (advanced reasoning for '${matchedTerm}')...`;
      } else {
        loadingMsg = "Routing to Gemini 2.5 Flash (fast query processing)...";
      }
    }
    setCurrentLoadingMessage(loadingMsg);
    setLoading(true);
    
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    const formData = new FormData();
    formData.append('query', userQuery);
    formData.append('datasetId', datasetId);
    if (!autoModelSelection) {
      formData.append('mode', manualModelChoice === 'flash' ? 'quick' : 'deep');
    }
    
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/chat', formData);
      if (res.data.status === 'success') {
        const responseData = res.data.response;
        const responseText = typeof responseData === 'string' ? responseData : responseData.text;
        
        if (responseData.model_used) {
          setActiveRoutingInfo({
            model: responseData.model_used,
            desc: responseData.routing_desc || 'Custom query processed.'
          });
        }
        
        let newChartObj = null;
        if (responseData.chartBase64) {
            newChartObj = {
                id: Date.now() + Math.random(),
                image: responseData.chartBase64,
                title: responseData.chartTitle || userQuery,
                createdAt: new Date().toISOString()
            };
            setSelectedChart(newChartObj);
            setChartGallery(prev => {
                const updated = [newChartObj, ...prev];
                localStorage.setItem('chartGallery', JSON.stringify(updated));
                return updated;
            });
        }
        setChatHistory([...newHistory, { 
          role: 'ai', 
          text: responseText, 
          chartBase64: responseData.chartBase64, 
          modelUsed: responseData.model_used,
          routingDesc: responseData.routing_desc
        }]);
      }
    } catch (err) {
      setChatHistory([...newHistory, { role: 'ai', text: "Server error." }]);
    } finally {
      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleSheetSelect = (sheet) => {
    setDatasetId(sheet.datasetId);
    setQuickCleanData(null);
    setDeepCleanData(null);
    setDataInfo(prev => ({
      ...prev,
      datasetId: sheet.datasetId,
      rowCount: sheet.rowCount,
      colCount: sheet.colCount,
      columns: sheet.columns,
      preview: sheet.preview,
    }));
    setChatHistory(prev => [
      ...prev,
      { role: 'ai', text: `Switched to sheet **${sheet.sheetName}**. I found ${sheet.rowCount.toLocaleString()} rows and ${sheet.colCount} features.` }
    ]);
  };

  const handleNewAnalysis = () => {
    setDatasetId(null);
    setDataInfo(null);
    setFile(null);
    setQuickCleanData(null);
    setDeepCleanData(null);
    setChatHistory([{ role: 'ai', text: 'Hello! I am Obsidian Architecture. Upload a dataset and ask me anything about it. I specialize in deep analytics and visualization.' }]);
    setActiveTab('chat');
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activeTab={activeTab} setActiveTab={setActiveTab} onNewAnalysis={handleNewAnalysis} />
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Navbar dataInfo={dataInfo} onSheetSelect={handleSheetSelect} />
        
        {!datasetId ? (
          <UploadZone onUpload={handleUpload} loading={loading} />
        ) : (
          <div className="flex-1 flex overflow-hidden">
              {/* CENTER MAIN WORKSPACE */}
              <div className="flex-1 flex flex-col relative px-6 py-4 overflow-hidden">
                 
                 {activeTab === 'chat' && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col h-full glass-panel overflow-hidden">
                       <div className="flex-1 overflow-y-auto p-6 space-y-6">
                         {chatHistory.map((msg, i) => (
                           <motion.div 
                             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.1}}
                             key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                           >
                             <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-800 border border-white/5 rounded-bl-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]'}`}>
                               {msg.role === 'ai' && (
                                 <div className="flex items-center gap-2 mb-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                                   <Sparkles size={12}/> Obsidian AI {msg.modelUsed && <span className="text-gray-500 lowercase opacity-60">({msg.modelUsed})</span>}
                                 </div>
                               )}
                               <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                               
                               {msg.chartBase64 && (
                                 <div className="mt-4 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-blue-500 transition-colors" onClick={() => {
                                      const match = chartGallery.find(c => c.image === msg.chartBase64);
                                      if(match) setSelectedChart(match); setModalOpen(true);
                                 }}>
                                   <img src={`data:image/png;base64,${msg.chartBase64}`} alt="Chart" className="w-full mix-blend-screen bg-black" />
                                 </div>
                               )}
                               
                               {msg.routingDesc && (
                                 <div className="text-[10px] text-gray-500 italic mt-2 border-t border-white/5 pt-1.5 flex items-center gap-1">
                                   <Cpu size={10} className="text-blue-500"/> {msg.routingDesc}
                                 </div>
                               )}
                             </div>
                           </motion.div>
                         ))}
                         {loading && (
                           <div className="flex items-start">
                             <div className="bg-gray-800 border border-white/5 rounded-2xl rounded-bl-sm px-5 py-4 text-sm flex items-center gap-3 text-gray-400">
                               <div className="flex gap-1"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></span><span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></span></div>
                               {currentLoadingMessage}
                             </div>
                           </div>
                         )}
                         <div ref={chatEndRef} />
                       </div>

                       <div className="p-4 border-t border-white/5 bg-gray-800/30 backdrop-blur-md">
                         <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                           {["Create KPI dashboard", "Show revenue trend", "Find anomalies"].map(chip => (
                              <button key={chip} onClick={() => setQuery(chip)} className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-gray-800 text-gray-300 hover:text-white hover:border-blue-500 whitespace-nowrap transition-all">{chip}</button>
                           ))}
                         </div>
                         <form onSubmit={handleChat} className="relative">
                           <input type="text" value={query} onChange={e=>setQuery(e.target.value)} disabled={loading} placeholder="Ask Obsidian a question..." className="w-full bg-gray-950 border border-white/10 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-blue-500 text-sm transition-all"/>
                           <button type="submit" disabled={loading||!query.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-[#4b8eff] rounded-lg text-white disabled:opacity-50 transition-all">
                              <Send size={16}/>
                           </button>
                         </form>
                       </div>
                    </motion.div>
                 )}

                 {activeTab === 'preview' && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="glass-panel overflow-auto p-6 h-full">
                       <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2"><Database size={20}/> Data Preview</h2>
                       <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                            <tr>{dataInfo.columns.map((c,i) => <th key={i} className="px-4 py-3 font-medium">{c.name}</th>)}</tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {dataInfo.preview.map((row, i) => (
                              <tr key={i} className="hover:bg-white/5">
                                {dataInfo.columns.map((c,j) => <td key={j} className="px-4 py-3">{row[c.name]}</td>)}
                              </tr>
                            ))}
                          </tbody>
                       </table>
                    </motion.div>
                 )}

                 {activeTab === 'dashboard' && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="glass-panel overflow-auto p-6 h-full flex flex-col items-center justify-center text-gray-400">
                       <LayoutDashboard size={48} className="mb-4 text-blue-500" />
                       <h2 className="text-xl font-semibold text-white mb-2">Automated Dashboard</h2>
                       <p className="max-w-md text-center text-sm">Ask the AI in the chat to "Create KPI dashboard" to generate custom visuals here in future updates. For now, check the quick visuals gallery on the right!</p>
                    </motion.div>
                 )}

                 {activeTab === 'reports' && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="glass-panel overflow-auto p-6 h-full flex flex-col items-center justify-center text-gray-400">
                       <Compass size={48} className="mb-4 text-purple-500" />
                       <h2 className="text-xl font-semibold text-white mb-2">Data Reports</h2>
                       <p className="max-w-md text-center text-sm">Automated PDF report generation is coming soon. Use the chat to analyze the dataset.</p>
                    </motion.div>
                 )}

                 {activeTab === 'clean' && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="glass-panel overflow-y-auto p-6 h-full space-y-8">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Sparkles size={24} className="text-blue-500 animate-pulse"/> AI Clean & Health Control Center
                          </h2>
                          <p className="text-gray-400 text-sm mt-1">
                            Optimize, clean, and profile your dataset using advanced Gemini models.
                          </p>
                        </div>
                        
                        {/* Active Dataset Status Badge */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-white/10 text-xs text-gray-300 self-start md:self-center">
                          <Database size={14} className="text-blue-400"/>
                          <span className="font-semibold">Active:</span> {dataInfo?.filename}
                        </div>
                      </div>

                      {/* Smart Routing status bar */}
                      <div className="flex flex-wrap items-center gap-3 bg-gray-900/40 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Router Status:</span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5 animate-pulse">
                            <Cpu size={12}/> {autoModelSelection ? "Auto-Routing Active" : "Manual Override"}
                          </span>
                        </div>
                        {activeRoutingInfo.model !== 'None' && (
                          <>
                            <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Active Model:</span>
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {activeRoutingInfo.model}
                              </span>
                            </div>
                            <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                            <span className="text-xs text-gray-400 italic">
                              &ldquo;{activeRoutingInfo.desc}&rdquo;
                            </span>
                          </>
                        )}
                      </div>

                      {/* Selection screen */}
                      {!quickCleanData && !deepCleanData && !cleaningLoading && !deepCleaningLoading && (
                        <div className="space-y-6">
                          {/* Auto AI Mode Toggle Control Panel */}
                          <div className="glass-panel p-5 border-white/5 bg-gray-900/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Cpu size={16} className="text-blue-400"/> AI Routing Configuration
                              </h4>
                              <p className="text-xs text-gray-400">
                                Let Obsidian automatically select the best model based on task complexity, or force a model override.
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4">
                              {/* Auto Selection Toggle */}
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={autoModelSelection} 
                                  onChange={(e) => setAutoModelSelection(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white border border-white/10"></div>
                                <span className="ml-3 text-xs font-semibold text-gray-300">Auto AI Mode</span>
                              </label>

                              {/* Manual Choices (Only if Auto is unchecked) */}
                              {!autoModelSelection && (
                                <div className="flex rounded-lg p-0.5 bg-gray-950 border border-white/10">
                                  <button 
                                    onClick={() => setManualModelChoice('flash')}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${manualModelChoice === 'flash' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                                  >
                                    Force Flash
                                  </button>
                                  <button 
                                    onClick={() => setManualModelChoice('pro')}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${manualModelChoice === 'pro' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                                  >
                                    Force Pro
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Quick Clean Card */}
                          <div className="glass-panel p-6 border-blue-500/10 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(37,99,235,0.05)] transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                                  <Cpu size={24} className="text-blue-400"/>
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  gemini-2.0-flash
                                </span>
                              </div>
                              <h3 className="text-lg font-bold text-white mb-2">Quick Clean</h3>
                              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Perform fast automated preprocessing: drop duplicate rows, fill missing values intelligently, trim text paddings, normalize column names, and fix mixed datatypes.
                              </p>
                              <ul className="text-xs text-gray-400 space-y-2 mb-6">
                                <li className="flex items-center gap-2"><Check size={12} className="text-blue-500"/> Remove duplicate records</li>
                                <li className="flex items-center gap-2"><Check size={12} className="text-blue-500"/> Fill missing values (Median/Mode)</li>
                                <li className="flex items-center gap-2"><Check size={12} className="text-blue-500"/> Normalize column headers to snake_case</li>
                                <li className="flex items-center gap-2"><Check size={12} className="text-blue-500"/> Generate reusable Pandas cleaning code</li>
                              </ul>
                            </div>
                            <button 
                              onClick={handleQuickClean}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-[0_4px_20px_rgba(37,99,235,0.2)] flex items-center justify-center gap-2"
                            >
                              Start Quick Clean
                            </button>
                          </div>

                          {/* Deep Clean Card */}
                          <div className="glass-panel p-6 border-purple-500/10 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.05)] transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                                  <Sparkles size={24} className="text-purple-400"/>
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  gemini-2.5-pro
                                </span>
                              </div>
                              <h3 className="text-lg font-bold text-white mb-2">Deep Clean AI</h3>
                              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Run advanced ML-readiness audits, anomaly scans, skewness modeling, target leakage checks, class imbalances detection, and receive full dataset quality reports.
                              </p>
                              <ul className="text-xs text-gray-400 space-y-2 mb-6">
                                <li className="flex items-center gap-2"><Check size={12} className="text-purple-500"/> ML Readiness & leakage analysis</li>
                                <li className="flex items-center gap-2"><Check size={12} className="text-purple-500"/> Anomaly & statistical outlier detection</li>
                                <li className="flex items-center gap-2"><Check size={12} className="text-purple-500"/> Dark-theme analytical chart generation</li>
                                <li className="flex items-center gap-2"><Check size={12} className="text-purple-500"/> Quality rating & health score report</li>
                              </ul>
                            </div>
                            <button 
                              onClick={handleDeepClean}
                              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-all shadow-[0_4px_20px_rgba(168,85,247,0.2)] flex items-center justify-center gap-2"
                            >
                              Run Deep Clean AI
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                      {/* Quick Clean Loading State */}
                      {cleaningLoading && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-4 border-cyan-500/10 border-t-cyan-500 animate-spin" style={{animationDuration: '1.5s', animationDirection: 'reverse'}}></div>
                            <Sparkles size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse"/>
                          </div>
                          <h3 className="text-lg font-semibold text-white">Quick Cleaning in progress...</h3>
                          <p className="text-sm max-w-sm text-center mt-2 leading-relaxed">
                            Removing duplicates, resolving missing elements, formatting types, and generating optimal pandas routines.
                          </p>
                        </div>
                      )}

                      {/* Deep Clean Loading State */}
                      {deepCleaningLoading && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-4 border-pink-500/10 border-t-pink-500 animate-spin" style={{animationDuration: '1.5s', animationDirection: 'reverse'}}></div>
                            <Cpu size={24} className="absolute inset-0 m-auto text-purple-400 animate-pulse"/>
                          </div>
                          <h3 className="text-lg font-semibold text-white">Gemini 2.5 Pro Auditing Dataset...</h3>
                          <p className="text-sm max-w-sm text-center mt-2 leading-relaxed">
                            Evaluating health metrics, compiling statistical anomalies, plotting charts, and scanning for target leaks.
                          </p>
                        </div>
                      )}

                      {/* Quick Clean Results Screen */}
                      {quickCleanData && !cleaningLoading && (
                        <motion.div initial={{opacity:0, y: 15}} animate={{opacity:1, y:0}} className="space-y-6">
                          {/* Success Banner */}
                          <div className="glass-panel p-6 border-emerald-500/20 bg-emerald-500/5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Check size={20}/>
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-white">Dataset Preprocessed Successfully</h3>
                                <p className="text-xs text-gray-400 mt-0.5 font-sans">Active workspace switched to the cleaned dataset version.</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 self-end md:self-center">
                              <button 
                                onClick={() => downloadCleanedCsv(quickCleanData.downloadCsvBase64, quickCleanData.filename + '.csv')}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                              >
                                <Download size={14}/> Download Cleaned CSV
                              </button>
                              {!deepCleanData && (
                                <button 
                                  onClick={handleDeepClean}
                                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                                >
                                  <Sparkles size={14}/> Deep Clean AI
                                </button>
                              )}
                              <button 
                                onClick={() => { setQuickCleanData(null); setDeepCleanData(null); }}
                                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Reset Clean
                              </button>
                            </div>
                          </div>

                          {/* Stats and Code Split */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Left column: Before vs After stats */}
                            <div className="glass-panel p-6 lg:col-span-1 space-y-6">
                              <h4 className="font-bold text-xs uppercase tracking-widest text-gray-400 border-b border-white/5 pb-3">Cleaning Summary</h4>
                              
                              <div className="space-y-4">
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">Rows Count</span>
                                    <span className="text-white font-medium">{quickCleanData.before_stats.rows} &rarr; {quickCleanData.after_stats.rows}</span>
                                  </div>
                                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full" style={{width: `${Math.max(10, (quickCleanData.after_stats.rows / quickCleanData.before_stats.rows) * 100)}%`}}></div>
                                  </div>
                                  {quickCleanData.before_stats.rows - quickCleanData.after_stats.rows > 0 && (
                                    <p className="text-[10px] text-red-400 mt-1">-{quickCleanData.before_stats.rows - quickCleanData.after_stats.rows} empty/duplicate rows removed</p>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                  <div className="bg-gray-800/50 rounded-xl p-3 border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Duplicates Removed</p>
                                    <p className="text-xl font-bold text-white mt-1">{quickCleanData.before_stats.duplicates}</p>
                                  </div>
                                  <div className="bg-gray-800/50 rounded-xl p-3 border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Missing Fixed</p>
                                    <p className="text-xl font-bold text-white mt-1">{quickCleanData.before_stats.missing}</p>
                                  </div>
                                  <div className="bg-gray-800/50 rounded-xl p-3 border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Outliers Flagged</p>
                                    <p className="text-xl font-bold text-white mt-1">{quickCleanData.before_stats.outliers}</p>
                                  </div>
                                  <div className="bg-gray-800/50 rounded-xl p-3 border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Headers Fixed</p>
                                    <p className="text-xl font-bold text-white mt-1">{quickCleanData.stats.columns_normalized}</p>
                                  </div>
                                </div>

                                {/* Datatype changes list */}
                                {quickCleanData.stats.datatype_changes && quickCleanData.stats.datatype_changes.length > 0 && (
                                  <div className="pt-2 border-t border-white/5">
                                    <p className="text-xs font-semibold text-gray-300 mb-2">Datatype Adjustments</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                      {quickCleanData.stats.datatype_changes.map((change, idx) => (
                                        <div key={idx} className="text-[10px] bg-gray-800/30 px-2 py-1 rounded border border-white/5 text-gray-400 truncate">
                                          {change}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right column: AI Code & recommendations */}
                            <div className="glass-panel p-6 lg:col-span-2 space-y-6">
                              {/* AI insights & summary */}
                              <div>
                                <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Sparkles size={14} className="text-blue-400"/> AI Preprocessing Report
                                </h4>
                                <div className="text-sm text-gray-300 bg-gray-850/50 border border-white/5 rounded-xl p-4 leading-relaxed whitespace-pre-line">
                                  {quickCleanData.ai_report.cleaned_dataset_summary}
                                </div>
                              </div>

                              {/* Pandas Code generation */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <Code size={14} className="text-blue-400"/> Reusable Pandas Cleaning Code
                                  </h4>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(quickCleanData.ai_report.pandas_cleaning_code);
                                      alert("Copied code to clipboard!");
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                                  >
                                    Copy Code
                                  </button>
                                </div>
                                <pre className="bg-black/80 rounded-xl p-4 text-[11px] font-mono text-cyan-400 border border-white/5 overflow-x-auto max-h-56 leading-relaxed">
                                  <code>{quickCleanData.ai_report.pandas_cleaning_code}</code>
                                </pre>
                              </div>

                              {/* Recommendations list */}
                              {quickCleanData.ai_report.recommendations && (
                                <div>
                                  <h4 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-2">AI Optimization Recommendations</h4>
                                  <ul className="text-xs text-gray-400 space-y-1.5 pl-4 list-disc">
                                    {quickCleanData.ai_report.recommendations.map((rec, idx) => (
                                      <li key={idx} className="leading-relaxed">{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Deep Clean AI Results Screen */}
                      {deepCleanData && !deepCleaningLoading && (
                        <motion.div initial={{opacity:0, y: 15}} animate={{opacity:1, y:0}} className="space-y-6">
                          {/* Success Banner */}
                          <div className="glass-panel p-6 border-purple-500/20 bg-purple-500/5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse">
                                <Sparkles size={20}/>
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-white">AI Deep Clean & ML Audit Complete</h3>
                                <p className="text-xs text-gray-400 mt-0.5 font-sans">Statistical distributions, quality indices, and insights calculated.</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 self-end md:self-center">
                              {quickCleanData?.downloadCsvBase64 && (
                                <button 
                                  onClick={() => downloadCleanedCsv(quickCleanData.downloadCsvBase64, 'cleaned_dataset.csv')}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                                >
                                  <Download size={14}/> Download Cleaned CSV
                                </button>
                              )}
                              <button 
                                onClick={() => { setQuickCleanData(null); setDeepCleanData(null); }}
                                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Reset Audit
                              </button>
                            </div>
                          </div>

                          {/* Health Score & Key Audits Row */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Dataset Health Score Card */}
                            <div className="glass-panel p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-3xl rounded-full"></div>
                              <h4 className="font-bold text-xs uppercase tracking-widest text-gray-400 mb-6">Dataset Quality Score</h4>
                              
                              {/* Circular Gauge */}
                              <div className="relative w-36 h-36 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1f2937" strokeWidth="6" />
                                  <circle 
                                    cx="50" cy="50" r="40" fill="transparent" 
                                    stroke={deepCleanData.health_score >= 80 ? "#10b981" : deepCleanData.health_score >= 50 ? "#f59e0b" : "#ef4444"} 
                                    strokeWidth="6" 
                                    strokeDasharray="251.2" 
                                    strokeDashoffset={251.2 - (251.2 * deepCleanData.health_score) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                  />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                  <span className="text-4xl font-extrabold text-white tracking-tighter">{deepCleanData.health_score}</span>
                                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">/ 100</span>
                                </div>
                              </div>

                              <p className="text-xs text-gray-400 mt-6 leading-relaxed max-w-xs">
                                {deepCleanData.analysis.health_explanation}
                              </p>
                            </div>

                            {/* Deductions & Quality Profile */}
                            <div className="glass-panel p-6 lg:col-span-2 space-y-6">
                              <h4 className="font-bold text-xs uppercase tracking-widest text-gray-400 border-b border-white/5 pb-3">Dataset Health Audit Details</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Total Cells</span>
                                    <span className="text-white font-medium">{(dataInfo?.rowCount * dataInfo?.colCount).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Missing values cell-pct</span>
                                    <span className={`font-medium ${deepCleanData.health_details.null_pct > 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                                      {deepCleanData.health_details.null_pct.toFixed(2)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Total duplicate rows</span>
                                    <span className="text-white font-medium">{deepCleanData.health_details.dup_count}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Skewed numerical features</span>
                                    <span className="text-white font-medium">{deepCleanData.health_details.skewed_columns_count}</span>
                                  </div>
                                </div>

                                <div className="border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 space-y-2">
                                  <span className="text-xs font-semibold text-gray-300 block mb-1">Deduction Criteria Logs</span>
                                  {deepCleanData.health_details.deductions.length === 0 ? (
                                    <p className="text-xs text-emerald-400 flex items-center gap-1"><Check size={12}/> No score deductions applied! Clean dataset.</p>
                                  ) : (
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {deepCleanData.health_details.deductions.map((ded, idx) => (
                                        <div key={idx} className="text-[10px] text-red-400 bg-red-500/5 px-2 py-1 rounded border border-red-500/10 flex items-center gap-1.5">
                                          <AlertCircle size={10}/> {ded}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Deep Clean Visualizations Panel */}
                          {deepCleanData.charts && Object.keys(deepCleanData.charts).length > 0 && (
                            <div className="glass-panel p-6 space-y-6">
                              <h4 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                                <BarChart3 size={16} className="text-purple-400"/> AI Generated Analytics Dashboard
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {deepCleanData.charts.correlation_heatmap && (
                                  <div className="rounded-2xl border border-white/5 bg-gray-950 p-4 flex flex-col items-center">
                                    <img src={`data:image/png;base64,${deepCleanData.charts.correlation_heatmap}`} alt="Correlation Matrix" className="max-w-full rounded-lg mix-blend-screen" />
                                    <p className="text-xs text-gray-500 mt-2 font-medium">Correlation Heatmap</p>
                                  </div>
                                )}
                                
                                {deepCleanData.charts.missing_values_bar && (
                                  <div className="rounded-2xl border border-white/5 bg-gray-950 p-4 flex flex-col items-center">
                                    <img src={`data:image/png;base64,${deepCleanData.charts.missing_values_bar}`} alt="Missing values profile" className="max-w-full rounded-lg mix-blend-screen" />
                                    <p className="text-xs text-gray-500 mt-2 font-medium">Missing Values by Feature</p>
                                  </div>
                                )}
                                
                                {deepCleanData.charts.outlier_boxplot && (
                                  <div className="rounded-2xl border border-white/5 bg-gray-950 p-4 flex flex-col items-center">
                                    <img src={`data:image/png;base64,${deepCleanData.charts.outlier_boxplot}`} alt="Outliers Boxplot" className="max-w-full rounded-lg mix-blend-screen" />
                                    <p className="text-xs text-gray-500 mt-2 font-medium">Outlier Spread (Scaled)</p>
                                  </div>
                                )}
                                
                                {deepCleanData.charts.skewness_density && (
                                  <div className="rounded-2xl border border-white/5 bg-gray-950 p-4 flex flex-col items-center">
                                    <img src={`data:image/png;base64,${deepCleanData.charts.skewness_density}`} alt="Skewness Plot" className="max-w-full rounded-lg mix-blend-screen" />
                                    <p className="text-xs text-gray-500 mt-2 font-medium">Feature Skewness Distribution</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Expandable Anomaly and Preprocessing Details */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Left Column: Anomalies & Feature engineering */}
                            <div className="space-y-6">
                              {/* Anomalies Card */}
                              <div className="glass-panel p-6 space-y-4">
                                <h4 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <ShieldAlert size={14} className="text-red-400"/> Statistical Anomalies Detected
                                </h4>
                                <div className="space-y-2">
                                  {deepCleanData.analysis.anomalies.map((anom, idx) => (
                                    <div key={idx} className="bg-gray-800/40 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                                      <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0"/>
                                      <p className="text-xs text-gray-300 leading-relaxed font-sans">{anom}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Feature Engineering Suggestions */}
                              <div className="glass-panel p-6 space-y-4">
                                <h4 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <Cpu size={14} className="text-purple-400"/> Feature Engineering Suggestions
                                </h4>
                                <div className="space-y-2">
                                  {deepCleanData.analysis.feature_engineering_suggestions.map((idea, idx) => (
                                    <div key={idx} className="bg-gray-800/40 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                                      <Sparkles size={14} className="text-purple-400 mt-0.5 shrink-0"/>
                                      <p className="text-xs text-gray-300 leading-relaxed font-sans">{idea}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Right Column: Preprocessing Pipelines & Insights */}
                            <div className="space-y-6">
                              {/* Preprocessing Recommendation */}
                              <div className="glass-panel p-6 space-y-4">
                                <h4 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <Check size={14} className="text-green-400"/> Recommended Preprocessing Strategy
                                </h4>
                                <div className="space-y-2">
                                  {deepCleanData.analysis.preprocessing_recommendations.map((rec, idx) => (
                                    <div key={idx} className="bg-gray-800/40 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0"></div>
                                      <p className="text-xs text-gray-300 leading-relaxed font-sans">{rec}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Target leakage & ML readiness */}
                              <div className="glass-panel p-6 space-y-4">
                                <h4 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <Heart size={14} className="text-pink-400"/> ML Readiness & Target Leakage Scan
                                </h4>
                                <div className="text-xs text-gray-300 bg-gray-800/30 border border-white/5 rounded-xl p-4 leading-relaxed font-sans">
                                  {deepCleanData.analysis.target_leakage_and_ml_readiness}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-gray-800/20 p-3 rounded-lg border border-white/5">
                                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Skewness Profile</span>
                                    <p className="text-xs text-gray-300 mt-1 truncate font-sans">{deepCleanData.analysis.skewness_analysis}</p>
                                  </div>
                                  <div className="bg-gray-800/20 p-3 rounded-lg border border-white/5">
                                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Category Imbalance</span>
                                    <p className="text-xs text-gray-300 mt-1 truncate font-sans">{deepCleanData.analysis.imbalance_analysis}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Business Insights */}
                              <div className="glass-panel p-6 space-y-4">
                                <h4 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                                  <BarChart2 size={14} className="text-yellow-400"/> Business Insights Extracted
                                </h4>
                                <div className="space-y-2">
                                  {deepCleanData.analysis.business_insights.map((insight, idx) => (
                                    <div key={idx} className="bg-gray-800/40 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shrink-0"></div>
                                      <p className="text-xs text-gray-300 leading-relaxed font-sans">{insight}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                 )}
              </div>
              
              {/* RIGHT DASHBOARD PANEL */}
              <div className="w-[380px] shrink-0 border-l border-white/5 bg-gray-950/50 backdrop-blur-sm p-4 overflow-y-auto hidden lg:flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-white tracking-widest uppercase flex items-center gap-2"><LayoutDashboard size={16} className="text-blue-500"/> Visuals</h3>
                </div>

                {chartGallery.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                       <BarChart3 size={48} className="mb-4" />
                       <p className="text-sm">No analysis charts yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                      {selectedChart && (
                        <div className="rounded-2xl border border-white/5 bg-gray-800 overflow-hidden shadow-xl p-3 relative group">
                          <div className="bg-black rounded-xl overflow-hidden relative cursor-pointer" onClick={()=>setModalOpen(true)}>
                             <img src={`data:image/png;base64,${selectedChart.image}`} alt="Preview" className="w-full mix-blend-screen opacity-90 group-hover:opacity-100 transition-opacity" />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Maximize2 className="text-white drop-shadow-md" size={32}/>
                             </div>
                          </div>
                          <div className="pt-3 px-1 flex justify-between items-start gap-2">
                             <div>
                               <p className="text-sm font-medium text-white leading-tight mb-1">{selectedChart.title}</p>
                               <p className="text-[10px] text-gray-500 uppercase tracking-wider">{new Date(selectedChart.createdAt).toLocaleTimeString()}</p>
                             </div>
                             <button onClick={()=>downloadChart(selectedChart.image, selectedChart.title)} className="p-2 bg-white/5 hover:bg-blue-600/20 hover:text-blue-500 rounded-lg transition-colors cursor-pointer">
                                <Download size={16}/>
                             </button>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Recent Gallery</h4>
                        <div className="grid grid-cols-2 gap-3">
                           {chartGallery.map(chart => (
                             <div key={chart.id} onClick={()=>setSelectedChart(chart)} className={`cursor-pointer rounded-xl overflow-hidden border-2 relative h-24 ${selectedChart?.id===chart.id ? 'border-blue-500' : 'border-transparent hover:border-white/20'}`}>
                               <img src={`data:image/png;base64,${chart.image}`} className="w-full h-full object-cover mix-blend-screen bg-black" alt="thumb"/>
                               <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-[10px] truncate font-medium text-white">{chart.title}</div>
                             </div>
                           ))}
                        </div>
                      </div>
                    </div>
                )}
              </div>
          </div>
        )}
      </div>

      {/* FULLSCREEN MODAL OVERLAY */}
      <AnimatePresence>
        {modalOpen && selectedChart && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-8" onClick={()=>setModalOpen(false)}>
            <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} className="relative bg-gray-950 rounded-3xl border border-white/10 p-6 flex flex-col items-center shadow-[0_0_100px_rgba(0,122,255,0.15)] max-w-[90vw]" onClick={e=>e.stopPropagation()}>
              <button className="absolute -top-4 -right-4 w-10 h-10 bg-gray-800 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white cursor-pointer" onClick={()=>setModalOpen(false)}><X size={20}/></button>
              <h2 className="text-xl font-semibold mb-6 text-white text-center">{selectedChart.title}</h2>
              <div className="bg-black/50 p-4 rounded-2xl w-full flex justify-center border border-white/5">
                <img src={`data:image/png;base64,${selectedChart.image}`} style={{maxHeight:'65vh'}} className="mix-blend-screen rounded-lg" alt="Full" />
              </div>
              <button className="glass-button mt-6 flex items-center gap-2 cursor-pointer" onClick={()=>downloadChart(selectedChart.image, selectedChart.title)}>
                <Download size={18}/> Download High-Resolution
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
