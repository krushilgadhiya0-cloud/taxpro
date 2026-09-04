import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { formatDate } from '../../lib/dateUtils';

export default function TimeTrackingView({ onShowToast }) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [taskName, setTaskName] = useState('');
  
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopAndSave = () => {
    if (seconds === 0) return;
    
    const formattedDate = formatDate(new Date());
    const formattedDuration = formatTime(seconds);
    
    setHistory(prev => [
      {
        id: Date.now(),
        task: taskName || 'Untitled Session',
        duration: formattedDuration,
        date: formattedDate
      },
      ...prev
    ]);
    
    setIsActive(false);
    setSeconds(0);
    if (onShowToast) onShowToast(`Timer stopped. ${formattedDuration} logged successfully!`, 'success');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Live Time Tracking</h1>
        <p className="text-xs text-gray-500 mt-1">Real-time stopwatch timer for client billable hours.</p>
      </div>

      <div className="max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-xs text-center mx-auto sm:mx-0">
        <input 
          type="text" 
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          placeholder="Enter Task Name..."
          className="w-full text-center font-bold text-gray-800 text-sm bg-gray-50 border border-gray-200 rounded-xl p-2 mb-6 outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <div className="text-5xl font-black font-mono text-[#5b52e0] my-4 tracking-wider">
          {formatTime(seconds)}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white shadow-md flex justify-center items-center gap-2 transition-colors ${
              isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isActive ? 'Pause Timer' : 'Start Timer'}</span>
          </button>

          <button 
             onClick={handleStopAndSave}
             disabled={seconds === 0}
             className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-900 border border-black text-white hover:bg-black font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
           >
             Save Log
           </button>

          <button 
             onClick={() => { setIsActive(false); setSeconds(0); }}
             className="p-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 transition-colors"
             title="Reset Timer"
           >
             <RotateCcw className="w-4 h-4" />
           </button>
         </div>
       </div>

       {/* Previous Logs */}
       <div className="mt-10 max-w-4xl">
         <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
           <Timer className="w-4 h-4 text-[#5b52e0]" /> Previous Time Logs ({history.length})
         </h3>
         
         {history.length === 0 ? (
           <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 text-sm">
             No tracked time logs yet. Start the timer to begin logging.
           </div>
         ) : (
           <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
             <table className="w-full text-left text-xs">
               <thead>
                 <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase">
                   <th className="p-4">Task Name</th>
                   <th className="p-4">Duration</th>
                   <th className="p-4 hidden sm:table-cell">Date</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                 {history.map(item => (
                   <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                     <td className="p-4 break-words">{item.task}</td>
                     <td className="p-4 font-mono font-bold text-emerald-600">{item.duration}</td>
                     <td className="p-4 hidden sm:table-cell">{item.date}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}
       </div>

     </div>
   );
}
