import React from 'react';
import { MessageSquare, Database, BarChart3, Settings, Compass, Sparkles, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ collapsed, setCollapsed, activeTab, setActiveTab, onNewAnalysis }) {
  const menuItems = [
    { id: 'chat', icon: MessageSquare, label: 'Chat with Data' },
    { id: 'clean', icon: Sparkles, label: 'AI Clean & Health' },
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'preview', icon: Database, label: 'Data Preview' },
    { id: 'reports', icon: Compass, label: 'Reports' },
  ];

  return (
    <motion.div 
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-black border-r border-white/5 flex flex-col shrink-0 transition-all duration-300 relative z-30"
    >
      <div className="h-16 px-4 flex items-center gap-3 border-b border-white/5">
        <Sparkles className="text-blue-500 shrink-0" size={28} />
        {!collapsed && <span className="font-bold text-lg tracking-tight text-white whitespace-nowrap overflow-hidden">Obsidian.ai</span>}
      </div>

      <div className="px-3 mt-6 flex-1">
        <button 
          onClick={onNewAnalysis}
          className="w-full glass-button flex items-center justify-center gap-2 mb-6 h-10 shadow-lg hover:bg-white/10 transition-colors"
        >
          <Zap size={16} className={collapsed ? '' : 'shrink-0 text-yellow-300'} />
          {!collapsed && <span className="whitespace-nowrap">New Analysis</span>}
        </button>

        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive ? 'bg-blue-600/20 text-blue-500 font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                title={item.label}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="text-sm whitespace-nowrap overflow-hidden">{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-3 shrink-0">
        <button 
          onClick={() => alert("Settings configuration coming soon!")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 w-full mb-4 transition-all"
        >
          <Settings size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Settings</span>}
        </button>
        
        {!collapsed ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 to-cyan-500/5 border border-blue-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/20 blur-2xl rounded-full"></div>
            <h4 className="text-white text-sm font-semibold mb-1">Upgrade to Pro</h4>
            <p className="text-xs text-gray-400 mb-3 leading-relaxed">Unlock GPT-4o vision and advanced forecasting.</p>
            <button 
              onClick={() => alert("Redirecting to billing portal...")}
              className="w-full py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-gray-200 transition shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
              Upgrade Plan
            </button>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600/20 to-transparent flex items-center justify-center border border-white/5">
                <Zap size={18} className="text-blue-500" />
             </div>
          </div>
        )}
      </div>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-20 w-7 h-7 rounded-full bg-gray-950 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white shadow-lg hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.div>
  );
}
