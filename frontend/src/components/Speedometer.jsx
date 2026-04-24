import React, { useEffect, useState } from 'react';

const Speedometer = ({ confidence, disease, riskLevel }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Animate the needle on mount
    const timer = setTimeout(() => {
      setAnimatedValue(confidence);
    }, 500);
    return () => clearTimeout(timer);
  }, [confidence]);

  // Determine arc colors based on default logic
  let badgeColor = 'bg-gray-200 text-gray-800 border-gray-300';
  let needleColor = '#374151'; // dark gray
  
  if (riskLevel === 'Low') {
    badgeColor = 'bg-green-100 text-green-800 border-green-300';
    needleColor = '#00e676';
  } else if (riskLevel === 'Medium') {
    badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    needleColor = '#ffc400';
  } else if (riskLevel === 'High') {
    badgeColor = 'bg-red-100 text-red-800 border-red-300 shadow-red-500/50 shadow-lg';
    needleColor = '#ff1744';
  }

  // Calculate rotation for needle (0% = -90deg, 100% = 90deg)
  const rotation = (animatedValue * 180) - 90;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 w-full">
      <h2 className="text-2xl font-bold mb-6 dark:text-gray-100 text-gray-800">
        Prediction Result
      </h2>
      
      {/* Custom SVG Gauge */}
      <div className="relative w-64 h-32 overflow-hidden flex justify-center">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Background tracks */}
          <path d="M 10,100 A 90,90 0 0,1 70,29.2" fill="none" stroke="#00e676" strokeWidth="20" />
          <path d="M 70,29.2 A 90,90 0 0,1 130,29.2" fill="none" stroke="#ffc400" strokeWidth="20" />
          <path d="M 130,29.2 A 90,90 0 0,1 190,100" fill="none" stroke="#ff1744" strokeWidth="20" />
          
          {/* Needle Center Pivot */}
          <circle cx="100" cy="100" r="10" fill={needleColor} />
          
          {/* Needle Line */}
          <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '100px 100px', transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <polygon points="96,100 104,100 100,20" fill={needleColor} />
          </g>
        </svg>
      </div>
      
      <div className="text-center mt-6">
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-1">Detected Disease:</p>
        <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-4">{disease}</p>
        
        <div className={`px-4 py-2 border rounded-full text-lg font-bold ${badgeColor} transition-all duration-500`}>
          Risk Level: {riskLevel} ({Math.round(confidence * 100)}%)
        </div>
      </div>
    </div>
  );
};

export default Speedometer;
