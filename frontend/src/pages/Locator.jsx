import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix typical Leaflet missing marker icon issue in Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon for User's Location (Red Pulse)
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
};

const Locator = () => {
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState([51.505, -0.09]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasUserLoc, setHasUserLoc] = useState(false);
  const [locStatus, setLocStatus] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(null);
  const markerRefs = React.useRef(new Map());

  // Effect to automatically open popups when a list item is selected
  useEffect(() => {
    if (selectedIdx !== null && markerRefs.current.has(selectedIdx)) {
      const markerInstance = markerRefs.current.get(selectedIdx);
      if (markerInstance) markerInstance.openPopup();
    }
  }, [selectedIdx]);

  const fetchNearbyHealthcare = async (lat, lng) => {
    setLoading(true);
    setErrorMsg("");
    setLocStatus("Scanning active 5km area for healthcare centers...");
    try {
      const overpassQuery = `
        [out:json];
        (
          nwr["amenity"="hospital"](around:5000,${lat},${lng});
          nwr["amenity"="clinic"](around:5000,${lat},${lng});
          nwr["amenity"="pharmacy"](around:5000,${lat},${lng});
        );
        out center;
      `;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
      
      if (!response.ok) throw new Error("Overpass HTTP Error");
      
      const data = await response.json();
      
      if (data && data.elements && data.elements.length > 0) {
        const mappedLocations = data.elements.map(el => ({
          lat: el.center ? el.center.lat : el.lat,
          lon: el.center ? el.center.lon : el.lon,
          display_name: el.tags?.name || "Healthcare Facility",
          type: el.tags?.amenity || "facility"
        }));
        setLocations(mappedLocations);
        setLocStatus(`Tracking ${mappedLocations.length} healthcare facilities in your radius!`);
        setLoading(false);
        return;
      } else {
         throw new Error("No Overpass Results");
      }
    } catch (err) {
      console.warn("Primary Overpass routing failed, engaging Nominatim fallback...", err);
      try {
        const fallbackResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=hospital|clinic&limit=15&lat=${lat}&lon=${lng}`);
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData && fallbackData.length > 0) {
          const mapped = fallbackData.map(d => ({
             lat: d.lat, 
             lon: d.lon, 
             display_name: d.name || d.display_name.split(',')[0] || "Medical Center", 
             type: "facility" 
          }));
          setLocations(mapped);
          setLocStatus(`Located ${mapped.length} nearby healthcare facilities!`);
          setLoading(false);
          return;
        } else {
           setErrorMsg("No nearby hospitals found in a 5km radius.");
        }
      } catch (fallbackErr) {
        console.error("Total Network Failure:", fallbackErr);
        setErrorMsg("Failed to fetch nearby hospitals. Rate limits exceeded or network offline.");
      }
      setLocStatus("");
    }
    setLoading(false);
  };

  const requestLocation = () => {
    setLoading(true);
    setErrorMsg("");
    setLocStatus("Awaiting browser location approval...");
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCenter([lat, lng]);
          setHasUserLoc(true);
          fetchNearbyHealthcare(lat, lng);
        },
        (err) => {
          setLoading(false);
          setLocStatus("");
          if (err.code === 1) {
            setErrorMsg("BLOCKED: Your browser refused to ask again! You must click the 🔒 Padlock icon in your URL bar, change Location to 'Allow', and refresh the page!");
          } else {
            setErrorMsg("Failed to gather precise GPS data.");
          }
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setLoading(false);
      setErrorMsg("Geolocation is completely unsupported by your browser.");
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const handleManualSearch = async () => {
    if (!query) return;
    setLoading(true);
    setErrorMsg("");
    setLocStatus("Homing in on location...");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=hospital in ${query}`);
      const data = await response.json();
      if (data && data.length > 0) {
        setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setLocations(data.map(d => ({ lat: d.lat, lon: d.lon, display_name: d.display_name, type: "hospital" })));
        setHasUserLoc(false); 
        setLocStatus(`Located ${data.length} hospitals mapping to "${query}"`);
      } else {
        setErrorMsg("No specific hospitals found for that region query.");
        setLocStatus("");
      }
    } catch (err) {
      setErrorMsg("Network failure attempting map jump.");
      setLocStatus("");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-blue-800 dark:text-blue-400 tracking-tight">Regional Healthcare Locator</h1>
        
        {locStatus && <p className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 py-2 px-4 inline-block rounded-full">{locStatus}</p>}
        {errorMsg && <p className="text-red-500 font-bold bg-red-50 dark:bg-red-900/30 py-2 px-4 inline-block rounded-full">{errorMsg}</p>}
        
        <div className="flex justify-center mt-4 space-x-2">
          <button 
            onClick={requestLocation}
            className={`font-bold px-6 py-3 rounded-xl shadow-md transition flex items-center ${hasUserLoc ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-green-600 hover:bg-green-700 text-white'}`}
          >
            <MapPin className="mr-2 h-5 w-5" /> {hasUserLoc ? 'Live Tracking Active' : 'Locate Me Securely'}
          </button>

          <div className="relative w-full max-w-sm">
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none dark:bg-netflix-card dark:text-white dark:border-netflix-border shadow-sm"
              placeholder="Or search city..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            />
            <Search className="absolute left-3 top-3.5 text-gray-400 h-5 w-5" />
          </div>
          <button 
            onClick={handleManualSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition"
          >
            {loading ? '...' : 'Jump'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-netflix-card rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-netflix-border h-[650px] z-0 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px] z-[1000] flex justify-center items-center">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl text-blue-600 dark:text-blue-400 font-extrabold text-xl animate-pulse">Syncing Map Database...</div>
            </div>
          )}
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={center} />
            
            {hasUserLoc && (
              <>
                <Circle 
                  center={center} 
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', weight: 1.5 }} 
                  radius={5000} 
                  fillOpacity={0.05} 
                />
                <Marker position={center} icon={userIcon}>
                  <Popup><strong className="text-red-600">You Are Here</strong><br/>Scanning 5km area.</Popup>
                </Marker>
              </>
            )}

            {locations.map((loc, idx) => (
               <React.Fragment key={idx}>
                 <CircleMarker 
                    center={[parseFloat(loc.lat), parseFloat(loc.lon)]}
                    pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.8 }}
                    radius={6}
                    weight={2}
                 />
                 <Marker 
                    position={[parseFloat(loc.lat), parseFloat(loc.lon)]}
                    ref={(el) => { if (el) markerRefs.current.set(idx, el); }}
                    eventHandlers={{ click: () => setSelectedIdx(idx) }}
                 >
                    <Popup>
                       <strong className="text-blue-800">{loc.display_name}</strong><br/>
                       <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{loc.type}</span>
                    </Popup>
                 </Marker>
               </React.Fragment>
            ))}
          </MapContainer>
        </div>

        <div className="bg-white dark:bg-netflix-card rounded-2xl shadow-xl border border-gray-100 dark:border-netflix-border h-[650px] flex flex-col">
           <div className="p-5 border-b border-gray-100 dark:border-netflix-border bg-gray-50/50 dark:bg-netflix-bg/50">
             <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center">
               <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 rounded-lg mr-3">
                 <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
               </div>
               Located Resources
             </h2>
             <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-widest">{locations.length} FACILITIES MAPPED</p>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
             {locations.length > 0 ? (
               locations.map((loc, idx) => (
                 <button 
                   key={idx}
                   onClick={() => {
                     setCenter([parseFloat(loc.lat), parseFloat(loc.lon)]);
                     setSelectedIdx(idx);
                   }}
                   className={`w-full text-left p-4 rounded-xl border transition-all group ${selectedIdx === idx ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 shadow-inner' : 'bg-transparent border-gray-100 dark:border-netflix-border hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}
                 >
                   <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-black text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{loc.display_name}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${loc.type === 'hospital' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : loc.type === 'pharmacy' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                        {loc.type}
                      </span>
                   </div>
                   <div className="flex items-center text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                     <MapPin className="h-3 w-3 mr-1" /> Jump to site
                   </div>
                 </button>
               ))
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                    <MapPin className="h-8 w-8 opacity-20" />
                  </div>
                  <p className="font-bold text-sm">No facilities located yet.</p>
                  <p className="text-[10px] uppercase font-black tracking-widest mt-2 opacity-50">INITIATE GPS SCAN</p>
               </div>
             )}
           </div>
           
           {locations.length > 0 && (
             <div className="p-4 border-t border-gray-100 dark:border-netflix-border bg-gray-50/30 dark:bg-netflix-bg/30">
               <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">Showing centers in a 5km radius</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Locator;
