import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { User, Trash2, Pencil } from 'lucide-react';

interface StaffTabProps {
  eventId: string;
}

export const StaffTab: React.FC<StaffTabProps> = ({ eventId }) => {
  const { Events, Staff, Positions, PositionCategories, StaffTraits, dispatchAction } = useStore();
  const currentEvent = Events.find(e => e.id === eventId);
  const defaultStartTime = currentEvent?.startTime || '09:00';
  const defaultEndTime = currentEvent?.endTime || '18:00';
  
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffStartTime, setNewStaffStartTime] = useState(defaultStartTime);
  const [newStaffEndTime, setNewStaffEndTime] = useState(defaultEndTime);
  const [newStaffRemarks, setNewStaffRemarks] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'WCP' | 'ボランティア'>('ボランティア');
  
  useEffect(() => {
    setNewStaffStartTime(defaultStartTime);
    setNewStaffEndTime(defaultEndTime);
  }, [defaultStartTime, defaultEndTime]);
  
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [editStaffModal, setEditStaffModal] = useState<{ id: string; name: string; availableStartTime: string; availableEndTime: string; remarks: string; role?: 'WCP' | 'ボランティア' } | null>(null);

  const eventCategories = PositionCategories.filter(c => c.eventId === eventId);
  const eventCategoryIds = eventCategories.map(c => c.id);
  const eventPositions = Positions.filter(p => eventCategoryIds.includes(p.categoryId));

  const handleCreateStaff = () => {
    if (!newStaffName) return;
    dispatchAction('ADD_STAFF', {
      id: crypto.randomUUID(),
      name: newStaffName,
      availableStartTime: newStaffStartTime,
      availableEndTime: newStaffEndTime,
      remarks: newStaffRemarks,
      role: newStaffRole
    });
    setNewStaffName('');
    setNewStaffStartTime(defaultStartTime);
    setNewStaffEndTime(defaultEndTime);
    setNewStaffRemarks('');
    setNewStaffRole('ボランティア');
  };

  const handleTraitChange = (staffId: string, positionId: string, trait: string) => {
    dispatchAction('UPSERT_TRAIT', {
      staffId,
      positionId,
      trait
    });
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Staff List & Add */}
      <div className="glass-panel col-span-1">
        <h2 className="mb-4 flex items-center gap-2"><User size={20}/> スタッフ追加</h2>
        <div className="form-group">
          <label>名前</label>
          <input type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="例: 山田太郎" />
        </div>
        <div className="form-group">
          <label>権限</label>
          <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as any)}>
            <option value="ボランティア">ボランティア</option>
            <option value="WCP">WCP</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>入れる時間 (開始)</label>
            <input type="time" value={newStaffStartTime} onChange={e => setNewStaffStartTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label>入れる時間 (終了)</label>
            <input type="time" value={newStaffEndTime} onChange={e => setNewStaffEndTime(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>備考</label>
          <textarea value={newStaffRemarks} onChange={e => setNewStaffRemarks(e.target.value)} rows={2}></textarea>
        </div>
        <button className="btn btn-primary w-full" onClick={handleCreateStaff}>追加する</button>

        <div className="mt-6">
          <h3 className="mb-2 text-sm text-gray-500">スタッフ一覧 (クリックで詳細)</h3>
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-2">
            {Staff.map(s => (
              <div 
                key={s.id}
                className={`p-3 border rounded-lg transition-colors cursor-pointer ${selectedStaffId === s.id ? 'border-primary shadow-sm bg-indigo-50/30' : 'bg-white hover:border-gray-300'}`}
                onClick={() => setSelectedStaffId(s.id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {s.name}
                      {s.role === 'WCP' ? (
                        <span className="text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded">WCP</span>
                      ) : (
                        <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">ボランティア</span>
                      )}
                    </div>
                    {(s.availableStartTime && s.availableEndTime) && (
                      <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mt-1">
                        {s.availableStartTime}〜{s.availableEndTime}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="text-gray-400 hover:text-indigo-500 p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditStaffModal({
                          id: s.id,
                          name: s.name,
                          availableStartTime: s.availableStartTime || defaultStartTime,
                          availableEndTime: s.availableEndTime || defaultEndTime,
                          remarks: s.remarks || '',
                          role: s.role || 'ボランティア'
                        });
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      className="text-gray-400 hover:text-red-500 p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`${s.name} さんを本当に削除しますか？`)) {
                          dispatchAction('DELETE_STAFF', { id: s.id });
                          if (selectedStaffId === s.id) setSelectedStaffId(null);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 truncate">{s.remarks}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Traits (Selected Staff) */}
      <div className="col-span-2">
        {selectedStaffId ? (
          <div className="glass-panel">
            <h2 className="mb-4 text-xl">
              {Staff.find(s => s.id === selectedStaffId)?.name} さんの適性設定
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              このイベントの各ポジションに対する適性を選択してください。
            </p>
            
            {eventPositions.length === 0 ? (
              <p className="text-gray-500">このイベントにはまだポジションがありません。</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {eventPositions.map(pos => {
                  const currentTrait = StaffTraits.find(t => t.staffId === selectedStaffId && t.positionId === pos.id)?.trait || '';
                  return (
                    <div key={pos.id} className="p-4 border rounded-lg bg-white shadow-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium">{pos.name}</div>
                        <div className="text-xs text-gray-400">{pos.startTime} - {pos.endTime}</div>
                      </div>
                      <select 
                        className="w-32 border border-gray-300 rounded-md p-2 text-sm"
                        value={currentTrait} 
                        onChange={e => handleTraitChange(selectedStaffId, pos.id, e.target.value)}
                      >
                        <option value="">未設定</option>
                        <option value="◎">◎ (最適)</option>
                        <option value="◯">◯ (可能)</option>
                        <option value="△">△ (要指導)</option>
                        <option value="×">× (不可)</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel flex flex-col items-center justify-center text-gray-400" style={{ minHeight: '300px' }}>
            <User size={48} className="mb-4 opacity-50" />
            <p>左のリストからスタッフを選択すると、</p>
            <p>このイベントにおける適性を設定できます。</p>
          </div>
        )}
      </div>

      {editStaffModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-4">スタッフの修正</h2>
            <div className="form-group">
              <label>名前</label>
              <input type="text" value={editStaffModal.name} onChange={e => setEditStaffModal({...editStaffModal, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>権限</label>
              <select value={editStaffModal.role || 'ボランティア'} onChange={e => setEditStaffModal({...editStaffModal, role: e.target.value as any})}>
                <option value="ボランティア">ボランティア</option>
                <option value="WCP">WCP</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>入れる時間 (開始)</label>
                <input type="time" value={editStaffModal.availableStartTime} onChange={e => setEditStaffModal({...editStaffModal, availableStartTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label>入れる時間 (終了)</label>
                <input type="time" value={editStaffModal.availableEndTime} onChange={e => setEditStaffModal({...editStaffModal, availableEndTime: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>備考</label>
              <textarea value={editStaffModal.remarks} onChange={e => setEditStaffModal({...editStaffModal, remarks: e.target.value})} rows={2}></textarea>
            </div>
            <div className="flex gap-4 mt-6">
              <button className="btn btn-secondary flex-1" onClick={() => setEditStaffModal(null)}>キャンセル</button>
              <button 
                className="btn btn-primary flex-1" 
                onClick={() => {
                  if (!editStaffModal.name) return;
                  dispatchAction('UPDATE_STAFF', {
                    id: editStaffModal.id,
                    name: editStaffModal.name,
                    availableStartTime: editStaffModal.availableStartTime,
                    availableEndTime: editStaffModal.availableEndTime,
                    remarks: editStaffModal.remarks,
                    role: editStaffModal.role || 'ボランティア'
                  });
                  setEditStaffModal(null);
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
