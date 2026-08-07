import { useState } from 'react';
import { useStore } from '../store';
import { CalendarPlus, Calendar, ArrowRight } from 'lucide-react';

interface EventListScreenProps {
  onSelectEvent: (eventId: string) => void;
}

export const EventListScreen: React.FC<EventListScreenProps> = ({ onSelectEvent }) => {
  const { Events, dispatchAction } = useStore();
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventRemarks, setNewEventRemarks] = useState('');

  const handleCreateEvent = () => {
    if (!newEventName || !newEventDate) return;
    const newId = crypto.randomUUID();
    dispatchAction('ADD_EVENT', {
      id: newId,
      name: newEventName,
      date: newEventDate,
      remarks: newEventRemarks
    });
    setNewEventName('');
    setNewEventDate('');
    setNewEventRemarks('');
    // After creating, automatically enter that event
    onSelectEvent(newId);
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      {/* Create New Event Panel */}
      <div className="glass-panel col-span-1">
        <h2 className="mb-4 text-xl flex items-center gap-2 text-primary">
          <CalendarPlus size={24} /> 新規イベント作成
        </h2>
        <div className="form-group">
          <label>イベント名</label>
          <input type="text" value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="例: 夏祭り2026" />
        </div>
        <div className="form-group">
          <label>開催日</label>
          <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>備考 (任意)</label>
          <textarea value={newEventRemarks} onChange={e => setNewEventRemarks(e.target.value)} rows={2}></textarea>
        </div>
        <button className="btn btn-primary w-full mt-4" onClick={handleCreateEvent}>作成して管理画面へ進む</button>
      </div>

      {/* Existing Events Panel */}
      <div className="glass-panel col-span-2">
        <h2 className="mb-4 text-xl flex items-center gap-2">
          <Calendar size={24} /> 既存のイベント
        </h2>
        {Events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>まだイベントがありません。</p>
            <p>左側のフォームから最初のイベントを作成してください。</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {Events.map(ev => (
              <div 
                key={ev.id} 
                className="p-5 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer bg-white group flex flex-col justify-between"
                onClick={() => onSelectEvent(ev.id)}
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{ev.name}</h3>
                  <div className="text-sm font-medium text-indigo-500 mb-2">{ev.date}</div>
                  <p className="text-sm text-gray-500 line-clamp-2">{ev.remarks || '備考なし'}</p>
                </div>
                <div className="mt-4 flex justify-end text-gray-400 group-hover:text-primary transition-colors">
                  <ArrowRight size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
