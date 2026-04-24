import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Speedometer from '../components/Speedometer';

const SYMPTOM_OPTIONS = [
  { value: 'chest_pain', label: 'Chest Pain' },
  { value: 'polyuria', label: 'Polyuria (Frequent Urination)' },
  { value: 'fatigue', label: 'Fatigue / Extreme Tiredness' },
  { value: 'cough', label: 'Coughing' },
  { value: 'sore_throat', label: 'Sore Throat' },
  { value: 'weight_change', label: 'Sudden Weight Change' },
  { value: 'sudden_numbness', label: 'Sudden Numbness / Weakness' },
  { value: 'slurred_speech', label: 'Slurred Speech / Confusion' },
  { value: 'thyroid_swelling', label: 'Swelling in the Neck / Thyroid' },
  { value: 'unexplained_lump', label: 'Unexplained Lump / Mass' },
  { value: 'night_sweats', label: 'Night Sweats' },
];

const Predict = () => {
  const [formData, setFormData] = useState({
    age: 30,
    gender: 1, // 1 = Male, 0 = Female
    bmi: 22.5,
    blood_pressure_sys: 120,
    blood_pressure_dia: 80,
    sugar_level: 95,
    cholesterol: 180,
    heart_rate: 72,
    temperature: 98.6,
    smoking_status: 0,
    sudden_numbness: 0,
    slurred_speech: 0,
    thyroid_swelling: 0,
    unexplained_lump: 0,
    night_sweats: 0
  });
  
  const [symptoms, setSymptoms] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Analyzing...");
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoadingUser(false);
      if (u) {
        try {
          const res = await fetch(`http://localhost:8000/profile/${u.uid}`);
          if (res.ok) {
            const profileData = await res.json();
               if (profileData && Object.keys(profileData).length > 0) {
                 setFormData({
                   age: profileData.age,
                   gender: profileData.gender,
                   bmi: profileData.bmi,
                   blood_pressure_sys: profileData.blood_pressure_sys,
                   blood_pressure_dia: profileData.blood_pressure_dia,
                   sugar_level: profileData.sugar_level,
                   temperature: profileData.temperature,
                   cholesterol: profileData.cholesterol || 180,
                   heart_rate: profileData.heart_rate || 72,
                   smoking_status: profileData.smoking_status || 0,
                   sudden_numbness: 0,
                   slurred_speech: 0,
                   thyroid_swelling: 0,
                   unexplained_lump: 0,
                   night_sweats: 0
                 });
               }
          }
        } catch (err) {
          console.error("Local SQL Database Fetch Error:", err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Rotate loading text for better UX during AI consultation
  useEffect(() => {
    let interval;
    if (loading) {
      const stages = [
        "Scanning Bio-Vitals...",
        "Consulting AI Medics...", 
        "Syncing Patient History...",
        "Finalizing Diagnostic Map..."
      ];
      let current = 0;
      setLoadingStage(stages[0]);
      interval = setInterval(() => {
        current = (current + 1) % stages.length;
        setLoadingStage(stages[current]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleAutoFill = () => {
    setFormData({
      age: 72,
      gender: 1,
      bmi: 26.2,
      blood_pressure_sys: 175,
      blood_pressure_dia: 95,
      sugar_level: 115,
      cholesterol: 210,
      heart_rate: 82,
      temperature: 98.4,
      smoking_status: 1,
      sudden_numbness: 1,
      slurred_speech: 1,
      thyroid_swelling: 0
    });
    // Set some symptoms that lead to Stroke for a 'real' feel
    setSymptoms([
      { value: 'sudden_numbness', label: 'Sudden Numbness / Weakness' },
      { value: 'slurred_speech', label: 'Slurred Speech / Confusion' }
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Prepare payload
    const payload = { ...formData };
    
    // Convert symptoms array to 0/1 features
    SYMPTOM_OPTIONS.forEach(opt => {
      payload[opt.value] = symptoms.some(s => s.value === opt.value) ? 1 : 0;
    });

    try {
      // CONSOLIDATED PIPELINE: Backend now handles history save internally via user_id
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          user_id: user?.uid // Pass user_id for internal auto-save
        })
      });

      if (!response.ok) throw new Error("API request failed");
      
      const data = await response.json();
      setResult(data);

    } catch (err) {
      setError("Execution Error: Review backend console or payload parameters.");
      console.error(err);
    }
    setLoading(false);
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: document.documentElement.classList.contains('dark') ? '#121212' : '#ffffff',
      borderColor: document.documentElement.classList.contains('dark') ? '#333333' : '#e5e7eb',
      color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: document.documentElement.classList.contains('dark') ? '#181818' : '#ffffff',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused 
        ? (document.documentElement.classList.contains('dark') ? '#333333' : '#f3f4f6') 
        : (document.documentElement.classList.contains('dark') ? '#181818' : '#ffffff'),
      color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000',
    }),
    singleValue: (base) => ({
      ...base,
      color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000',
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: document.documentElement.classList.contains('dark') ? '#333333' : '#e5e7eb',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000',
    }),
  };

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col md:flex-row gap-8">
      {/* Input Form Column */}
      <div className="flex-1 bg-white dark:bg-netflix-card p-8 rounded-xl shadow-lg border border-gray-100 dark:border-netflix-border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-extrabold dark:text-blue-400 text-blue-800 tracking-tight">Health Prediction Engine</h2>
          <button 
            type="button"
            onClick={handleAutoFill}
            className="text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-netflix-border hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            AI Clinical Preset
          </button>
        </div>
        
        {loadingUser ? (
          <div className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-netflix-border bg-gray-50 dark:bg-netflix-bg rounded-xl text-center p-6 animate-pulse">
             <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
               <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
             </div>
             <p className="mb-2 text-xl font-bold text-gray-700 dark:text-gray-300">Validating Secure Session</p>
             <p className="text-gray-500 font-medium text-sm">Synchronizing your encrypted clinical key...</p>
          </div>
        ) : user ? (
          <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">Patient Age</label>
              <input type="number" name="age" value={formData.age} onChange={handleInputChange} required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">Biological Sex</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange} required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white">
                <option value={1}>Male</option>
                <option value={0}>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">Body Mass Index (BMI)</label>
              <input type="number" step="0.1" name="bmi" value={formData.bmi} onChange={handleInputChange} required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">Blood Sugar (mg/dL)</label>
              <input type="number" name="sugar_level" value={formData.sugar_level} onChange={handleInputChange} required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">BP Systolic</label>
              <input type="number" name="blood_pressure_sys" value={formData.blood_pressure_sys} onChange={handleInputChange} required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">BP Diastolic</label>
              <input type="number" name="blood_pressure_dia" value={formData.blood_pressure_dia} onChange={handleInputChange} required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">Cholesterol (mg/dL)</label>
              <input type="number" name="cholesterol" value={formData.cholesterol} onChange={handleInputChange} required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">Resting Heart Rate</label>
              <input type="number" name="heart_rate" value={formData.heart_rate} onChange={handleInputChange} required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">Temperature (°F)</label>
              <input type="number" step="0.1" name="temperature" value={formData.temperature} onChange={handleInputChange} required
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
            </div>
            <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-netflix-border">
              <input 
                type="checkbox" 
                id="smoking_status" 
                checked={formData.smoking_status === 1}
                onChange={(e) => setFormData(p => ({...p, smoking_status: e.target.checked ? 1 : 0}))}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="smoking_status" className="text-gray-900 dark:text-white font-bold text-sm cursor-pointer">Regular Smoker</label>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase tracking-wide text-xs">Observe Symptoms</label>
            <Select 
              isMulti
              options={SYMPTOM_OPTIONS}
              styles={customSelectStyles}
              className="basic-multi-select"
              classNamePrefix="select"
              onChange={setSymptoms}
              placeholder="e.g. Chest Pain, Fatigue..."
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-extrabold text-lg py-4 rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl hover:-translate-y-1 transform duration-200"
          >
            {loading ? loadingStage : 'Predict Disease'}
          </button>
          
          {error && <p className="text-red-500 font-bold mt-2">{error}</p>}
        </form>
        ) : (
          <div className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-xl text-center p-6">
             <p className="mb-4 text-xl font-bold text-red-600 dark:text-red-400">⚠️ Authentication is strictly required</p>
             <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium">You must sign in globally to invoke the Machine Learning prediction APIs.</p>
             <button onClick={() => window.location.href='/auth'} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition shadow-xl">
               Proceed to Secure Sign In
             </button>
          </div>
        )}
      </div>

      {/* Result Column */}
      <div className="md:w-1/3 flex flex-col justify-start">
        {result ? (
          <div className="animate-fade-in-up space-y-6">
            <Speedometer 
              confidence={result.confidence} 
              disease={result.disease} 
              riskLevel={result.risk_level} 
            />
            
            {result.suggested_medicines && result.suggested_medicines.length > 0 && (
               <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700 p-6 rounded-2xl shadow-lg relative overflow-hidden duration-500 animate-in fade-in zoom-in-95">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                  
                  <h3 className="text-lg font-black text-blue-900 dark:text-blue-400 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    AI Suggested Treatment
                  </h3>
                  
                  <ul className="space-y-3 relative z-10">
                    {result.suggested_medicines.map((med, idx) => (
                      <li key={idx} className="flex items-start bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-3 rounded-xl border border-white/50 dark:border-gray-700/50 shadow-sm transition-transform hover:-translate-y-1 cursor-default">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center text-xs mr-3 mt-0.5">{idx + 1}</span>
                        <span className="text-gray-800 dark:text-gray-200 font-bold text-sm leading-snug">{med}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <p className="mt-5 text-[10px] uppercase tracking-widest text-red-500 font-black opacity-80 text-center flex justify-center items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                    Consult Physician First
                  </p>
               </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 h-[400px] flex flex-col items-center justify-center text-center">
             <div className="w-24 h-24 mb-4 text-blue-200 dark:text-gray-600">
               {/* Just a simple placeholder illustration shape */}
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
             </div>
             <h3 className="text-xl font-bold dark:text-gray-300 text-gray-500">Awaiting Input</h3>
             <p className="text-gray-400 mt-2">Fill the form and hit predict to see results visualized.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Predict;
