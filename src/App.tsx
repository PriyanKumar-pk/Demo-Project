/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Music, 
  BarChart3, 
  Settings2, 
  Heart, 
  Smile, 
  Zap, 
  Coffee, 
  Moon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EMOTIONS = [
  { name: "Happy", icon: Smile, color: "#FBBF24", description: "Upbeat, joyful tunes" },
  { name: "Calm", icon: Moon, color: "#60A5FA", description: "Ambient, soothing sounds" },
  { name: "Focused", icon: Coffee, color: "#34D399", description: "Lo-fi, deep work beats" },
  { name: "Energetic", icon: Zap, color: "#F87171", description: "High-tempo, motivating tracks" },
  { name: "Melancholic", icon: Heart, color: "#A78BFA", description: "Soulful, reflective melodies" }
];

const USER_ID = Math.random().toString(36).substring(7);

export default function App() {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [summary, setSummary] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [currentTracks, setCurrentTracks] = useState<{ baseline: string | null, fairness: string | null }>({ baseline: null, fairness: null });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'dashboard' | 'comparison'>('input');

  const fetchData = async () => {
    try {
      const [summaryRes, statsRes] = await Promise.all([
        fetch('/api/emotions/summary'),
        fetch('/api/stats')
      ]);
      const summaryData = await summaryRes.json();
      const statsData = await statsRes.json();
      
      setSummary(summaryData);
      setHistory(statsData.history);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEmotionSubmit = async (emotion: string) => {
    setLoading(true);
    try {
      await fetch('/api/emotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID, emotion })
      });
      setSelectedEmotion(emotion);
      fetchData();
    } catch (error) {
      console.error("Error submitting emotion:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerNextTrack = async () => {
    try {
      const res = await fetch('/api/playlist/next');
      const data = await res.json();
      setCurrentTracks(data);
      fetchData();
    } catch (error) {
      console.error("Error triggering next track:", error);
    }
  };

  const resetSystem = async () => {
    if (confirm("Reset all data?")) {
      await fetch('/api/reset', { method: 'POST' });
      setSelectedEmotion(null);
      setCurrentTracks({ baseline: null, fairness: null });
      fetchData();
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    if (history.length === 0) return null;
    
    const baselineHistory = history.filter(h => h.system_type === 'baseline');
    const fairnessHistory = history.filter(h => h.system_type === 'fairness');

    const calculateSatisfaction = (hist: any[]) => {
      if (hist.length === 0) return 0;
      // Satisfaction = % of time an emotion was played that matched at least one user's request
      // In this simple prototype, we'll measure "Coverage": how many unique emotions from the requested set were played
      const requestedEmotions = new Set(summary.map(s => s.emotion));
      if (requestedEmotions.size === 0) return 100;
      
      const playedEmotions = new Set(hist.slice(0, 10).map(h => h.emotion));
      let covered = 0;
      requestedEmotions.forEach(e => {
        if (playedEmotions.has(e)) covered++;
      });
      return (covered / requestedEmotions.size) * 100;
    };

    return {
      baselineSatisfaction: calculateSatisfaction(baselineHistory),
      fairnessSatisfaction: calculateSatisfaction(fairnessHistory)
    };
  }, [history, summary]);

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#1C1917] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Music size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">Fairness-Aware Music</h1>
              <p className="text-xs text-stone-500 font-medium uppercase tracking-widest mt-1">Group Emotion Adaptive System</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            {[
              { id: 'input', label: 'My Input', icon: Heart },
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'comparison', label: 'Comparison', icon: Settings2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id 
                    ? "bg-white text-emerald-700 shadow-sm" 
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-200/50"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={resetSystem}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
              title="Reset Data"
            >
              <RefreshCw size={18} />
            </button>
            <div className="h-8 w-[1px] bg-stone-200 mx-1" />
            <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
              <Users size={16} />
              <span>{summary.reduce((acc, curr) => acc + curr.count, 0)} Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-bold tracking-tight text-stone-900">How are you feeling?</h2>
                <p className="text-stone-500 text-lg">Your input helps the system balance the music for everyone in the room.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {EMOTIONS.map((emotion) => (
                  <button
                    key={emotion.name}
                    onClick={() => handleEmotionSubmit(emotion.name)}
                    disabled={loading}
                    className={cn(
                      "group relative flex items-center gap-6 p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden",
                      selectedEmotion === emotion.name
                        ? "border-emerald-500 bg-emerald-50/50 shadow-md"
                        : "border-stone-100 bg-white hover:border-stone-300 hover:shadow-lg"
                    )}
                  >
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${emotion.color}20`, color: emotion.color }}
                    >
                      <emotion.icon size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-stone-900">{emotion.name}</h3>
                      <p className="text-stone-500 font-medium">{emotion.description}</p>
                    </div>
                    {selectedEmotion === emotion.name && (
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500">
                        <CheckCircle2 size={24} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedEmotion && (
                <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Info size={20} />
                    </div>
                    <p className="font-medium">Your emotion has been recorded. The system is adapting.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="bg-white text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors"
                  >
                    View Dashboard
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Distribution */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Users size={20} className="text-emerald-600" />
                      Group Emotion Distribution
                    </h3>
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Live Updates</span>
                  </div>
                  
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                        <XAxis dataKey="emotion" axisLine={false} tickLine={false} tick={{ fill: '#78716C', fontSize: 12, fontWeight: 500 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716C', fontSize: 12 }} />
                        <Tooltip 
                          cursor={{ fill: '#F5F5F4' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {summary.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={EMOTIONS.find(e => e.name === entry.emotion)?.color || '#8884d8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-6">
                  <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl shadow-emerald-100 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <h3 className="text-emerald-300 text-sm font-bold uppercase tracking-widest">Next Track Control</h3>
                      <p className="text-2xl font-bold leading-tight">Simulate the next track selection based on current group state.</p>
                    </div>
                    <button 
                      onClick={triggerNextTrack}
                      className="mt-8 w-full bg-white text-emerald-900 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <Music size={20} />
                      Generate Next Track
                    </button>
                  </div>
                </div>
              </div>

              {/* Comparison Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Majority Baseline</h4>
                      <p className="text-sm text-stone-500">Always plays for the largest group.</p>
                    </div>
                  </div>
                  <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Now Playing</p>
                    <p className="text-2xl font-bold text-stone-800">
                      {currentTracks.baseline ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: EMOTIONS.find(e => e.name === currentTracks.baseline)?.color }} />
                          {currentTracks.baseline} Music
                        </span>
                      ) : "Waiting for input..."}
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-emerald-900">Fairness-Aware System</h4>
                      <p className="text-sm text-emerald-600">Balances all emotional states.</p>
                    </div>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Now Playing</p>
                    <p className="text-2xl font-bold text-emerald-800">
                      {currentTracks.fairness ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: EMOTIONS.find(e => e.name === currentTracks.fairness)?.color }} />
                          {currentTracks.fairness} Music
                        </span>
                      ) : "Waiting for input..."}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Satisfaction Metrics */}
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
                  <h3 className="text-xl font-bold">Emotion Satisfaction Ratio</h3>
                  <div className="space-y-12">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-stone-600">Majority Baseline</span>
                        <span className="text-3xl font-black text-stone-900">{metrics?.baselineSatisfaction.toFixed(0)}%</span>
                      </div>
                      <div className="h-4 bg-stone-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${metrics?.baselineSatisfaction}%` }}
                          className="h-full bg-stone-400"
                        />
                      </div>
                      <p className="text-sm text-stone-500 italic">Minority emotions are often "starved" in this model.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-emerald-600">Fairness-Aware</span>
                        <span className="text-3xl font-black text-emerald-600">{metrics?.fairnessSatisfaction.toFixed(0)}%</span>
                      </div>
                      <div className="h-4 bg-emerald-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${metrics?.fairnessSatisfaction}%` }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                      <p className="text-sm text-emerald-600 font-medium">Ensures every emotion group gets representation over time.</p>
                    </div>
                  </div>
                </div>

                {/* History Log */}
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col h-[500px]">
                  <h3 className="text-xl font-bold mb-6">Playlist History (Last 20)</h3>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {history.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-stone-400 italic">
                        No tracks played yet.
                      </div>
                    ) : (
                      history.map((item, idx) => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border",
                            item.system_type === 'fairness' ? "bg-emerald-50/50 border-emerald-100" : "bg-stone-50 border-stone-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-2 h-8 rounded-full" 
                              style={{ backgroundColor: EMOTIONS.find(e => e.name === item.emotion)?.color }} 
                            />
                            <div>
                              <p className="font-bold text-stone-800">{item.emotion} Music</p>
                              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
                                {item.system_type === 'fairness' ? 'Fairness System' : 'Baseline System'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-stone-400">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Explanation Section */}
              <div className="bg-stone-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <h3 className="text-3xl font-bold tracking-tight">How the Fairness Algorithm Works</h3>
                    <p className="text-stone-400 text-lg leading-relaxed">
                      Instead of a simple "most votes win" approach, our system uses a <strong>starvation-aware rotation</strong>. 
                      It tracks how long each emotion group has been waiting for their music and multiplies that "wait time" by the number of people in that group.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <div className="bg-white/10 px-4 py-2 rounded-full text-sm font-mono border border-white/10">
                        Score = Wait_Time × Group_Size
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                      <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Goal 1</h4>
                      <p className="font-medium">Prevent minority neglect</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                      <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Goal 2</h4>
                      <p className="font-medium">Maintain group harmony</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                      <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Goal 3</h4>
                      <p className="font-medium">Emotional well-being</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                      <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Goal 4</h4>
                      <p className="font-medium">Explainable logic</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-stone-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Music size={16} />
            <span className="text-sm font-bold uppercase tracking-widest">Fairness-Aware Group Emotion Music System</span>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Primary SDG</p>
              <p className="text-sm font-bold text-stone-600">SDG 3: Health & Well-Being</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Secondary SDG</p>
              <p className="text-sm font-bold text-stone-600">SDG 11: Sustainable Cities</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
