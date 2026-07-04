/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { textToBinary, binaryToText } from './utils/converter';
import { 
  Binary, 
  Type, 
  ArrowLeftRight, 
  Copy, 
  Check, 
  Trash2, 
  AlertCircle, 
  Info, 
  Sparkles,
  History,
  Download,
  ClipboardPaste,
  Cpu,
  RefreshCw
} from 'lucide-react';

interface HistoryItem {
  id: string;
  timestamp: string;
  mode: 'textToBinary' | 'binaryToText';
  input: string;
  output: string;
}

export default function App() {
  // Application State
  const [mode, setMode] = useState<'textToBinary' | 'binaryToText'>('textToBinary');
  const [inputVal, setInputVal] = useState<string>('');
  const [outputVal, setOutputVal] = useState<string>('');
  const [separator, setSeparator] = useState<string>(' ');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [pasted, setPasted] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    chars: 0,
    bytes: 0,
    bits: 0,
  });

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('utf8_binary_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  // Save history helper
  const addToHistory = (modeType: 'textToBinary' | 'binaryToText', input: string, output: string) => {
    if (!input.trim() || !output.trim()) return;
    
    // Avoid adding exact duplicate as the most recent entry
    if (history.length > 0 && history[0].input === input && history[0].mode === modeType) {
      return;
    }

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      mode: modeType,
      input: input.length > 100 ? input.slice(0, 100) + '...' : input,
      output: output.length > 100 ? output.slice(0, 100) + '...' : output,
    };

    const updatedHistory = [newItem, ...history.slice(0, 9)]; // Keep last 10 entries
    setHistory(updatedHistory);
    try {
      localStorage.setItem('utf8_binary_history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('utf8_binary_history');
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  };

  // Run conversion whenever input, mode, or separator changes
  useEffect(() => {
    if (!inputVal) {
      setOutputVal('');
      setError(null);
      setStats({ chars: 0, bytes: 0, bits: 0 });
      return;
    }

    if (mode === 'textToBinary') {
      const binary = textToBinary(inputVal, separator);
      setOutputVal(binary);
      setError(null);

      // Calculate stats
      const encoder = new TextEncoder();
      const encodedBytes = encoder.encode(inputVal);
      setStats({
        chars: [...inputVal].length, // Unicode aware length
        bytes: encodedBytes.length,
        bits: encodedBytes.length * 8,
      });
    } else {
      const result = binaryToText(inputVal);
      if (result.success) {
        setOutputVal(result.text);
        setError(null);

        // Calculate stats
        const encoder = new TextEncoder();
        const encodedBytes = encoder.encode(result.text);
        setStats({
          chars: [...result.text].length,
          bytes: encodedBytes.length,
          bits: encodedBytes.length * 8,
        });
      } else {
        setOutputVal('');
        setError(result.error || 'Formato binario inválido');
        setStats({ chars: 0, bytes: 0, bits: 0 });
      }
    }
  }, [inputVal, mode, separator]);

  // Debounce adding to history to avoid cluttered logs
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }

    if (inputVal && outputVal && !error) {
      historyTimeoutRef.current = setTimeout(() => {
        addToHistory(mode, inputVal, outputVal);
      }, 3000); // Wait 3s of idle to register in history
    }

    return () => {
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    };
  }, [inputVal, outputVal, mode, error]);

  // Swap Conversion Direction
  const handleSwap = () => {
    const newMode = mode === 'textToBinary' ? 'binaryToText' : 'textToBinary';
    setMode(newMode);
    
    // Swap contents if valid
    if (!error && outputVal) {
      setInputVal(outputVal);
    } else {
      setInputVal('');
    }
  };

  // Copy to Clipboard
  const handleCopy = async () => {
    if (!outputVal) return;
    try {
      await navigator.clipboard.writeText(outputVal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('No se pudo copiar el texto', err);
    }
  };

  // Paste from Clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputVal(text);
        setPasted(true);
        setTimeout(() => setPasted(false), 1500);
      }
    } catch (err) {
      console.error('No se pudo leer del portapapeles', err);
    }
  };

  // Clear Input and Output
  const handleClear = () => {
    setInputVal('');
    setOutputVal('');
    setError(null);
  };

  // Load Preset Example
  const loadPreset = (presetText: string, presetMode: 'textToBinary' | 'binaryToText') => {
    setMode(presetMode);
    setInputVal(presetText);
  };

  // Export Data to .txt file
  const handleExport = () => {
    if (!outputVal) return;
    const element = document.createElement("a");
    const file = new Blob([outputVal], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `bit_translator_${mode === 'textToBinary' ? 'binary' : 'text'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Byte blocks representation for visualizer (max 6 bytes to avoid clutter)
  const getByteVisualizerData = () => {
    if (mode === 'textToBinary') {
      if (!inputVal) return [];
      const encoder = new TextEncoder();
      const bytes = encoder.encode(inputVal);
      return Array.from(bytes).slice(0, 6).map((byteValue, index) => {
        let charRepr = '';
        try {
          charRepr = new TextDecoder().decode(new Uint8Array([byteValue]));
          if (byteValue < 32 || (byteValue >= 127 && byteValue < 160)) {
            charRepr = '▫️';
          }
        } catch {
          charRepr = '';
        }
        
        const binaryStr = byteValue.toString(2).padStart(8, '0');
        return {
          index: index + 1,
          char: charRepr,
          decimal: byteValue,
          hex: '0x' + byteValue.toString(16).toUpperCase().padStart(2, '0'),
          bits: binaryStr.split(''),
        };
      });
    } else {
      if (!outputVal || error) return [];
      const encoder = new TextEncoder();
      const bytes = encoder.encode(outputVal);
      return Array.from(bytes).slice(0, 6).map((byteValue, index) => {
        let charRepr = '';
        try {
          charRepr = new TextDecoder().decode(new Uint8Array([byteValue]));
          if (byteValue < 32 || (byteValue >= 127 && byteValue < 160)) {
            charRepr = '▫️';
          }
        } catch {
          charRepr = '';
        }
        
        const binaryStr = byteValue.toString(2).padStart(8, '0');
        return {
          index: index + 1,
          char: charRepr,
          decimal: byteValue,
          hex: '0x' + byteValue.toString(16).toUpperCase().padStart(2, '0'),
          bits: binaryStr.split(''),
        };
      });
    }
  };

  const byteBlocks = getByteVisualizerData();

  return (
    <div id="app-container" className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Sleek Tech Ambient Accents */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-slate-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Container styled to Sleek Interface specifications */}
      <header className="relative border-b border-white/5 bg-slate-900/60 backdrop-blur-md px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Cyan glowing launcher logo */}
            <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.45)]">
              <svg className="w-6 h-6 text-slate-950" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                B-TRANS <span className="text-cyan-500 font-bold">V2.0</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                UTF-8 / Binary Converter
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-center">
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Velocidad</span>
              <span className="text-xs font-mono text-cyan-400 font-bold">0.002ms</span>
            </div>
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-300 font-bold">ACTIVO</span>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-10 space-y-8">
        
        {/* Toggle Mode Selector in Center */}
        <div className="flex justify-center items-center">
          <div className="glass p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl">
            <button
              onClick={() => {
                if (mode !== 'textToBinary') {
                  setMode('textToBinary');
                  setInputVal('');
                  setOutputVal('');
                  setError(null);
                }
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                mode === 'textToBinary'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] font-black scale-102'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Type className="h-4 w-4" />
              <span>Texto ➜ Binario</span>
            </button>

            <button
              onClick={handleSwap}
              className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 active:scale-90 transition-all duration-200"
              title="Intercambiar dirección"
            >
              <ArrowLeftRight className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => {
                if (mode !== 'binaryToText') {
                  setMode('binaryToText');
                  setInputVal('');
                  setOutputVal('');
                  setError(null);
                }
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                mode === 'binaryToText'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] font-black scale-102'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Binary className="h-4 w-4" />
              <span>Binario ➜ Texto</span>
            </button>
          </div>
        </div>

        {/* Translation workspace (Dual textareas with sleek glass styling) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Input Panel */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">
                {mode === 'textToBinary' ? 'Entrada UTF-8' : 'Entrada Binaria'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePaste}
                  className="text-[10px] uppercase font-bold text-slate-500 hover:text-cyan-400 px-2.5 py-1 rounded bg-slate-800/30 border border-white/5 hover:border-cyan-500/20 transition-all"
                >
                  {pasted ? '¡Pegado!' : 'Pegar'}
                </button>
                {inputVal && (
                  <button
                    onClick={handleClear}
                    className="text-[10px] uppercase font-bold text-slate-500 hover:text-rose-400 px-2.5 py-1 rounded bg-slate-800/30 border border-white/5 hover:border-rose-500/20 transition-all"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 glass p-6 rounded-2xl flex flex-col min-h-[250px] relative transition-all duration-300 hover:border-white/15 focus-within:border-cyan-500/30 focus-within:ring-1 focus-within:ring-cyan-500/10">
              <textarea
                id="input-text-area"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={
                  mode === 'textToBinary'
                    ? 'Escribe o pega tu texto en UTF-8 aquí...'
                    : 'Escribe o pega tus bytes binarios aquí (ej. 01001000 01101111 01101100 01100001)...'
                }
                className={`flex-1 bg-transparent border-none outline-none resize-none text-xl leading-relaxed text-slate-100 placeholder-slate-600 focus:outline-none ${
                  mode === 'binaryToText' ? 'font-mono tracking-wider' : ''
                }`}
              />

              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <p>
                  RECUENTO:{' '}
                  <span className="text-slate-300 font-mono">
                    {mode === 'textToBinary' ? stats.chars : inputVal.replace(/[^01]/g, '').length}
                  </span>
                </p>
                <p>
                  TIPO:{' '}
                  <span className="text-slate-300">
                    {mode === 'textToBinary' ? 'UTF-8 TEXT' : 'BINARY BITS'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Output Panel */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">
                {mode === 'textToBinary' ? 'Resultado Binario' : 'Resultado UTF-8'}
              </h2>
              <div className="flex gap-2">
                {outputVal && (
                  <button
                    onClick={handleCopy}
                    className="text-[10px] uppercase font-bold text-slate-500 hover:text-cyan-400 px-2.5 py-1 rounded bg-slate-800/30 border border-white/5 hover:border-cyan-500/20 transition-all"
                  >
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 glass p-6 rounded-2xl flex flex-col bg-slate-900/50 min-h-[250px] transition-all duration-300 hover:border-white/15">
              <div className="flex-1 overflow-y-auto pr-2">
                {error ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-3">
                    <AlertCircle className="h-10 w-10 text-rose-400 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-rose-200 uppercase tracking-wide">Error de decodificación</p>
                      <p className="text-[11px] text-rose-400/80 max-w-sm font-mono">{error}</p>
                    </div>
                  </div>
                ) : outputVal ? (
                  <p className={`leading-relaxed break-all whitespace-pre-wrap ${
                    mode === 'textToBinary' ? 'font-mono text-cyan-400 text-lg' : 'text-xl text-slate-100'
                  }`}>
                    {outputVal}
                  </p>
                ) : (
                  <p className="text-slate-600 italic text-sm">El resultado de la traducción aparecerá aquí...</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <p>
                  {mode === 'textToBinary' ? (
                    <>BITS: <span className="text-slate-300 font-mono">{stats.bits}</span></>
                  ) : (
                    <>CARACTERES: <span className="text-slate-300 font-mono">{stats.chars}</span></>
                  )}
                </p>
                <p>
                  PARIDAD: <span className="text-slate-300 font-mono">NINGUNA</span>
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Sleek Tool Options Bar (from Design HTML Footer elements) */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 glass p-5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-6 justify-between">
            
            <div className="flex-1 min-w-[120px]">
              <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-2">Intercambiar</p>
              <button 
                onClick={handleSwap}
                className="w-full py-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-white/5 text-xs font-bold transition-all uppercase tracking-wider text-slate-200 flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                <span>{mode === 'textToBinary' ? 'UTF-8 ➜ Binario' : 'Binario ➜ UTF-8'}</span>
              </button>
            </div>

            <div className="w-px h-10 bg-white/10 hidden sm:block"></div>

            <div className="flex-1 min-w-[150px]">
              <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-2">Separador de bytes</p>
              <div className="relative">
                <select
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  disabled={mode === 'binaryToText'}
                  className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-white/5 text-xs font-bold transition-all uppercase tracking-wider text-slate-200 appearance-none focus:outline-none focus:border-cyan-500/40 text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value=" ">Un Espacio</option>
                  <option value=",">Coma ( , )</option>
                  <option value="-">Guion ( - )</option>
                  <option value="">Sin espacio</option>
                  <option value="\n">Salto de línea</option>
                </select>
              </div>
            </div>

            <div className="w-px h-10 bg-white/10 hidden sm:block"></div>

            <div className="flex-1 min-w-[120px]">
              <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1.5">Auto-Traducción</p>
              <div className="flex items-center gap-2.5 py-1.5">
                <div className="w-10 h-5 bg-cyan-500 rounded-full relative shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                </div>
                <span className="text-[11px] font-black tracking-widest text-cyan-400">HABILITADA</span>
              </div>
            </div>

          </div>

          <div className="w-full md:w-64 glass p-5 rounded-2xl flex items-center justify-center">
            <button 
              onClick={handleExport}
              disabled={!outputVal || !!error}
              className="w-full h-full py-3 bg-cyan-500 text-slate-950 font-black uppercase tracking-widest rounded-xl shadow-[0_0_25px_rgba(34,211,238,0.25)] hover:shadow-[0_0_35px_rgba(34,211,238,0.45)] hover:scale-[1.02] active:scale-98 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
            >
              <Download className="h-4 w-4" />
              <span>Exportar TXT</span>
            </button>
          </div>
        </div>

        {/* Dynamic Interactive Bit Visualizer Section */}
        <AnimatePresence mode="wait">
          {byteBlocks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="glass p-6 rounded-2xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-200">
                    Visor de Bits Interactivo ({byteBlocks.length} {byteBlocks.length === 1 ? 'byte' : 'bytes'})
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                  Hardware Memory Mapping
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {byteBlocks.map((block) => (
                  <div 
                    key={block.index} 
                    className="bg-slate-950/60 border border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded border border-white/5 font-bold">
                          Byte #{block.index}
                        </span>
                        <span className="text-xs font-mono text-cyan-400/80 font-bold">
                          {block.hex}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Char:</span>
                        <span className="text-xs font-bold font-mono text-cyan-400 px-1.5 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/20">
                          {block.char}
                        </span>
                      </div>
                    </div>

                    {/* Bit grid */}
                    <div className="grid grid-cols-8 gap-1.5 pt-1">
                      {block.bits.map((bit, bitIdx) => (
                        <div 
                          key={bitIdx} 
                          className="flex flex-col items-center gap-1"
                        >
                          <div 
                            className={`w-full aspect-square rounded-md flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 ${
                              bit === '1' 
                                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
                                : 'bg-slate-900 text-slate-600 border border-white/5'
                            }`}
                          >
                            {bit}
                          </div>
                          <span className="text-[9px] text-slate-600 font-mono">b{7 - bitIdx}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono text-right uppercase font-bold">
                      Valor Decimal: <span className="text-cyan-400 font-bold">{block.decimal}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Note if there are more bytes */}
              {mode === 'textToBinary' && inputVal && (new TextEncoder().encode(inputVal).length > 6) && (
                <p className="text-[11px] text-slate-500 italic mt-4 text-center">
                  * Mostrando los primeros 6 bytes para mantener la legibilidad de la interfaz.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick presets and Translation History (Bento Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Preset utilities */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-200">
                Prueba Rápida (Ejemplos)
              </h3>
            </div>
            
            <p className="text-xs text-slate-400 font-medium">
              Selecciona cualquiera de estos ejemplos para ver la traducción bidireccional instantánea:
            </p>

            <div className="space-y-3">
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Texto ➜ Binario</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => loadPreset('Hola', 'textToBinary')}
                    className="text-xs bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 border border-white/5 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    "Hola"
                  </button>
                  <button
                    onClick={() => loadPreset('¡Hola, mundo!', 'textToBinary')}
                    className="text-xs bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 border border-white/5 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    "¡Hola, mundo!"
                  </button>
                  <button
                    onClick={() => loadPreset('Binary 101', 'textToBinary')}
                    className="text-xs bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 border border-white/5 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    "Binary 101"
                  </button>
                  <button
                    onClick={() => loadPreset('🔥🚀', 'textToBinary')}
                    className="text-xs bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 border border-white/5 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    Emojis ("🔥🚀")
                  </button>
                </div>
              </div>

              <div className="flex flex-col space-y-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Binario ➜ Texto</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => loadPreset('01010101 01000110 00111000', 'binaryToText')}
                    className="text-xs bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 border border-white/5 px-2.5 py-1.5 rounded-lg font-mono transition-all"
                  >
                    "UTF8" (en binario)
                  </button>
                  <button
                    onClick={() => loadPreset('01010011 01101111 01110011', 'binaryToText')}
                    className="text-xs bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 border border-white/5 px-2.5 py-1.5 rounded-lg font-mono transition-all"
                  >
                    "Sos" (en binario)
                  </button>
                  <button
                    onClick={() => loadPreset('11110000 10011111 10100111 10010110', 'binaryToText')}
                    className="text-xs bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 border border-white/5 px-2.5 py-1.5 rounded-lg font-mono transition-all"
                  >
                    Símbolo "👽"
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* History Panel */}
          <div className="glass p-6 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-200">
                  Historial Reciente
                </h3>
              </div>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[10px] text-slate-500 hover:text-rose-400 font-mono uppercase tracking-wider underline transition-colors font-bold"
                >
                  Borrar todo
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[140px] space-y-2 pr-1 custom-scrollbar">
              {history.length > 0 ? (
                history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setMode(item.mode);
                      setInputVal(item.input.replace('...', ''));
                    }}
                    className="group border border-white/5 bg-slate-950/40 hover:bg-slate-900/40 hover:border-cyan-500/20 p-2.5 rounded-lg cursor-pointer flex items-center justify-between text-[11px] transition-all"
                  >
                    <div className="flex flex-col space-y-0.5 truncate max-w-[85%]">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1 rounded font-mono font-bold ${
                          item.mode === 'textToBinary' 
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'
                        }`}>
                          {item.mode === 'textToBinary' ? 'TXT ➜ BIN' : 'BIN ➜ TXT'}
                        </span>
                        <span className="text-[9px] text-slate-600 font-mono font-semibold">{item.timestamp}</span>
                      </div>
                      <p className="text-slate-300 font-mono truncate">{item.input}</p>
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-cyan-400 font-mono font-bold transition-opacity pr-1 uppercase tracking-wider">
                      Cargar
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-6">
                  <p className="text-xs text-slate-600 italic">No hay traducciones recientes en este navegador.</p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 font-mono font-semibold">
              * El historial se almacena de forma segura y local en tu navegador.
            </p>
          </div>

        </div>

        {/* Technical Explainer card */}
        <div className="glass-dark rounded-2xl p-6 space-y-3 border border-white/5">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-cyan-400" />
            <h4 className="text-xs font-black uppercase tracking-wider font-mono text-slate-300">
              ¿Cómo funciona la traducción UTF-8?
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            <strong>UTF-8</strong> (Unicode Transformation Format 8-bit) es el estándar de codificación de caracteres más utilizado en la web.
            Cada carácter puede estar representado por <strong>1, 2, 3 o 4 bytes</strong> (grupos de 8 bits). 
            Por ejemplo, los caracteres ASCII estándar como la letra <code className="text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono">A</code> solo ocupan 1 byte (<code className="text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded font-mono">01000001</code>), 
            mientras que las vocales con tildes, caracteres especiales o emojis como <code className="text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono">👽</code> pueden requerir hasta 4 bytes completos. 
            Esta aplicación convierte el texto directamente en su secuencia exacta de bytes en memoria física e interactúa en ambas direcciones instantáneamente.
          </p>
        </div>

      </main>

      <footer className="border-t border-white/5 bg-slate-950/80 py-6 text-center text-xs text-slate-600 font-mono space-y-1">
        <p>B-TRANS UTF-8 © {new Date().getFullYear()} — Simple, rápido y seguro.</p>
        <p className="text-[10px] text-slate-700">Diseñado con tecnología web avanzada y renderizado de bits interactivo en tiempo real.</p>
      </footer>
    </div>
  );
}
