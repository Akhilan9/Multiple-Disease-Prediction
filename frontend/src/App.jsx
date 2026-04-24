import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Moon, Sun, ActivitySquare, User, LogOut, LayoutDashboard, Stethoscope, MapPin, Bell } from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import Home from './pages/Home';
import Predict from './pages/Predict';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Locator from './pages/Locator';
import Reminders from './pages/Reminders';
import Profile from './pages/Profile';

// --- SYSTEM AUDIO BYPASS ENGINE ---
let globalAudioCtx = null;
let isAudioUnlocked = false;
let alarmInterval = null;

const unlockAudioEngine = () => {
    if (isAudioUnlocked) return;
    try {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        globalAudioCtx.resume();
        
        // Play a 1-millisecond silent sub-bass frequency to mathematically unlock the local AudioContext loop forever
        const osc = globalAudioCtx.createOscillator();
        const gain = globalAudioCtx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(globalAudioCtx.destination);
        osc.start(0);
        osc.stop(globalAudioCtx.currentTime + 0.01);

        isAudioUnlocked = true;
    } catch(e) {}
};

const startContinuousAlarm = () => {
    if (alarmInterval) clearInterval(alarmInterval);
    
    // Smooth, Premium Smartphone Reminder Sound (Marimba Arpeggio)
    const playSmoothReminder = () => {
        try {
            let ctx = globalAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
            globalAudioCtx = ctx;
            ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine'; // Smooth, glass-like tone
            
            // Rapid upward 3-note chord common in digital alarms: C6 -> E6 -> G6
            osc.frequency.setValueAtTime(1046.50, ctx.currentTime);       // Plink 1
            osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.15); // Plink 2
            osc.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.30); // Plink 3
            
            // Volume Envelope (Quick attacks and rapid decays creating that xylophone 'plink' effect)
            gain.gain.setValueAtTime(0, ctx.currentTime);
            
            // Envelope 1
            gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
            
            // Envelope 2
            gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.17);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.29);
            
            // Envelope 3 (Lets the final highest note ring out softly)
            gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.32);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.25);
        } catch (e) {
            console.error("Audio Context Boot Failure:", e);
        }
    };
    
    playSmoothReminder();
    // Replay this incredibly cleanly engineered chime every 2.5 seconds until acknowledged
    alarmInterval = setInterval(playSmoothReminder, 2500); 
};

const stopContinuousAlarm = () => {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
};

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);

  useEffect(() => {
    // Read local storage bias or default to dark mode for Netflix premium feel
    const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [darkMode]);

  // System Unlocker Binding
  useEffect(() => {
    window.addEventListener('click', unlockAudioEngine);
    window.addEventListener('touchstart', unlockAudioEngine);
    window.addEventListener('keydown', unlockAudioEngine);
    return () => {
      window.removeEventListener('click', unlockAudioEngine);
      window.removeEventListener('touchstart', unlockAudioEngine);
      window.removeEventListener('keydown', unlockAudioEngine);
    };
  }, []);

  // Global Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Global Reminder Background Worker
  useEffect(() => {
    let intervalId;
    if (currentUser) {
      // Prompt for OS push permissions early
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
          Notification.requestPermission();
      }

      const checkReminders = async () => {
        try {
          const res = await fetch(`http://localhost:8000/history/reminders/${currentUser.uid}`);
          if (!res.ok) return;
          const reminders = await res.json();
          
          const now = new Date();
          // Format current time properly (e.g. "08:05")
          const currentHours = now.getHours().toString().padStart(2, '0');
          const currentMins = now.getMinutes().toString().padStart(2, '0');
          const currentTimeStr = `${currentHours}:${currentMins}`;
          
          // Generate a string that resets daily for tracking tracking
          const todayDateStr = now.toLocaleDateString();
          
          // Pull the persistent tracking JSON map from local storage to prevent spam!
          let notifiedLog = JSON.parse(localStorage.getItem('health_notified_log')) || {};

          for (const rem of reminders) {
             // Browser intervals are heavily delayed when tabs are out-of-focus. 
             // We use a Greater-Than logic gate to ensure missed minutes during deep-sleep are instantly triggered upon wake.
             if (currentTimeStr >= rem.time) {
                // Determine a unique signature for this exact reminder on this exact day
                const signature = `${rem.id}_${todayDateStr}`;
                
                if (!notifiedLog[signature]) {
                   // 1. Trigger Endless Alarm Loop (Bypasses OS silencing/focus-assist)
                   try {
                     startContinuousAlarm();
                   } catch (e) {
                     console.warn("Global Audio Engine Loop failed:", e);
                   }

                   // 2. Guaranteed In-App UI Interrupt (Toast Popup)
                   setActiveAlert(rem);
                   
                   // 3. Attempt Background OS Push (If granted)
                   if (Notification.permission === "granted") {
                      new Notification("💊 Medication Alert", { 
                          body: `Time to take your scheduled dose: ${rem.medicineName} (${rem.dosage})`
                      });
                   }
                   
                   // Mark as deployed to strictly prevent duplication
                   notifiedLog[signature] = true;
                }
             }
          }
          
          // Save the deployed list permanently so refreshing the page doesn't double-spawn it
          localStorage.setItem('health_notified_log', JSON.stringify(notifiedLog));

        } catch (err) {
          // Swallow silent background database errors gracefully
        }
      };

      // Run strictly at mount to check if it's currently time
      checkReminders();
      
      // Ping SQLite every 30 seconds to guarantee we perfectly intersect the 00-second mark
      intervalId = setInterval(checkReminders, 30000);
    }
    
    return () => clearInterval(intervalId);
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-medical-light dark:bg-netflix-bg text-medical-blue dark:text-gray-100 transition-colors duration-500">
        {/* Navigation Bar */}
        <nav className="bg-white dark:bg-netflix-nav shadow-lg border-b border-gray-100 dark:border-netflix-border p-4 sticky top-0 z-50 transition-colors duration-500">
          <div className="container mx-auto flex justify-between items-center">
            
            <Link to="/" className="flex items-center text-2xl font-extrabold text-blue-600 dark:text-blue-500 tracking-tight transform hover:scale-[1.02] transition">
              <ActivitySquare className="mr-2 h-8 w-8" />
              <span className="hidden md:inline">HealthPredict AI</span>
            </Link>
            
            <div className="flex items-center space-x-4 md:space-x-8 text-sm md:text-base">
              
              {currentUser && (
                <>
                  <div className="flex space-x-5 md:space-x-8">
                    <Link to="/dashboard" className="flex items-center dark:text-gray-100 hover:text-blue-600 dark:hover:text-white font-black transition group">
                      <LayoutDashboard className="h-5 w-5 md:mr-2 group-hover:-translate-y-0.5 transition" />
                      <span className="hidden md:inline">Dashboard</span>
                    </Link>
                    <Link to="/predict" className="flex items-center dark:text-gray-100 hover:text-blue-600 dark:hover:text-white font-black transition group">
                      <Stethoscope className="h-5 w-5 md:mr-2 group-hover:-translate-y-0.5 transition" />
                      <span className="hidden md:inline">Predict</span>
                    </Link>
                    <Link to="/reminders" className="flex items-center dark:text-gray-100 hover:text-blue-600 dark:hover:text-white font-black transition group">
                      <Bell className="h-5 w-5 md:mr-2 group-hover:-translate-y-0.5 transition" />
                      <span className="hidden md:inline">Reminders</span>
                    </Link>
                    <Link to="/locator" className="flex items-center dark:text-gray-100 hover:text-blue-600 dark:hover:text-white font-black transition group">
                      <MapPin className="h-5 w-5 md:mr-2 group-hover:-translate-y-0.5 transition" />
                      <span className="hidden md:inline">Locator</span>
                    </Link>
                  </div>
                  
                  <div className="border-l border-gray-300 dark:border-netflix-border h-8 mx-2 hidden md:block"></div>
                </>
              )}
              
              <div className="flex items-center space-x-3">
                {currentUser ? (
                  <Link to="/profile" className="flex items-center space-x-3 bg-gray-50 dark:bg-netflix-card px-3 py-1.5 rounded-full border border-gray-200 dark:border-netflix-border shadow-sm group hover:border-blue-500 dark:hover:border-blue-500 transition cursor-pointer">
                    <User className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="hidden lg:inline text-gray-700 dark:text-gray-300 font-bold truncate max-w-[120px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {currentUser.email?.split('@')[0]}
                    </span>
                    <button 
                      onClick={(e) => { e.preventDefault(); handleLogout(); }}
                      className="p-1.5 ml-2 text-red-500 hover:bg-red-600 hover:text-white dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white rounded-full transition"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </Link>
                ) : (
                  <Link to="/auth" className="flex items-center bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5">
                    <User className="h-4 w-4 mr-2 hidden md:block" /> Sign In
                  </Link>
                )}

                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 ml-1 rounded-full border border-gray-200 dark:border-netflix-border bg-gray-50 hover:bg-gray-100 dark:bg-netflix-card dark:text-gray-300 dark:hover:bg-[#222] transition shadow-inner group"
                  title="Toggle Dark Mode"
                >
                  {darkMode ? <Sun className="h-5 w-5 text-yellow-500 group-hover:rotate-45 transition" /> : <Moon className="h-5 w-5 text-indigo-500 group-hover:-rotate-12 transition" />}
                </button>
              </div>
              
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/locator" element={<Locator />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
        
        {/* Sleek Bottom-Right Toast Medical Alert Modal */}
        {activeAlert && (
          <div className="fixed bottom-6 right-6 z-[9999] w-full max-w-sm animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="bg-white dark:bg-netflix-card p-5 rounded-2xl shadow-[0_20px_60px_rgba(37,99,235,0.25)] border-l-4 border-blue-500 transform scale-100 border border-gray-100 dark:border-netflix-border">
               <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center">
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-2.5 rounded-full mr-3 shadow-inner">
                      <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Medication Due</h2>
                 </div>
               </div>
               
               <div className="bg-gray-50 dark:bg-netflix-bg p-4 rounded-xl mb-4 border border-gray-100 dark:border-netflix-border">
                 <h3 className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">{activeAlert.medicineName}</h3>
                 <p className="text-lg font-bold text-gray-700 dark:text-gray-300 mt-1">{activeAlert.dosage}</p>
                 <div className="mt-3 flex items-center space-x-2">
                   <span className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">{activeAlert.time}</span>
                   <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">{activeAlert.frequency}</span>
                 </div>
               </div>
               
               <button 
                 onClick={() => {
                   setActiveAlert(null);
                   stopContinuousAlarm();
                 }}
                 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-3 rounded-xl shadow hover:shadow-lg transition-all active:scale-[0.98]"
               >
                 Acknowledge
               </button>
            </div>
          </div>
        )}

      </div>
    </Router>
  );
}

export default App;
