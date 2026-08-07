import { useState } from 'react';
import { useStore } from '../store';
import { Plus, Save } from 'lucide-react';

interface EventPositionTabProps {
  eventId: string;
}

export const EventPositionTab: React.FC<EventPositionTabProps> = ({ eventId }) => {
  const { PositionCategories, Positions, dispatchAction } = useStore();
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showPosModal, setShowPosModal] = useState(false);
  
  // Filter for this event
  const eventCategories = PositionCategories.filter(c => c.eventId === eventId);
  const eventCategoryIds = eventCategories.map(c => c.id);
  const eventPositions = Positions.filter(p => eventCategoryIds.includes(p.categoryId));

  const [posForm, setPosForm] = useState({
    categoryId: '', name: '', requiredPeople: 1, unitTime: 15, startTime: '09:00', endTime: '18:00', remarks: ''
  });

  const handleCreateCategory = () => {
    if (!newCategoryName) return;
    dispatchAction('ADD_CATEGORY', {
      id: crypto.randomUUID(),
      eventId: eventId,
      name: newCategoryName
    });
    setNewCategoryName('');
  };

  const handleCreatePosition = () => {
    if (!posForm.name || !posForm.categoryId) return;
    dispatchAction('ADD_POSITION', {
      id: crypto.randomUUID(),
      ...posForm
    });
    setShowPosModal(false);
    setPosForm({ ...posForm, name: '', remarks: '' });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-6">
        {/* Categories Panel */}
        <div className="glass-panel col-span-1">
          <h2 className="mb-4 flex items-center gap-2"><Plus size={20}/> カテゴリー追加</h2>
          <div className="form-group">
            <label>カテゴリー名</label>
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="例: 飲食エリア" />
          </div>
          <button className="btn btn-primary w-full" onClick={handleCreateCategory}>追加する</button>

          <div className="mt-6">
            <h3 className="mb-2 text-sm text-gray-500">作成済みカテゴリー</h3>
            {eventCategories.length === 0 && <p className="text-sm text-gray-400">カテゴリーがありません</p>}
            {eventCategories.map(cat => (
              <div key={cat.id} className="p-2 border-b">
                {cat.name}
              </div>
            ))}
          </div>
        </div>

        {/* Positions List */}
        <div className="glass-panel col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="flex items-center gap-2">ポジション一覧</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPosModal(true)}>
              <Plus size={16}/> ポジション追加
            </button>
          </div>
          
          {eventPositions.length === 0 ? (
             <div className="text-center py-8 text-gray-500">
               <p>ポジションがありません。</p>
               <p>左側のフォームからカテゴリーを作成し、ポジションを追加してください。</p>
             </div>
          ) : (
            <table className="w-full text-left" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                  <th className="p-2">カテゴリー</th>
                  <th className="p-2">ポジション名</th>
                  <th className="p-2">必要人数</th>
                  <th className="p-2">時間</th>
                  <th className="p-2">単位(分)</th>
                  <th className="p-2">備考</th>
                </tr>
              </thead>
              <tbody>
                {eventPositions.map(pos => {
                  const cat = eventCategories.find(c => c.id === pos.categoryId);
                  return (
                    <tr key={pos.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td className="p-2">{cat?.name}</td>
                      <td className="p-2 font-semibold">{pos.name}</td>
                      <td className="p-2">{pos.requiredPeople}名</td>
                      <td className="p-2">{pos.startTime} - {pos.endTime}</td>
                      <td className="p-2">{pos.unitTime}分</td>
                      <td className="p-2 text-sm text-gray-500">{pos.remarks}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Position Modal */}
      {showPosModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-4">ポジション新規作成</h2>
            <div className="form-group">
              <label>カテゴリー</label>
              <select value={posForm.categoryId} onChange={e => setPosForm({...posForm, categoryId: e.target.value})}>
                <option value="">選択してください</option>
                {eventCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>ポジション名</label>
              <input type="text" value={posForm.name} onChange={e => setPosForm({...posForm, name: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>必要人数</label>
                <input type="number" min="1" value={posForm.requiredPeople} onChange={e => setPosForm({...posForm, requiredPeople: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>単位時間 (分)</label>
                <input type="number" min="15" step="15" value={posForm.unitTime} onChange={e => setPosForm({...posForm, unitTime: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>開始時間 (5:00~23:00)</label>
                <input type="time" min="05:00" max="23:00" value={posForm.startTime} onChange={e => setPosForm({...posForm, startTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label>終了時間 (5:00~23:00)</label>
                <input type="time" min="05:00" max="23:00" value={posForm.endTime} onChange={e => setPosForm({...posForm, endTime: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>備考</label>
              <input type="text" value={posForm.remarks} onChange={e => setPosForm({...posForm, remarks: e.target.value})} />
            </div>
            <div className="flex gap-4 mt-6">
              <button className="btn btn-secondary flex-1" onClick={() => setShowPosModal(false)}>キャンセル</button>
              <button 
                className="btn btn-primary flex-1" 
                onClick={handleCreatePosition}
                disabled={!posForm.categoryId || !posForm.name}
              >
                <Save size={18}/> 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
