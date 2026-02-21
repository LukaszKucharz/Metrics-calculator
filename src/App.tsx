/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Scale, 
  Ruler, 
  Droplets, 
  Thermometer, 
  ArrowRightLeft, 
  Copy, 
  Check,
  ChevronDown,
  Info,
  Anchor,
  Wind,
  Waves,
  Gauge,
  History,
  Trash2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Category = 'length' | 'weight' | 'speed' | 'pressure' | 'temperature' | 'wind';

interface Unit {
  label: string;
  value: string;
  factor?: number; // Relative to base unit
  offset?: number; // For temperature
}

interface HistoryItem {
  id: number;
  category: string;
  from_unit: string;
  to_unit: string;
  input_value: number;
  output_value: number;
  timestamp: string;
}

const BEAUFORT_SCALE = [
  { level: 0, minKt: 0, description: "Calm", seaEffect: "Sea like a mirror." },
  { level: 1, minKt: 1, description: "Light air", seaEffect: "Ripples with appearance of scales are formed, without foam crests." },
  { level: 2, minKt: 4, description: "Light breeze", seaEffect: "Small wavelets still short but more pronounced; crests have a glassy appearance but do not break." },
  { level: 3, minKt: 7, description: "Gentle breeze", seaEffect: "Large wavelets; crests begin to break; foam of glassy appearance. Perhaps scattered white horses." },
  { level: 4, minKt: 11, description: "Moderate breeze", seaEffect: "Small waves becoming longer; fairly frequent white horses." },
  { level: 5, minKt: 17, description: "Fresh breeze", seaEffect: "Moderate waves taking a more pronounced long form; many white horses are formed. Chance of some spray." },
  { level: 6, minKt: 22, description: "Strong breeze", seaEffect: "Large waves begin to form; the white foam crests are more extensive everywhere. Probably some spray." },
  { level: 7, minKt: 28, description: "Near gale", seaEffect: "Sea heaps up and white foam from breaking waves begins to be blown in streaks along the direction of the wind." },
  { level: 8, minKt: 34, description: "Gale", seaEffect: "Moderately high waves of greater length; edges of crests break into spindrift. Foam is blown in well-marked streaks." },
  { level: 9, minKt: 41, description: "Strong gale", seaEffect: "High waves. Dense streaks of foam along the direction of the wind. Sea begins to roll. Spray may affect visibility." },
  { level: 10, minKt: 48, description: "Storm", seaEffect: "Very high waves with long overhanging crests. Resulting foam in great patches is blown in dense white streaks." },
  { level: 11, minKt: 56, description: "Violent storm", seaEffect: "Exceptionally high waves. Sea is completely covered with long white patches of foam. Visibility affected." },
  { level: 12, minKt: 64, description: "Hurricane", seaEffect: "The air is filled with foam and spray. Sea completely white with driving spray; visibility very seriously affected." },
];

const CATEGORIES: { id: Category; label: string; icon: any }[] = [
  { id: 'length', label: 'Distance', icon: Ruler },
  { id: 'speed', label: 'Speed', icon: Anchor },
  { id: 'wind', label: 'Wind', icon: Wind },
  { id: 'pressure', label: 'Pressure', icon: Gauge },
  { id: 'temperature', label: 'Weather', icon: Thermometer },
  { id: 'weight', label: 'Weight', icon: Scale },
];

const UNITS: Record<Category, Unit[]> = {
  length: [
    { label: 'Nautical Miles (nmi)', value: 'nmi', factor: 1852 },
    { label: 'Fathoms (ftm)', value: 'ftm', factor: 1.8288 },
    { label: 'Meters (m)', value: 'm', factor: 1 },
    { label: 'Kilometers (km)', value: 'km', factor: 1000 },
    { label: 'Feet (ft)', value: 'ft', factor: 0.3048 },
    { label: 'Yards (yd)', value: 'yd', factor: 0.9144 },
    { label: 'Miles (mi)', value: 'mi', factor: 1609.344 },
  ],
  speed: [
    { label: 'Knots (kt)', value: 'kt', factor: 1.852 },
    { label: 'm/s', value: 'ms', factor: 3.6 },
    { label: 'km/h', value: 'kmh', factor: 1 },
    { label: 'mph', value: 'mph', factor: 1.60934 },
  ],
  wind: [
    { label: 'Beaufort Scale', value: 'bf' },
    { label: 'Knots (kt)', value: 'kt', factor: 1.852 },
    { label: 'm/s', value: 'ms', factor: 3.6 },
    { label: 'km/h', value: 'kmh', factor: 1 },
    { label: 'mph', value: 'mph', factor: 1.60934 },
  ],
  pressure: [
    { label: 'Hectopascals (hPa)', value: 'hpa', factor: 1 },
    { label: 'Millibars (mb)', value: 'mb', factor: 1 },
    { label: 'Inches of Mercury (inHg)', value: 'inhg', factor: 33.8639 },
    { label: 'Millimeters of Mercury (mmHg)', value: 'mmhg', factor: 1.33322 },
    { label: 'PSI', value: 'psi', factor: 68.9476 },
  ],
  weight: [
    { label: 'Metric Tons (t)', value: 't', factor: 1000 },
    { label: 'Kilograms (kg)', value: 'kg', factor: 1 },
    { label: 'Grams (g)', value: 'g', factor: 0.001 },
    { label: 'Pounds (lb)', value: 'lb', factor: 0.453592 },
  ],
  temperature: [
    { label: 'Celsius (°C)', value: 'C', offset: 0 },
    { label: 'Fahrenheit (°F)', value: 'F', offset: 32 },
    { label: 'Kelvin (K)', value: 'K', offset: 273.15 },
  ],
};

export default function App() {
  const [category, setCategory] = useState<Category>('length');
  const [fromUnit, setFromUnit] = useState<string>('');
  const [toUnit, setToUnit] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('1');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Initialize units when category changes
  useEffect(() => {
    const units = UNITS[category];
    setFromUnit(units[0].value);
    setToUnit(units[1]?.value || units[0].value);
  }, [category]);

  // Clamp input value for Beaufort scale
  useEffect(() => {
    if (category === 'wind' && fromUnit === 'bf') {
      const val = parseFloat(inputValue);
      if (val > 12) {
        setInputValue('12');
      }
    }
  }, [category, fromUnit]);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const saveHistory = async (output: number) => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          fromUnit,
          toUnit,
          inputValue: parseFloat(inputValue),
          outputValue: output
        })
      });
      fetchHistory();
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  };

  const clearHistory = async () => {
    try {
      const response = await fetch('/api/history', { method: 'DELETE' });
      if (response.ok) {
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const result = useMemo(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return null;

    if (category === 'temperature') {
      // Special handling for temperature
      let celsius = 0;
      if (fromUnit === 'C') celsius = val;
      else if (fromUnit === 'F') celsius = (val - 32) * (5 / 9);
      else if (fromUnit === 'K') celsius = val - 273.15;

      if (toUnit === 'C') return celsius;
      if (toUnit === 'F') return celsius * (9 / 5) + 32;
      if (toUnit === 'K') return celsius + 273.15;
      return celsius;
    } else if (category === 'wind') {
      // Special handling for Beaufort Scale
      let baseValueKmH = 0;
      if (fromUnit === 'bf') {
        const level = Math.max(0, Math.min(12, Math.floor(val)));
        const bft = BEAUFORT_SCALE[level];
        baseValueKmH = bft.minKt * 1.852;
      } else {
        const from = UNITS.wind.find(u => u.value === fromUnit);
        if (!from || !from.factor) return null;
        baseValueKmH = val * from.factor;
      }

      if (toUnit === 'bf') {
        const knots = baseValueKmH / 1.852;
        let level = 0;
        for (let i = BEAUFORT_SCALE.length - 1; i >= 0; i--) {
          if (knots >= BEAUFORT_SCALE[i].minKt) {
            level = i;
            break;
          }
        }
        return level;
      } else {
        const to = UNITS.wind.find(u => u.value === toUnit);
        if (!to || !to.factor) return null;
        return baseValueKmH / to.factor;
      }
    } else {
      const units = UNITS[category];
      const from = units.find(u => u.value === fromUnit);
      const to = units.find(u => u.value === toUnit);
      if (!from || !to || !from.factor || !to.factor) return null;

      // Convert to base unit then to target unit
      const baseValue = val * from.factor;
      return baseValue / to.factor;
    }
  }, [category, fromUnit, toUnit, inputValue]);

  // Save to history when result changes
  useEffect(() => {
    if (result !== null && inputValue !== '' && !isNaN(parseFloat(inputValue))) {
      const timer = setTimeout(() => {
        saveHistory(result);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const copyToClipboard = () => {
    if (result !== null) {
      navigator.clipboard.writeText(result.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatResult = (val: number) => {
    if (Math.abs(val) < 0.000001 && val !== 0) return val.toExponential(6);
    return Number(val.toFixed(6)).toString();
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-sky-500/30 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
        <Waves className="absolute -top-20 -left-20 w-96 h-96 text-sky-500" />
        <Anchor className="absolute -bottom-20 -right-20 w-96 h-96 text-sky-500" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Header */}
        <header className="mb-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold uppercase tracking-widest mb-4">
            <Anchor size={12} />
            Maritime Standard
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2 text-white">Maritime Master</h1>
          <p className="text-slate-400 text-sm uppercase tracking-widest font-medium">Navigational & Weather Conversion</p>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="absolute right-0 top-0 p-2 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-sky-400 transition-colors"
            title="View History"
          >
            <History size={20} />
          </button>
        </header>

        <AnimatePresence mode="wait">
          {!showHistory ? (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Category Tabs */}
              <div className="flex flex-wrap justify-center gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium border",
                        isActive 
                          ? "bg-sky-600 border-sky-500 shadow-lg shadow-sky-900/20 text-white" 
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <Icon size={18} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Main Card */}
              <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-8 md:p-10 relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
                  
                  {/* From Section */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Source Unit</label>
                    <div className="relative group">
                      <select
                        value={fromUnit}
                        onChange={(e) => setFromUnit(e.target.value)}
                        className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3.5 pr-10 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
                      >
                        {UNITS[category].map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" size={16} />
                    </div>
                    <input
                      type="number"
                      value={inputValue}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (category === 'wind' && fromUnit === 'bf') {
                          const num = parseFloat(val);
                          if (num > 12) val = '12';
                        }
                        setInputValue(val);
                      }}
                      max={category === 'wind' && fromUnit === 'bf' ? 12 : undefined}
                      min={category === 'wind' && fromUnit === 'bf' ? 0 : undefined}
                      placeholder="0"
                      className="w-full bg-transparent border-b-2 border-slate-800 py-4 text-4xl font-light text-white focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-800"
                    />
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleSwap}
                      className="p-3 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors shadow-sm active:scale-95"
                      title="Swap Units"
                    >
                      <ArrowRightLeft size={20} className="rotate-90 md:rotate-0" />
                    </button>
                  </div>

                  {/* To Section */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Unit</label>
                    <div className="relative group">
                      <select
                        value={toUnit}
                        onChange={(e) => setToUnit(e.target.value)}
                        className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3.5 pr-10 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
                      >
                        {UNITS[category].map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" size={16} />
                    </div>
                    <div className="relative group min-h-[72px] flex items-center">
                      <div className="text-4xl font-light text-sky-400 break-all pr-12">
                        {result !== null ? formatResult(result) : '0'}
                      </div>
                      {result !== null && (
                        <button
                          onClick={copyToClipboard}
                          className="absolute right-0 p-2 text-slate-500 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Copy result"
                        >
                          {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="mt-10 pt-8 border-t border-slate-800 space-y-4">
                  {category === 'wind' && result !== null && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 space-y-2"
                    >
                      <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                        <Wind size={16} />
                        Beaufort Force {fromUnit === 'bf' ? Math.max(0, Math.min(12, Math.floor(parseFloat(inputValue)))) : Math.max(0, Math.min(12, Math.floor(toUnit === 'bf' ? result : 0)))}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{BEAUFORT_SCALE[Math.max(0, Math.min(12, Math.floor(fromUnit === 'bf' ? parseFloat(inputValue) : (toUnit === 'bf' ? result : 0))))].description}"
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <span className="text-slate-500 font-medium uppercase text-[10px] tracking-wider block mb-1">Sea Effect:</span>
                        {BEAUFORT_SCALE[Math.max(0, Math.min(12, Math.floor(fromUnit === 'bf' ? parseFloat(inputValue) : (toUnit === 'bf' ? result : 0))))].seaEffect}
                      </p>
                    </motion.div>
                  )}
                  
                  <div className="flex items-center gap-3 text-slate-400">
                    <Info size={16} className="shrink-0 text-sky-500" />
                    <p className="text-xs leading-relaxed">
                      {category === 'speed' 
                        ? "1 Knot is exactly 1.852 km/h (one nautical mile per hour)."
                        : category === 'pressure'
                        ? "Atmospheric pressure is critical for weather forecasting. Standard sea-level pressure is 1013.25 hPa."
                        : category === 'wind'
                        ? "The Beaufort scale is an empirical measure that relates wind speed to observed conditions at sea or on land."
                        : `Converting between ${UNITS[category].length} different ${category} units for maritime navigation.`}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-8 md:p-10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <History className="text-sky-500" size={20} />
                  <h2 className="text-xl font-semibold text-white">Conversion History</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={clearHistory}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={14} />
                    Clear All
                  </button>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:text-white transition-colors"
                  >
                    Back to Calculator
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Clock size={40} className="mx-auto mb-4 opacity-20" />
                    <p>No history yet. Start converting!</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between group hover:border-sky-500/30 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500/70">{item.category}</span>
                          <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-sm font-medium text-slate-200">
                          {item.input_value} <span className="text-slate-500">{item.from_unit}</span>
                          <ArrowRightLeft size={12} className="inline mx-2 text-slate-600" />
                          <span className="text-sky-400">{formatResult(item.output_value)}</span> <span className="text-slate-500">{item.to_unit}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setCategory(item.category as Category);
                          setFromUnit(item.from_unit);
                          setToUnit(item.to_unit);
                          setInputValue(item.input_value.toString());
                          setShowHistory(false);
                        }}
                        className="p-2 rounded-lg bg-sky-500/10 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sky-500/20"
                        title="Restore this conversion"
                      >
                        <ArrowRightLeft size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-12 text-center space-y-4">
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Navigation</p>
              <p className="text-sm font-medium text-slate-300">Nautical Standard</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Precision</p>
              <p className="text-sm font-medium text-slate-300">6 Decimal Places</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">© 2026 Maritime Master Utility. For navigational reference only.</p>
        </footer>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
