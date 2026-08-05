import { useState } from 'react';
import type { AppStore } from '../store';
import { Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

interface Props {
  store: AppStore;
  onComplete: () => void;
  onCancel: () => void;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function SettingsWizard({ store, onComplete, onCancel }: Props) {
  const { eventConfig, setEventConfig, categories, setCategories, positions, setPositions } = store;
  const [step, setStep] = useState(1);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // State for new position form
  const [newPos, setNewPos] = useState({
    categoryId: '',
    name: '',
    startTime: eventConfig.startTime,
    endTime: eventConfig.endTime,
    requiredCount: 1
  });

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEventConfig({ ...eventConfig, [name]: value });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    setCategories([...categories, { id: crypto.randomUUID(), name: newCategoryName }]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
    // Optionally remove positions that belonged to this category
    setPositions(positions.filter(p => p.categoryId !== id));
  };

  const handleAddPosition = () => {
    if (!newPos.name.trim() || !newPos.categoryId) return;
    const pos = {
      id: crypto.randomUUID(),
      categoryId: newPos.categoryId,
      name: newPos.name,
      color: COLORS[positions.length % COLORS.length],
      startTime: newPos.startTime,
      endTime: newPos.endTime,
      requiredCount: newPos.requiredCount,
    };
    setPositions([...positions, pos]);
    setNewPos({ ...newPos, name: '' }); // reset name only
  };

  const handleRemovePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
  };

  const handlePosChange = (id: string, field: keyof typeof positions[0], value: any) => {
    setPositions(positions.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
      <div className="card glass" style={{ padding: '2rem' }}>
        {/* Stepper */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
           <div style={{ position: 'absolute', top: '15px', left: 0, right: 0, height: '2px', background: 'var(--surface-border)', zIndex: 0 }}></div>
           {[1, 2, 3, 4].map(s => (
             <div key={s} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-bg)', padding: '0 1rem' }}>
               <div style={{ 
                 width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                 background: step >= s ? 'var(--primary-color)' : 'var(--surface-border)',
                 color: step >= s ? 'white' : 'var(--text-muted)',
                 fontWeight: 'bold'
               }}>{s}</div>
               <span style={{ fontSize: '0.75rem', color: step >= s ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                 {s === 1 ? '概要・時間' : s === 2 ? 'カテゴリー' : s === 3 ? 'ポジション' : '完了'}
               </span>
             </div>
           ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>ステップ 1: イベント概要と時間設定</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div className="form-group">
                <label className="label">イベント名</label>
                <input className="input" name="name" value={eventConfig.name} onChange={handleConfigChange} placeholder="例: 夏フェス2026" />
              </div>
              <div className="form-group">
                <label className="label">日付</label>
                <input className="input" type="date" name="date" value={eventConfig.date} onChange={handleConfigChange} />
              </div>
              <div className="form-group">
                <label className="label">開始時間</label>
                <input className="input" type="time" name="startTime" value={eventConfig.startTime} onChange={handleConfigChange} />
              </div>
              <div className="form-group">
                <label className="label">終了時間</label>
                <input className="input" type="time" name="endTime" value={eventConfig.endTime} onChange={handleConfigChange} />
              </div>
              <div className="form-group">
                <label className="label">時間区切り（分）</label>
                <select className="input" name="intervalMinutes" value={eventConfig.intervalMinutes} onChange={handleConfigChange}>
                  <option value={15}>15分</option>
                  <option value={30}>30分</option>
                  <option value={60}>60分</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">連続勤務の警告ライン（分）</label>
                <input className="input" type="number" name="maxContinuousWorkMinutes" value={eventConfig.maxContinuousWorkMinutes} onChange={handleConfigChange} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>この時間を超えると警告が出ます</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>ステップ 2: カテゴリー作成</h2>
            <p className="text-muted" style={{ marginBottom: '1rem' }}>ポジションをグループ分けするための「カテゴリー」を作ります。（例：裏方、ステージ、接客）</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                className="input" 
                placeholder="新しいカテゴリー名" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <button className="btn btn-primary" onClick={handleAddCategory}>
                <Plus size={18} /> 追加
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--surface-border)', borderRadius: 'var(--border-radius-sm)' }}>
                  <span style={{ fontWeight: 'bold' }}>{cat.name}</span>
                  <button className="btn btn-secondary" style={{ color: 'var(--danger-color)', padding: '0.5rem' }} onClick={() => handleRemoveCategory(cat.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  カテゴリーが登録されていません。
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>ステップ 3: ポジション作成と時間設定</h2>
            
            {categories.length === 0 ? (
              <p className="text-muted">先にステップ2でカテゴリーを作成してください。</p>
            ) : (
              <>
                <div style={{ background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: 'var(--border-radius)', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>ポジションを新規追加</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="label">カテゴリー</label>
                      <select className="input" value={newPos.categoryId} onChange={e => setNewPos({ ...newPos, categoryId: e.target.value })}>
                        <option value="">選択してください...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">ポジション名</label>
                      <input className="input" placeholder="例: 受付A" value={newPos.name} onChange={e => setNewPos({ ...newPos, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="label">開始時間</label>
                      <input className="input" type="time" value={newPos.startTime} onChange={e => setNewPos({ ...newPos, startTime: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="label">終了時間</label>
                      <input className="input" type="time" value={newPos.endTime} onChange={e => setNewPos({ ...newPos, endTime: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="label">必要人数</label>
                      <input className="input" type="number" min="1" value={newPos.requiredCount} onChange={e => setNewPos({ ...newPos, requiredCount: parseInt(e.target.value) })} />
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAddPosition} disabled={!newPos.categoryId || !newPos.name.trim()}>
                    <Plus size={18} /> このポジションを追加する
                  </button>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>追加済みのポジション</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {categories.map(cat => {
                    const catPositions = positions.filter(p => p.categoryId === cat.id);
                    if (catPositions.length === 0) return null;
                    return (
                      <div key={cat.id} style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--surface-hover)', padding: '0.5rem 1rem', fontWeight: 'bold' }}>
                          {cat.name}
                        </div>
                        <div style={{ padding: '0.5rem' }}>
                          {catPositions.map(pos => (
                            <div key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                              <input type="color" value={pos.color} onChange={e => handlePosChange(pos.id, 'color', e.target.value)} style={{ width: '24px', height: '24px', padding: 0, border: 'none' }} />
                              <input className="input" style={{ flex: 1 }} value={pos.name} onChange={e => handlePosChange(pos.id, 'name', e.target.value)} />
                              <input className="input" type="time" style={{ width: '100px' }} value={pos.startTime} onChange={e => handlePosChange(pos.id, 'startTime', e.target.value)} />
                              <span>〜</span>
                              <input className="input" type="time" style={{ width: '100px' }} value={pos.endTime} onChange={e => handlePosChange(pos.id, 'endTime', e.target.value)} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ fontSize: '0.75rem' }}>人数:</span>
                                <input className="input" type="number" style={{ width: '60px' }} value={pos.requiredCount} onChange={e => handlePosChange(pos.id, 'requiredCount', parseInt(e.target.value))} />
                              </div>
                              <button className="btn btn-secondary" style={{ color: 'var(--danger-color)', padding: '0.25rem' }} onClick={() => handleRemovePosition(pos.id)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle size={64} color="var(--success-color)" style={{ margin: '0 auto 1.5rem' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>いれる枠の作成完了！</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              イベント設定が完了し、シフト表の枠が準備できました。<br/>
              次はスタッフを追加して、シフトを割り当てましょう。
            </p>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-border)' }}>
          {step === 1 ? (
            <button className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
          ) : (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={18} /> 戻る
            </button>
          )}
          
          {step < 4 ? (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
              次へ <ArrowRight size={18} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onComplete}>
              シフト作成を始める <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
