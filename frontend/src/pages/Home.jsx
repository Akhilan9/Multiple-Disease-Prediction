import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivitySquare, Stethoscope, Map, Bell, ArrowRight } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, desc, delay }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`p-8 bg-white dark:bg-netflix-card rounded-2xl shadow-xl border border-transparent dark:border-netflix-border transform transition-all duration-700 ease-out hover:-translate-y-2 hover:shadow-2xl hover:border-blue-500/50 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-2xl font-bold mb-3 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
        {desc}
      </p>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center overflow-hidden py-12">
      {/* Hero Section */}
      <div className={`max-w-4xl mx-auto text-center px-4 transition-all duration-1000 ease-out transform ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full font-bold text-sm mb-8 tracking-wide border border-blue-200 dark:border-blue-800">
          <ActivitySquare className="h-4 w-4" />
          <span>HealthPredict AI v2.0 Operational</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight mb-8">
          The Future of
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">
            Intelligent Care
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
          Leverage real-time Machine Learning diagnostics to instantly track symptoms, store medical history, and locate critical healthcare infrastructure worldwide.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <button 
            onClick={() => navigate('/predict')}
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-lg transition-all transform hover:scale-105 shadow-xl hover:shadow-blue-500/30 flex items-center justify-center"
          >
            Run a Prediction <ArrowRight className="ml-2 h-5 w-5" />
          </button>
          
          <button 
            onClick={() => navigate('/auth')}
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-netflix-card text-gray-900 dark:text-white border border-gray-300 dark:border-netflix-border rounded-xl font-extrabold text-lg transition-all hover:bg-gray-50 dark:hover:bg-netflix-bg shadow-md flex items-center justify-center"
          >
            Create an Account
          </button>
        </div>
      </div>

      {/* Dynamic Features Grid */}
      <div className="max-w-6xl mx-auto px-4 mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={Stethoscope}
          title="ML Diagnostics"
          desc="Trained on authoritative UCI Research Datasets, our Scikit-Learn prediction engine utilizes real-world clinical signatures for cardiovascular, diabetic, and infectious condition screening."
          delay={400}
        />
        <FeatureCard 
          icon={Map}
          title="Global Locator"
          desc="Powered by OpenStreetMap infrastructure. Passively detect your coordinates and immediately generate an interactive topological view of all healthcare facilities in a 5km radius."
          delay={600}
        />
        <FeatureCard 
          icon={Bell}
          title="Smart Reminders"
          desc="Synchronized completely securely to Firebase cloud architecture, our encrypted scheduling hooks ensure you never miss a daily dosage regardless of device."
          delay={800}
        />
      </div>
    </div>
  );
};

export default Home;
