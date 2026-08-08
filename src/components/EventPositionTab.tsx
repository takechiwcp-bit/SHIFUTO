import { useState } from 'react';
import { useStore } from '../store';
import { Plus, Save, Trash2, Pencil } from 'lucide-react';

interface EventPositionTabProps {
  eventId: string;
}

export const EventPositionTab: React.FC<EventPositionTabProps> = ({ eventId }) => {
  const { PositionCategories, Positions, dispatchAction } = useStore();
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showPosModal, setShowPosModal] = useState(false);
  const [editCategoryModal, setEditCategoryModal] = useState<{ id: string; name: string } | null>(null);
  const [editPositionModal, setEditPositionModal] = useState<any>(null);
  
  // Filter for this event
  const eventCategories = PositionCategories.filter(c => c.eventId === eventId);
  const eventCategoryIds = eventCategories.map(c => c.id);
  const eventPositions = Positions
    .filter(p => eventCategoryIds.includes(p.categoryId))
    .sort((a, b) => {
      const catA = eventCategories.find(c => c.id === a.categoryId)?.name || '';
      const catB = eventCategories.find(c => c.id === b.categoryId)?.name || '';
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });

  const [posForm, setPosForm] = useState({
    categoryId: '', name: '', requiredPeople: 1, unitTime: 30, startTime: '09:00', endTime: '18:00', remarks: '', isFixed: false
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
              <div key={cat.id} className="p-2 border-b flex justify-between items-center group">
                <span>{cat.name}</span>
                <div className="flex gap-2">
                  <button 
                    className="text-gray-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditCategoryModal({ id: cat.id, name: cat.name })}
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (window.confirm(`カテゴリー「${cat.name}」を本当に削除しますか？\n(紐づくポジションも削除されます)`)) {
                        dispatchAction('DELETE_CATEGORY', { id: cat.id });
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th className="p-2 whitespace-nowrap">カテゴリー</th>
                    <th className="p-2 whitespace-nowrap">ポジション名</th>
                    <th className="p-2 whitespace-nowrap">必要人数</th>
                    <th className="p-2 whitespace-nowrap">時間</th>
                    <th className="p-2 whitespace-nowrap">単位(分)</th>
                    <th className="p-2 whitespace-nowrap">枠の種類</th>
                    <th className="p-2 whitespace-nowrap">備考</th>
                    <th className="p-2"></th>
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
                        <td className="p-2 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${pos.isFixed ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {pos.isFixed ? '固定枠' : '変動枠'}
                          </span>
                        </td>
                        <td className="p-2 text-sm text-gray-500">{pos.remarks}</td>
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              className="text-gray-400 hover:text-indigo-500 p-1"
                              onClick={() => setEditPositionModal(pos)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              className="text-gray-400 hover:text-red-500 p-1"
                              onClick={() => {
                                if (window.confirm(`ポジション「${pos.name}」を本当に削除しますか？`)) {
                                  dispatchAction('DELETE_POSITION', { id: pos.id });
                                }
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
                <label className="font-bold block mb-2">枠の種類</label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input type="radio" name="posType" checked={!posForm.isFixed} onChange={() => setPosForm({...posForm, isFixed: false})} />
                    <span className="text-sm">変動枠</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input type="radio" name="posType" checked={posForm.isFixed} onChange={() => setPosForm({...posForm, isFixed: true})} />
                    <span className="text-sm">固定枠</span>
                  </label>
                </div>
              </div>
            </div>
            {!posForm.isFixed && (
              <div className="form-group">
                <label>変動の単位時間 (分)</label>
                <input type="number" min="15" step="15" value={posForm.unitTime} onChange={e => setPosForm({...posForm, unitTime: parseInt(e.target.value)})} />
              </div>
            )}
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

      {/* Edit Category Modal */}
      {editCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-4">カテゴリーの修正</h2>
            <div className="form-group">
              <label>カテゴリー名</label>
              <input type="text" value={editCategoryModal.name} onChange={e => setEditCategoryModal({...editCategoryModal, name: e.target.value})} />
            </div>
            <div className="flex gap-4 mt-6">
              <button className="btn btn-secondary flex-1" onClick={() => setEditCategoryModal(null)}>キャンセル</button>
              <button 
                className="btn btn-primary flex-1" 
                onClick={() => {
                  if (!editCategoryModal.name) return;
                  dispatchAction('UPDATE_CATEGORY', { id: editCategoryModal.id, eventId, name: editCategoryModal.name });
                  setEditCategoryModal(null);
                }}
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Position Modal */}
      {editPositionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-4">ポジションの修正</h2>
            <div className="form-group">
              <label>カテゴリー</label>
              <select value={editPositionModal.categoryId} onChange={e => setEditPositionModal({...editPositionModal, categoryId: e.target.value})}>
                {eventCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>ポジション名</label>
              <input type="text" value={editPositionModal.name} onChange={e => setEditPositionModal({...editPositionModal, name: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>必要人数</label>
                <input type="number" min="1" value={editPositionModal.requiredPeople} onChange={e => setEditPositionModal({...editPositionModal, requiredPeople: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="font-bold block mb-2">枠の種類</label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input type="radio" name="editPosType" checked={!editPositionModal.isFixed} onChange={() => setEditPositionModal({...editPositionModal, isFixed: false})} />
                    <span className="text-sm">変動枠</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input type="radio" name="editPosType" checked={editPositionModal.isFixed} onChange={() => setEditPositionModal({...editPositionModal, isFixed: true})} />
                    <span className="text-sm">固定枠</span>
                  </label>
                </div>
              </div>
            </div>
            {!editPositionModal.isFixed && (
              <div className="form-group">
                <label>変動の単位時間 (分)</label>
                <input type="number" min="15" step="15" value={editPositionModal.unitTime} onChange={e => setEditPositionModal({...editPositionModal, unitTime: parseInt(e.target.value)})} />
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label>開始時間 (5:00~23:00)</label>
                <input type="time" min="05:00" max="23:00" value={editPositionModal.startTime} onChange={e => setEditPositionModal({...editPositionModal, startTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label>終了時間 (5:00~23:00)</label>
                <input type="time" min="05:00" max="23:00" value={editPositionModal.endTime} onChange={e => setEditPositionModal({...editPositionModal, endTime: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>備考</label>
              <input type="text" value={editPositionModal.remarks} onChange={e => setEditPositionModal({...editPositionModal, remarks: e.target.value})} />
            </div>
            <div className="flex gap-4 mt-6">
              <button className="btn btn-secondary flex-1" onClick={() => setEditPositionModal(null)}>キャンセル</button>
              <button 
                className="btn btn-primary flex-1" 
                onClick={() => {
                  if (!editPositionModal.name) return;
                  dispatchAction('UPDATE_POSITION', { ...editPositionModal });
                  setEditPositionModal(null);
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
