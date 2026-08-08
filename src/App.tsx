import { useEffect, useState } from 'react';
import { useStore, startPolling } from './store';
import { EventListScreen } from './components/EventListScreen';
import { EventPositionTab } from './components/EventPositionTab';
import { StaffTab } from './components/StaffTab';
import { ShiftTab } from './components/ShiftTab';
import { ShiftTableTab } from './components/ShiftTableTab';
import { Calendar, Users, Grid, ChevronLeft, Table } from 'lucide-react';

function App() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'event' | 'staff' | 'shift' | 'shiftTable'>('event');
  
  const { Events, error, isLoading, setActiveEventId } = useStore();

  useEffect(() => {
    startPolling();
  }, []);

  const selectedEvent = selectedEventId ? Events.find(e => e.id === selectedEventId) : null;

  return (
    <div className="container">
      <div className="sticky top-0 z-40 bg-gray-100 shadow-sm" style={{ margin: '-2rem -2rem 1.5rem -2rem', padding: '2rem 2rem 0 2rem' }}>
        <header className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-teal-400">
              Shift Manager Pro v2
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

        {selectedEventId && !isLoading && (
          <div className="fade-in pb-2">
            <div className="mb-4 flex items-center gap-4">
              <button 
                className="btn btn-secondary btn-sm flex items-center gap-1"
                onClick={() => {
                  setSelectedEventId(null);
                  setActiveEventId(null);
                  setActiveTab('event');
                }}
              >
                <ChevronLeft size={16} /> ホームに戻る
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedEvent?.name} <span className="text-sm font-normal text-gray-500 ml-2">
                  {selectedEvent?.date} 
                  {(selectedEvent?.startTime && selectedEvent?.endTime) && ` (${selectedEvent.startTime} - ${selectedEvent.endTime})`}
                </span>
              </h2>
            </div>

            <div className="tabs mb-0">
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
              <div 
                className={`tab ${activeTab === 'shiftTable' ? 'active' : ''} flex items-center gap-2`}
                onClick={() => setActiveTab('shiftTable')}
              >
                <Table size={18} /> シフト表
              </div>
            </div>
          </div>
        )}
        {!selectedEventId && <div className="pb-4"></div>}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 fade-in">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Google Spreadsheetからデータを読み込んでいます...</p>
        </div>
      ) : !selectedEventId ? (
        <EventListScreen onSelectEvent={(id) => {
          setSelectedEventId(id);
          setActiveEventId(id);
        }} />
      ) : (
        <div className="fade-in">
          <main className="mt-4">
            {activeTab === 'event' && <EventPositionTab eventId={selectedEventId} />}
            {activeTab === 'staff' && <StaffTab eventId={selectedEventId} />}
            {activeTab === 'shift' && <ShiftTab eventId={selectedEventId} />}
            {activeTab === 'shiftTable' && <ShiftTableTab eventId={selectedEventId} />}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
