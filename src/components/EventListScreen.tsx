import { useState } from 'react';
import { useStore } from '../store';
import { CalendarPlus, Calendar, ArrowRight, Pencil, Trash2, X } from 'lucide-react';

interface EventListScreenProps {
  onSelectEvent: (eventId: string) => void;
}

export const EventListScreen: React.FC<EventListScreenProps> = ({ onSelectEvent }) => {
  const { Events, dispatchAction } = useStore();
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('09:00');
  const [newEventEndTime, setNewEventEndTime] = useState('18:00');
  const [newEventRemarks, setNewEventRemarks] = useState('');
  const [newEventWorkMinutes, setNewEventWorkMinutes] = useState('240');
  const [newEventBreakMinutes, setNewEventBreakMinutes] = useState('60');

  const [editEventModal, setEditEventModal] = useState<{ id: string; name: string; date: string; startTime: string; endTime: string; remarks: string; workMinutesBeforeBreak?: number; breakMinutes?: number } | null>(null);

  const handleCreateEvent = () => {
    if (!newEventName || !newEventDate) return;
    const newId = crypto.randomUUID();
    dispatchAction('ADD_EVENT', {
      id: newId,
      name: newEventName,
      date: newEventDate,
      startTime: newEventStartTime,
      endTime: newEventEndTime,
      remarks: newEventRemarks
    });
    setNewEventName('');
    setNewEventDate('');
    setNewEventStartTime('09:00');
    setNewEventEndTime('18:00');
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
        <div className="form-row mb-4">
          <div className="form-group mb-0">
            <label>開始時間</label>
            <input type="time" value={newEventStartTime} onChange={e => setNewEventStartTime(e.target.value)} />
          </div>
          <div className="form-group mb-0">
            <label>終了時間</label>
            <input type="time" value={newEventEndTime} onChange={e => setNewEventEndTime(e.target.value)} />
          </div>
        </div>
        <div className="form-row mb-4">
          <div className="form-group mb-0">
            <label>連続勤務の上限 (分)</label>
            <input type="number" min="0" value={newEventWorkMinutes} onChange={e => setNewEventWorkMinutes(e.target.value)} placeholder="例: 240" />
          </div>
          <div className="form-group mb-0">
            <label>必要な休憩 (分)</label>
            <input type="number" min="0" value={newEventBreakMinutes} onChange={e => setNewEventBreakMinutes(e.target.value)} placeholder="例: 60" />
          </div>
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
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{ev.name}</h3>
                    <div className="text-sm font-medium text-indigo-500 mb-2">
                      {ev.date} {(ev.startTime && ev.endTime) && `(${ev.startTime} - ${ev.endTime})`}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{ev.remarks || '備考なし'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-gray-400 hover:text-indigo-500 p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditEventModal({
                          id: ev.id,
                          name: ev.name,
                          date: ev.date,
                          startTime: ev.startTime || '09:00',
                          endTime: ev.endTime || '18:00',
                          remarks: ev.remarks || ''
                        });
                      }}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="text-gray-400 hover:text-red-500 p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`${ev.name} を本当に削除しますか？\n関連するすべてのデータ（ポジション、スタッフ、シフト）が消える可能性があります。`)) {
                          dispatchAction('DELETE_EVENT', { id: ev.id });
                        }
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex justify-end text-gray-400 group-hover:text-primary transition-colors">
                  <ArrowRight size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Event Modal */}
      {editEventModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">イベントの編集</h3>
              <button onClick={() => setEditEventModal(null)} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
            </div>

            <div className="form-group">
              <label>イベント名</label>
              <input type="text" value={editEventModal.name} onChange={e => setEditEventModal({ ...editEventModal, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>開催日</label>
              <input type="date" value={editEventModal.date} onChange={e => setEditEventModal({ ...editEventModal, date: e.target.value })} />
            </div>
            <div className="form-row mb-4">
              <div className="form-group mb-0">
                <label>開始時間</label>
                <input type="time" value={editEventModal.startTime} onChange={e => setEditEventModal({ ...editEventModal, startTime: e.target.value })} />
              </div>
              <div className="form-group mb-0">
                <label>終了時間</label>
                <input type="time" value={editEventModal.endTime} onChange={e => setEditEventModal({ ...editEventModal, endTime: e.target.value })} />
              </div>
            </div>
            <div className="form-row mb-4">
              <div className="form-group mb-0">
                <label>連続勤務の上限 (分)</label>
                <input type="number" min="0" value={editEventModal.workMinutesBeforeBreak} onChange={e => setEditEventModal({...editEventModal, workMinutesBeforeBreak: parseInt(e.target.value) || 0})} />
              </div>
              <div className="form-group mb-0">
                <label>必要な休憩 (分)</label>
                <input type="number" min="0" value={editEventModal.breakMinutes} onChange={e => setEditEventModal({...editEventModal, breakMinutes: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="form-group">
              <label>備考</label>
              <textarea value={editEventModal.remarks} onChange={e => setEditEventModal({ ...editEventModal, remarks: e.target.value })} rows={3}></textarea>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button className="btn btn-secondary" onClick={() => setEditEventModal(null)}>キャンセル</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!editEventModal.name || !editEventModal.date) return;
                  dispatchAction('UPDATE_EVENT', editEventModal);
                  setEditEventModal(null);
                }}
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
