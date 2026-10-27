import React from 'react';
import { Search, Bell } from 'lucide-react';

export default function Navbar({ dataInfo, onSheetSelect }) {
  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search workspace..." 
            className="w-full bg-gray-800 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {dataInfo && (
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-white/5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            {dataInfo.filename}
            {dataInfo.isMultiSheet && dataInfo.sheets && (
              <select 
                className="ml-2 bg-gray-900 border border-white/10 text-white text-xs rounded-md px-2 py-1 outline-none"
                value={dataInfo.datasetId}
                onChange={(e) => {
                  const selected = dataInfo.sheets.find(s => s.datasetId === e.target.value);
                  if (selected && onSheetSelect) {
                    onSheetSelect(selected);
                  }
                }}
              >
                {dataInfo.sheets.map(s => (
                  <option key={s.datasetId} value={s.datasetId}>{s.sheetName}</option>
                ))}
              </select>
            )}
          </div>
        )}
        
        <button 
          onClick={() => alert("No new notifications")}
          className="text-gray-400 hover:text-white transition-colors relative"
        >
          <Bell size={20} />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-surface rounded-full"></span>
        </button>
        
        <div 
          onClick={() => alert("User profile coming soon!")}
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-sm font-bold text-white shadow-lg cursor-pointer hover:opacity-90 transition"
        >
          JD
        </div>
      </div>
    </header>
  );
}
