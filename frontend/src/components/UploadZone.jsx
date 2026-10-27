import React from 'react';
import { UploadCloud } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UploadZone({ onUpload, loading }) {
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-panel p-16 max-w-2xl w-full mx-auto text-center border-dashed border-2 border-blue-500/30 hover:border-blue-500 transition-all cursor-pointer relative overflow-hidden group shadow-[0_0_50px_rgba(0,122,255,0.05)] hover:shadow-[0_0_80px_rgba(0,122,255,0.1)]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileUpload').click()}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/0 to-primary-container/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-800 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl">
                <UploadCloud size={32} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Upload your dataset</h2>
            <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto leading-relaxed">
              Drag and drop your CSV, Excel, or JSON files here. Our agent will automatically format, clean, and profile your data securely in the browser.
            </p>
            
            <button className="glass-button relative z-10 px-8 py-3 text-sm tracking-wide" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Parsing...
                </span>
              ) : 'Browse Local Files'}
            </button>
        </div>
        
        <input 
          id="fileUpload" 
          type="file" 
          className="hidden" 
          accept=".csv,.xlsx,.xls,.json"
          onChange={(e) => onUpload(e.target.files[0])}
        />
      </motion.div>
    </div>
  );
}
