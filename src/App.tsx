import { useEffect, useState } from 'react';
import { useStore, startPolling } from './store';
import { EventListScreen } from './components/EventListScreen';
import { EventPositionTab } from './components/EventPositionTab';
import { StaffTab } from './components/StaffTab';
import { ShiftTab } from './components/ShiftTab';
import { Calendar, Users, Grid, ChevronLeft } from 'lucide-react';

function App() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'event' | 'staff' | 'shift'>('event');
  
  const { Events, error } = useStore();

  useEffect(() => {
    startPolling();
  }, []);

  const selectedEvent = selectedEventId ? Events.find(e => e.id === selectedEventId) : null;

  return (
    <div className="container">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-teal-400">
            Shift Manager Pro
          </h1>
          <p className="text-gray-500 text-sm mt-1">Google Sheets Connected</p>
        </div>
        
        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-red-500 text-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              エラー: {error}
            </span>
          ) : (
            <span className="text-green-500 text-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              同期中
            </span>
          )}
        </div>
      </header>

      {!selectedEventId ? (
        <EventListScreen onSelectEvent={setSelectedEventId} />
      ) : (
        <div className="fade-in">
          <div className="mb-6 flex items-center gap-4">
            <button 
              className="btn btn-secondary btn-sm flex items-center gap-1"
              onClick={() => {
                setSelectedEventId(null);
                setActiveTab('event');
              }}
            >
              <ChevronLeft size={16} /> ホームに戻る
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              {selectedEvent?.name} <span className="text-sm font-normal text-gray-500 ml-2">{selectedEvent?.date}</span>
            </h2>
          </div>

          <div className="tabs">
            <div 
              className={`tab ${activeTab === 'event' ? 'active' : ''} flex items-center gap-2`}
              onClick={() => setActiveTab('event')}
            >
              <Calendar size={18} /> ポジション管理
            </div>
            <div 
              className={`tab ${activeTab === 'staff' ? 'active' : ''} flex items-center gap-2`}
              onClick={() => setActiveTab('staff')}
            >
              <Users size={18} /> スタッフ管理
            </div>
            <div 
              className={`tab ${activeTab === 'shift' ? 'active' : ''} flex items-center gap-2`}
              onClick={() => setActiveTab('shift')}
            >
              <Grid size={18} /> シフト作成
            </div>
          </div>

          <main>
            {activeTab === 'event' && <EventPositionTab eventId={selectedEventId} />}
            {activeTab === 'staff' && <StaffTab eventId={selectedEventId} />}
            {activeTab === 'shift' && <ShiftTab eventId={selectedEventId} />}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
