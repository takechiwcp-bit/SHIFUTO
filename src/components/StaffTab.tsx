import { useState } from 'react';
import { useStore } from '../store';
import { User } from 'lucide-react';

interface StaffTabProps {
  eventId: string;
}

export const StaffTab: React.FC<StaffTabProps> = ({ eventId }) => {
  const { Staff, Positions, PositionCategories, StaffTraits, dispatchAction } = useStore();
  
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffStartTime, setNewStaffStartTime] = useState('09:00');
  const [newStaffEndTime, setNewStaffEndTime] = useState('18:00');
  const [newStaffRemarks, setNewStaffRemarks] = useState('');
  
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

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
      remarks: newStaffRemarks
    });
    setNewStaffName('');
    setNewStaffStartTime('09:00');
    setNewStaffEndTime('18:00');
    setNewStaffRemarks('');
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
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedStaffId === s.id ? 'border-primary bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => setSelectedStaffId(s.id)}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium">{s.name}</div>
                  {(s.availableStartTime && s.availableEndTime) && (
                    <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {s.availableStartTime}〜{s.availableEndTime}
                    </div>
                  )}
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
    </div>
  );
};
