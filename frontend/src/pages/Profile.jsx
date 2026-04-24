import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Save, UserCircle, Activity, Heart, Thermometer, Droplet, User, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    age: 30,
    gender: 1, // 1=Male, 0=Female
    bmi: 22.5,
    blood_pressure_sys: 120,
    blood_pressure_dia: 80,
    sugar_level: 90,
    temperature: 98.6,
    cholesterol: 180,
    heart_rate: 72,
    smoking_status: 0
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const response = await fetch(`http://localhost:8000/profile/${u.uid}`);
          if (response.ok) {
            const data = await response.json();
            if (data && Object.keys(data).length > 0) {
              setProfile(data);
            }
          }
        } catch (err) {
          console.error("Local SQL Fetch Error:", err);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      const response = await fetch('http://localhost:8000/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          userId: user.uid
        })
      });
      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Save Error:", err);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
         <div className="w-full flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center border-t-4 border-blue-500">
             <UserCircle className="h-20 w-20 text-blue-500 mb-6" />
             <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Authentication Required</h2>
             <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">You must securely sign in to manage your medical baselines.</p>
             <button onClick={() => navigate('/auth')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl px-8 py-4 rounded-xl shadow-lg transition active:scale-[0.98]">
               Sign In Now
             </button>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <UserCircle className="h-48 w-48" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black mb-2 flex items-center tracking-tight">
             <UserCircle className="h-10 w-10 mr-4" /> My Biological Profile
          </h1>
          <p className="text-blue-100 text-lg font-medium opacity-90 max-w-2xl">
            These securely stored metrics will autonomously pre-fill the AI Database predictor, saving you critical time during triage routines.
          </p>
        </div>
      </div>

      {/* Main Stats Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-netflix-card p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-netflix-border">
        
        <div className="flex items-center mb-8 pb-4 border-b border-gray-100 dark:border-netflix-border">
          <Activity className="h-6 w-6 text-blue-500 mr-3" />
          <h2 className="text-2xl font-bold dark:text-white tracking-tight">Baseline Vitals</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          
          {/* Age & Gender Group */}
          <div className="space-y-6 bg-gray-50 dark:bg-netflix-bg p-6 rounded-2xl border border-gray-100 dark:border-netflix-border/50">
             <div>
                <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
                  <User className="w-4 h-4 mr-2 text-blue-500" /> Patient Age
                </label>
                <div className="relative">
                  <input type="number" name="age" value={profile.age} onChange={handleInputChange} required min="1" max="120"
                    className="w-full px-5 py-4 text-xl font-bold bg-white dark:bg-netflix-card border-2 border-gray-200 dark:border-netflix-border rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:text-white transition shadow-sm" />
                  <span className="absolute right-5 top-4 text-gray-400 font-bold">Years</span>
                </div>
             </div>
             
             <div>
                <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  <UserCircle className="w-4 h-4 mr-2 text-blue-500" /> Biological Sex
                </label>
                <select name="gender" value={profile.gender} onChange={handleInputChange}
                  className="w-full px-5 py-4 text-xl font-bold bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:text-white transition shadow-sm cursor-pointer">
                  <option value="1">Male</option>
                  <option value="0">Female</option>
                </select>
             </div>
          </div>

          {/* Body Metrics Group */}
          <div className="space-y-6 bg-gray-50 dark:bg-netflix-bg p-6 rounded-2xl border border-gray-100 dark:border-netflix-border/50">
             <div>
                <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
                  <Scale className="w-4 h-4 mr-2 text-indigo-500" /> Body Mass Index (BMI)
                </label>
                <div className="relative">
                  <input type="number" step="0.1" name="bmi" value={profile.bmi} onChange={handleInputChange} required
                    className="w-full px-5 py-4 text-xl font-bold bg-white dark:bg-netflix-card border-2 border-gray-200 dark:border-netflix-border rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 dark:text-white transition shadow-sm" />
                  <span className="absolute right-5 top-4 text-gray-400 font-bold">kg/m²</span>
                </div>
             </div>
             <div>
                <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
                  <Thermometer className="w-4 h-4 mr-2 text-indigo-500" /> Baseline Temp
                </label>
                <div className="relative">
                  <input type="number" step="0.1" name="temperature" value={profile.temperature} onChange={handleInputChange} required
                    className="w-full px-5 py-4 text-xl font-bold bg-white dark:bg-netflix-card border-2 border-gray-200 dark:border-netflix-border rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 dark:text-white transition shadow-sm" />
                  <span className="absolute right-5 top-4 text-gray-400 font-bold">°F</span>
                </div>
             </div>
          </div>
          
          {/* Blood Pressure Dual Input */}
          <div className="md:col-span-2 bg-gray-50 dark:bg-netflix-bg p-6 rounded-2xl border border-gray-100 dark:border-netflix-border/50">
             <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide text-xs">
               <Heart className="w-4 h-4 mr-2 text-red-500" /> Resting Blood Pressure
             </label>
             <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <input type="number" name="blood_pressure_sys" value={profile.blood_pressure_sys} onChange={handleInputChange} required placeholder="Systolic"
                    className="w-full px-5 py-4 text-xl font-bold bg-white dark:bg-netflix-card border-2 border-gray-200 dark:border-netflix-border rounded-xl focus:outline-none focus:border-red-500 dark:focus:border-red-500 dark:text-white transition shadow-sm" />
                  <span className="absolute right-4 top-4 text-gray-400 text-sm font-bold hidden sm:block">SYS (Top)</span>
                </div>
                <span className="text-4xl font-light text-gray-400">/</span>
                <div className="flex-1 relative">
                  <input type="number" name="blood_pressure_dia" value={profile.blood_pressure_dia} onChange={handleInputChange} required placeholder="Diastolic"
                    className="w-full px-5 py-4 text-xl font-bold bg-white dark:bg-netflix-card border-2 border-gray-200 dark:border-netflix-border rounded-xl focus:outline-none focus:border-red-500 dark:focus:border-red-500 dark:text-white transition shadow-sm" />
                  <span className="absolute right-4 top-4 text-gray-400 text-sm font-bold hidden sm:block">DIA (Bot)</span>
                </div>
             </div>
          </div>

          {/* Blood Sugar Level */}
          <div className="bg-gray-50 dark:bg-netflix-bg p-6 rounded-2xl border border-gray-100 dark:border-netflix-border/50">
            <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
               <Droplet className="w-4 h-4 mr-2 text-purple-500" /> Fasting Blood Sugar
            </label>
            <div className="relative">
               <input type="number" name="sugar_level" value={profile.sugar_level} onChange={handleInputChange} required
                 className="w-full px-5 py-4 text-xl font-bold bg-white dark:bg-netflix-card border-2 border-gray-200 dark:border-netflix-border rounded-xl focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 dark:text-white transition shadow-sm" />
               <span className="absolute right-5 top-4 text-gray-400 font-bold">mg/dL</span>
            </div>
          </div>

          {/* Smoking Status */}
          <div className="bg-gray-50 dark:bg-netflix-bg p-6 rounded-2xl border border-gray-100 dark:border-netflix-border/50 flex flex-col justify-center">
            <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide text-xs">
               <Activity className="w-4 h-4 mr-2 text-gray-500" /> Lifestyle Habit
            </label>
            <div className="flex items-center space-x-3">
              <input 
                type="checkbox" 
                id="smoking_status_profile"
                checked={profile.smoking_status === 1}
                onChange={(e) => setProfile(p => ({...p, smoking_status: e.target.checked ? 1 : 0}))}
                className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="smoking_status_profile" className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer">Regular Smoker</label>
            </div>
          </div>

          {/* New Clinical Stat: Cholesterol */}
          <div className="bg-gray-50 dark:bg-netflix-bg p-6 rounded-2xl border border-gray-100 dark:border-netflix-border/50">
            <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
               <Activity className="w-4 h-4 mr-2 text-blue-500" /> Total Cholesterol
            </label>
            <div className="relative">
               <input type="number" name="cholesterol" value={profile.cholesterol} onChange={handleInputChange} required
                 className="w-full px-5 py-4 text-xl font-bold bg-white dark:bg-netflix-card border-2 border-gray-200 dark:border-netflix-border rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 dark:text-white transition shadow-sm" />
               <span className="absolute right-5 top-4 text-gray-400 font-bold">mg/dL</span>
            </div>
          </div>

          {/* New Clinical Stat: Resting Heart Rate */}
          <div className="md:col-span-2 bg-gray-50 dark:bg-netflix-bg p-6 rounded-2xl border border-gray-100 dark:border-netflix-border/50">
            <label className="flex items-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
               <Heart className="w-4 h-4 mr-2 text-red-500" /> Resting Heart Rate
            </label>
            <div className="relative max-w-md">
               <input type="number" name="heart_rate" value={profile.heart_rate} onChange={handleInputChange} required
                 className="w-full px-5 py-4 text-xl font-bold bg-white dark:bg-netflix-card border-2 border-gray-200 dark:border-netflix-border rounded-xl focus:outline-none focus:border-red-500 dark:focus:border-red-500 dark:text-white transition shadow-sm" />
               <span className="absolute right-5 top-4 text-gray-400 font-bold">BPM</span>
            </div>
          </div>
          
        </div>

        {/* Action Button */}
        <div className="border-t border-gray-100 dark:border-netflix-border pt-8 flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="inline-flex items-center text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-lg animate-in fade-in">
                <Save className="h-5 w-5 mr-2" /> Baselines Synchronized
              </span>
            )}
          </div>
          <button 
             type="submit" 
             disabled={saving}
             className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xl px-12 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 flex items-center"
          >
            {saving ? (
              <span className="animate-pulse">Writing to SQL...</span>
            ) : (
              <>Save Biological Matrix</>
            )}
          </button>
        </div>
      </form>
      
    </div>
  );
};

export default Profile;
