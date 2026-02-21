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
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Category = 'length' | 'weight' | 'volume' | 'temperature';

interface Unit {
  label: string;
  value: string;
  factor?: number; // Relative to base unit
  offset?: number; // For temperature
}

const CATEGORIES: { id: Category; label: string; icon: any }[] = [
  { id: 'length', label: 'Length', icon: Ruler },
  { id: 'weight', label: 'Weight', icon: Scale },
  { id: 'volume', label: 'Volume', icon: Droplets },
  { id: 'temperature', label: 'Temperature', icon: Thermometer },
];

const UNITS: Record<Category, Unit[]> = {
  length: [
    { label: 'Millimeters (mm)', value: 'mm', factor: 0.001 },
    { label: 'Centimeters (cm)', value: 'cm', factor: 0.01 },
    { label: 'Meters (m)', value: 'm', factor: 1 },
    { label: 'Kilometers (km)', value: 'km', factor: 1000 },
    { label: 'Inches (in)', value: 'in', factor: 0.0254 },
    { label: 'Feet (ft)', value: 'ft', factor: 0.3048 },
    { label: 'Yards (yd)', value: 'yd', factor: 0.9144 },
    { label: 'Miles (mi)', value: 'mi', factor: 1609.344 },
  ],
  weight: [
    { label: 'Milligrams (mg)', value: 'mg', factor: 0.000001 },
    { label: 'Grams (g)', value: 'g', factor: 0.001 },
    { label: 'Kilograms (kg)', value: 'kg', factor: 1 },
    { label: 'Ounces (oz)', value: 'oz', factor: 0.0283495 },
    { label: 'Pounds (lb)', value: 'lb', factor: 0.453592 },
  ],
  volume: [
    { label: 'Milliliters (ml)', value: 'ml', factor: 0.001 },
    { label: 'Liters (l)', value: 'l', factor: 1 },
    { label: 'Teaspoons (tsp)', value: 'tsp', factor: 0.00000492892 },
    { label: 'Tablespoons (tbsp)', value: 'tbsp', factor: 0.0000147868 },
    { label: 'Fluid Ounces (fl-oz)', value: 'fl-oz', factor: 0.0000295735 },
    { label: 'Cups', value: 'cup', factor: 0.000236588 },
    { label: 'Pints (pt)', value: 'pt', factor: 0.000473176 },
    { label: 'Quarts (qt)', value: 'qt', factor: 0.000946353 },
    { label: 'Gallons (gal)', value: 'gal', factor: 0.00378541 },
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

  // Initialize units when category changes
  useEffect(() => {
    const units = UNITS[category];
    setFromUnit(units[0].value);
    setToUnit(units[1]?.value || units[0].value);
  }, [category]);

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
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100 p-4 md:p-8 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-tight mb-2">Metric Master</h1>
          <p className="text-[#6B7280] text-sm uppercase tracking-widest font-medium">Precision Unit Conversion</p>
        </header>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-200 text-sm font-medium border",
                  isActive 
                    ? "bg-white border-[#E5E7EB] shadow-sm text-indigo-600" 
                    : "bg-transparent border-transparent text-[#6B7280] hover:bg-white/50 hover:text-[#1A1A1A]"
                )}
              >
                <Icon size={18} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F1F1F1] p-8 md:p-10 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
            
            {/* From Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">From</label>
              <div className="relative group">
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="w-full appearance-none bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-3.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {UNITS[category].map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none group-hover:text-[#1A1A1A] transition-colors" size={16} />
              </div>
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0"
                className="w-full bg-white border-b-2 border-[#E5E7EB] py-4 text-4xl font-light focus:outline-none focus:border-indigo-500 transition-all placeholder:text-[#E5E7EB]"
              />
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwap}
                className="p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm active:scale-95"
                title="Swap Units"
              >
                <ArrowRightLeft size={20} className="rotate-90 md:rotate-0" />
              </button>
            </div>

            {/* To Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">To</label>
              <div className="relative group">
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="w-full appearance-none bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-3.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {UNITS[category].map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none group-hover:text-[#1A1A1A] transition-colors" size={16} />
              </div>
              <div className="relative group min-h-[72px] flex items-center">
                <div className="text-4xl font-light text-indigo-600 break-all pr-12">
                  {result !== null ? formatResult(result) : '0'}
                </div>
                {result !== null && (
                  <button
                    onClick={copyToClipboard}
                    className="absolute right-0 p-2 text-[#9CA3AF] hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Copy result"
                  >
                    {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-10 pt-8 border-t border-[#F1F1F1] flex items-center gap-3 text-[#6B7280]">
            <Info size={16} className="shrink-0" />
            <p className="text-xs leading-relaxed">
              {category === 'temperature' 
                ? "Temperature conversions use standard formulas: °F = (°C × 9/5) + 32 and K = °C + 273.15."
                : `Converting between ${UNITS[category].length} different ${category} units with high precision.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center space-y-4">
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Accuracy</p>
              <p className="text-sm font-medium">6 Decimal Places</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Standard</p>
              <p className="text-sm font-medium">SI & Imperial</p>
            </div>
          </div>
          <p className="text-xs text-[#9CA3AF]">© 2026 Metric Master Utility. All rights reserved.</p>
        </footer>
      </motion.div>
    </div>
  );
}
