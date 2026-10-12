import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, Activity, AlertCircle, HeartPulse, Stethoscope, Droplet, User, Scale, Thermometer } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

const MetricCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <div className="bg-white dark:bg-netflix-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-netflix-border flex items-center space-x-4 hover:shadow-md transition">
    <div className={`p-4 rounded-xl ${colorClass}`}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="text-sm font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wide">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</h3>
      {subtext && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchHistory(u.uid);
      }
    });
    return () => unsub();
  }, []);

  const fetchHistory = async (uid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/predict/${uid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) setHistory(data);
      }
    } catch (err) {
      console.error("Local SQL DB error:", err);
    }
  };

  const latestScan = history.length > 0 ? history[0] : null;

  // Dynamically calculate KPIs for Clinical Dashboard
  const kpis = useMemo(() => {
    if (!history.length) return { total: 0, critical: 0, avgSys: 0, avgDia: 0 };
    
    let criticalCount = 0;
    let totalSys = 0;
    let totalDia = 0;
    
    history.forEach(item => {
      if (item.riskLevel === 'High') criticalCount++;
      totalSys += item.inputData?.blood_pressure_sys || 120;
      totalDia += item.inputData?.blood_pressure_dia || 80;
    });

    return {
      total: history.length,
      critical: criticalCount,
      avgSys: Math.round(totalSys / history.length),
      avgDia: Math.round(totalDia / history.length)
    };
  }, [history]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-netflix-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-netflix-border">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-900 dark:text-white tracking-tight">Clinical Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-1 font-medium">Patient Identifier: {user?.email || "Guest User"}</p>
        </div>
      </div>

      {/* KPI Statistic Cards (Clinical Styling) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Scans" 
          value={kpis.total} 
          subtext="Lifetime Diagnostics"
          icon={Stethoscope} 
          colorClass="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
        />
        <MetricCard 
          title="Critical Alerts" 
          value={kpis.critical} 
          subtext="High-Risk Thresholds"
          icon={AlertCircle} 
          colorClass={kpis.critical > 0 ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"} 
        />
        <MetricCard 
          title="Avg Systolic" 
          value={kpis.avgSys ? `${kpis.avgSys} mmHg` : "--"} 
          icon={Activity} 
          colorClass="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
        />
        <MetricCard 
          title="Avg Diastolic" 
          value={kpis.avgDia ? `${kpis.avgDia} mmHg` : "--"} 
          icon={HeartPulse} 
          colorClass="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" 
        />
      </div>

      {/* Main Analytical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Latest Scan Readout */}
        <div className="lg:col-span-2 bg-white dark:bg-netflix-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-netflix-border flex flex-col">
          <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center border-b border-gray-100 dark:border-gray-800 pb-4">
            <Activity className="mr-3 h-6 w-6 text-blue-500" />
            Latest AI Assessment Breakdown
          </h2>
          
          <div className="flex-1 w-full mt-2">
             {latestScan ? (
               <div className="h-full flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500">
                  <div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">Detected: <span className="text-blue-600 dark:text-blue-400">{latestScan.disease}</span></h3>
                    <div className="flex items-center space-x-3 mb-8">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-extrabold px-3 py-1 rounded-lg text-sm tracking-wide">CONFIDENCE: {(latestScan.confidence * 100).toFixed(1)}%</span>
                      <span className="text-gray-400 dark:text-gray-500 text-sm font-bold">{new Date(latestScan.timestamp).toLocaleString()}</span>
                    </div>
                    
                    <h4 className="text-sm font-extrabold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-widest">Measured Telemetry Values</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                       <div className="bg-gray-50 dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition">
                         <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase tracking-wide"><HeartPulse className="w-4 h-4 mr-2 text-red-500" /> Blood Pressure</div>
                         <p className="text-2xl font-black text-gray-900 dark:text-white">{latestScan.inputData?.blood_pressure_sys || '--'}/{latestScan.inputData?.blood_pressure_dia || '--'}</p>
                       </div>
                       <div className="bg-gray-50 dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition">
                         <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase tracking-wide"><Scale className="w-4 h-4 mr-2 text-indigo-500" /> BMI Index</div>
                         <p className="text-2xl font-black text-gray-900 dark:text-white">{latestScan.inputData?.bmi || '--'}</p>
                       </div>
                       <div className="bg-gray-50 dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition">
                         <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase tracking-wide"><Droplet className="w-4 h-4 mr-2 text-blue-500" /> Blood Sugar</div>
                         <p className="text-2xl font-black text-gray-900 dark:text-white">{latestScan.inputData?.sugar_level || '--'} <span className="text-sm">mg/dL</span></p>
                       </div>
                       <div className="bg-gray-50 dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition">
                         <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase tracking-wide"><Thermometer className="w-4 h-4 mr-2 text-yellow-500" /> Temperature</div>
                         <p className="text-2xl font-black text-gray-900 dark:text-white">{latestScan.inputData?.temperature || '--'} <span className="text-sm">°F</span></p>
                       </div>
                       <div className="bg-gray-50 dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition">
                         <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase tracking-wide"><User className="w-4 h-4 mr-2 text-purple-500" /> Patient Age</div>
                         <p className="text-2xl font-black text-gray-900 dark:text-white">{latestScan.inputData?.age || '--'} <span className="text-sm">Yrs</span></p>
                       </div>
                    </div>
                  </div>
                  
                  <div className={`mt-8 p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between border ${latestScan.riskLevel === 'High' ? 'bg-red-600 border-red-500' : latestScan.riskLevel === 'Medium' ? 'bg-yellow-600 border-yellow-500' : 'bg-green-600 border-green-500'}`}>
                     <div className="flex items-center text-white mb-4 sm:mb-0">
                       <AlertCircle className="h-7 w-7 mr-3" />
                       <div>
                         <span className="font-extrabold text-sm opacity-80 uppercase tracking-widest block">AI Tolerance</span>
                         <span className="font-black text-xl">{latestScan.riskLevel} Risk Factors Detected</span>
                       </div>
                     </div>
                     <Link to="/predict" className="bg-white/20 hover:bg-white text-white hover:text-gray-900 px-6 py-3 rounded-xl font-bold transition-all w-full sm:w-auto text-center shadow">Execute New Scan</Link>
                  </div>
               </div>
             ) : (
               <div className="w-full h-full min-h-[350px] flex flex-col justify-center items-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-netflix-bg rounded-2xl border-2 border-dashed border-gray-200 dark:border-netflix-border">
                  <Activity className="h-16 w-16 mb-4 text-blue-500 opacity-60 animate-pulse" />
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">System Awaiting Data</h3>
                  <p className="text-center max-w-md mb-8 font-medium leading-relaxed">Your highly secure Clinical Dashboard is currently completely blank. Initiate a scan to visualize massive insights into your biological metrics.</p>
                  <Link to="/predict" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-xl shadow-[0_10px_40px_rgba(37,99,235,0.3)] hover:shadow-blue-500/40 transition-all active:scale-95">Launch Predictor Engine</Link>
               </div>
             )}
          </div>
        </div>
          
        {/* Logs spanning 1/3 width */}
        <div className="bg-white dark:bg-netflix-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-netflix-border flex flex-col">
          <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center">
            <AlertCircle className="mr-3 h-6 w-6 text-blue-500" />
            Diagnostic Logs
          </h2>
          {history.length > 0 ? (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((item, idx) => {
                const medicines = item.inputData?.suggested_medicines || [];
                return (
                <div key={idx} className="flex flex-col p-5 bg-gray-50 dark:bg-netflix-bg rounded-xl border border-gray-100 dark:border-netflix-border transition hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-extrabold text-blue-700 dark:text-blue-400 text-lg leading-tight block">{item.disease}</span>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mt-1">Accuracy: {(item.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className={`font-black uppercase tracking-wider text-[10px] px-2 py-1 rounded-md border ${item.riskLevel === 'High' ? 'text-red-400 border-red-900 bg-red-900/40' : item.riskLevel === 'Medium' ? 'text-yellow-400 border-yellow-900 bg-yellow-900/40' : 'text-green-400 border-green-900 bg-green-900/40'}`}>
                      {item.riskLevel}
                    </div>
                  </div>
                  
                  {medicines.length > 0 && (
                    <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">AI Suggested Rx:</p>
                      <div className="flex flex-wrap gap-2">
                        {medicines.map((m, mIdx) => (
                          <span key={mIdx} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-[10px] font-bold border border-blue-100 dark:border-blue-800/50">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );})}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center py-12 text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-netflix-bg rounded-xl border-2 border-dashed border-gray-200 dark:border-netflix-border">
               <Stethoscope className="h-10 w-10 mb-3 text-gray-300 dark:text-gray-600" />
               <p className="font-bold">No historical diagnoses.</p>
               {user === null && <p className="text-red-500 font-bold mt-2">Log in to view logs.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
