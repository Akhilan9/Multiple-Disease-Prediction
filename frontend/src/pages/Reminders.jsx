import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Plus, X, Check, Clock, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const navigate = useNavigate();

  // New Reminder Form State
  const [newReminder, setNewReminder] = useState({
    medicineName: '',
    dosage: '',
    frequency: 'Daily',
    time: '08:00',
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchReminders(u.uid);
      }
      setLoadingUser(false);
    });
    return () => unsub();
  }, []);

  const fetchReminders = async (uid) => {
    try {
      const response = await fetch(`http://localhost:8000/history/reminders/${uid}`);
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      }
    } catch (err) {
      console.error("Local SQL DB Error:", err);
    }
  };

  const handleEditClick = (rem) => {
    setEditingId(rem.id);
    setNewReminder({ 
      medicineName: rem.medicineName, 
      dosage: rem.dosage, 
      frequency: rem.frequency, 
      time: rem.time 
    });
    setShowAddForm(true);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setNewReminder({ medicineName: '', dosage: '', frequency: 'Daily', time: '08:00' });
  };

  const handleSaveReminder = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Must be logged in to save reminders");
      return;
    }
    
    // CamelCase strictly formatted for our new Python Pydantic Model!
    const reminderObj = { 
      ...newReminder, 
      userId: user.uid, 
      timestamp: Date.now() 
    };
    
    const currentEditingId = editingId;
    
    // OPTIMISTIC UI UPDATE
    if (currentEditingId) {
      setReminders(reminders.map(r => r.id === currentEditingId ? { id: currentEditingId, ...reminderObj } : r));
    } else {
      setReminders([...reminders, { id: `temp-${Date.now()}`, ...reminderObj }]);
    }
    closeForm(); // Execute physically before network execution
    
    // Localhost Fullstack Python SQLite Request
    try {
      if (currentEditingId) {
        await fetch(`http://localhost:8000/history/reminders/${currentEditingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reminderObj)
        });
      } else {
        await fetch('http://localhost:8000/history/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reminderObj)
        });
        // Background Resync to override tempIDs securely
        fetchReminders(user.uid);
      }
    } catch (err) {
      console.error("Python Server Connection Error:", err);
      alert("Error saving securely to Local SQLite.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-netflix-card p-6 rounded-xl shadow-md border border-gray-100 dark:border-netflix-border">
        <div>
          <h1 className="text-3xl font-bold dark:text-white flex items-center tracking-tight">
            <Clock className="mr-3 text-blue-600 dark:text-blue-400 h-8 w-8" /> 
            Active Prescriptions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manage your daily medication schedules.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-netflix-card p-6 rounded-xl shadow-md border border-gray-100 dark:border-netflix-border min-h-[50vh]">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {reminders.map(rem => (
             <div key={rem.id} className="relative group flex justify-between items-center p-5 bg-gray-50 dark:bg-netflix-bg border border-gray-200 dark:border-netflix-border rounded-xl shadow-sm hover:shadow transition">
               <div>
                 <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">{rem.medicineName}</h3>
                 <span className="text-gray-600 dark:text-gray-400 font-semibold text-sm">{rem.dosage}</span>
               </div>
               <div className="text-right">
                 <div className="bg-gray-200 dark:bg-gray-800 font-extrabold text-gray-800 dark:text-white px-3 py-1 rounded-md text-sm shadow-inner">{rem.time}</div>
                 <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase font-bold tracking-wider">{rem.frequency}</div>
               </div>
               
               <button 
                  onClick={() => handleEditClick(rem)} 
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2 rounded-full shadow-md hover:bg-blue-200 dark:hover:bg-blue-800"
                  title="Modify Parameter"
               >
                 <Edit className="h-4 w-4" />
               </button>
             </div>
          ))}
          {user && reminders.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 font-bold opacity-60">
               No active prescriptions in SQL Database.
            </div>
          )}
        </div>

        {loadingUser ? (
          <div className="w-full flex items-center justify-center p-6 text-gray-400 dark:text-gray-500">
             <span className="animate-pulse font-bold tracking-widest uppercase text-sm">Validating Session...</span>
          </div>
        ) : user ? (
          <button 
             onClick={() => setShowAddForm(true)}
             className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 hover:text-blue-500 hover:border-blue-500 transition font-bold text-lg"
          >
             <Plus className="mr-2 h-6 w-6" /> Add Medication Reminder
          </button>
        ) : (
          <div className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 font-bold text-center">
             <p className="mb-3 text-lg">⚠️ You must be logged in to execute Python writes.</p>
             <button onClick={() => navigate('/auth')} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition shadow-md">
               Sign In to Enable Med Tracker
             </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-netflix-card p-8 rounded-2xl shadow-2xl w-full max-w-md border border-transparent dark:border-netflix-border transform scale-100 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold dark:text-white tracking-tight">{editingId ? 'Modify Details' : 'New Reminder'}</h2>
              <button 
                onClick={closeForm} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveReminder} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Medicine Name</label>
                <input type="text" required placeholder="e.g. Lisinopril" 
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  value={newReminder.medicineName} onChange={e => setNewReminder({...newReminder, medicineName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Dosage</label>
                <input type="text" required placeholder="e.g. 10mg" 
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  value={newReminder.dosage} onChange={e => setNewReminder({...newReminder, dosage: e.target.value})} />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                  <select 
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    value={newReminder.frequency} onChange={e => setNewReminder({...newReminder, frequency: e.target.value})}
                  >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>As Needed</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Time</label>
                  <input type="time" required
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    value={newReminder.time} onChange={e => setNewReminder({...newReminder, time: e.target.value})} />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-8">
                <button type="button" onClick={closeForm} 
                  className="flex-1 py-3 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-bold transition">Cancel</button>
                <button type="submit" 
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl rounded-xl font-bold flex justify-center items-center transition">
                    <Check className="mr-2 h-5 w-5"/> {editingId ? 'Update' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
