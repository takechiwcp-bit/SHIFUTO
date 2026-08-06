import { useState } from 'react';
import type { AppStore } from '../store';
import { Plus, Trash2, Clock, User, FileText } from 'lucide-react';

interface Props {
  store: AppStore;
}

export default function StaffPanel({ store }: Props) {
  const { eventConfig, staffList, setStaffList } = store;
  const [newStaff, setNewStaff] = useState({
    name: '',
    availableStart: eventConfig.startTime,
    availableEnd: eventConfig.endTime,
    notes: ''
  });
  
  const handleAddStaff = () => {
    if (!newStaff.name.trim()) return;
    setStaffList([...staffList, { ...newStaff, id: crypto.randomUUID() }]);
    setNewStaff({
      name: '',
      availableStart: eventConfig.startTime,
      availableEnd: eventConfig.endTime,
      notes: ''
    });
  };
  
  const handleRemoveStaff = (id: string) => {
    setStaffList(staffList.filter(s => s.id !== id));
  };
  
  const handleStaffChange = (id: string, field: keyof typeof staffList[0], value: any) => {
    setStaffList(staffList.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>個人のシフト入力</h2>
      
      {/* 新規追加フォーム */}
      <div style={{ background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: 'var(--border-radius)', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>スタッフを新規追加</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14}/> 名前</label>
            <input 
              className="input" 
              placeholder="例: 山田 太郎" 
              value={newStaff.name} 
              onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
            />
          </div>
          
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14}/> 入れる時間</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input 
                className="input" 
                type="time" 
                value={newStaff.availableStart} 
                onChange={e => setNewStaff({ ...newStaff, availableStart: e.target.value })}
              />
              <span>〜</span>
              <input 
                className="input" 
                type="time" 
                value={newStaff.availableEnd} 
                onChange={e => setNewStaff({ ...newStaff, availableEnd: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><FileText size={14}/> 備考（希望ポジションなど）</label>
            <input 
              className="input" 
              placeholder="例: 受付希望、12:00から1時間は休憩必須" 
              value={newStaff.notes} 
              onChange={e => setNewStaff({ ...newStaff, notes: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAddStaff()}
            />
          </div>
          
          <div style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddStaff} disabled={!newStaff.name.trim()}>
              <Plus size={18} /> このスタッフを追加する
            </button>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>追加済みのスタッフ ({staffList.length}名)</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {staffList.map(staff => (
          <div key={staff.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) auto 1fr auto', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--border-radius-sm)' }}>
            
            <input 
              className="input" 
              value={staff.name} 
              onChange={e => handleStaffChange(staff.id, 'name', e.target.value)}
              style={{ fontWeight: '600', border: 'none', background: 'transparent', padding: '0' }}
            />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                className="input" 
                type="time" 
                value={staff.availableStart} 
                onChange={e => handleStaffChange(staff.id, 'availableStart', e.target.value)}
                style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>〜</span>
              <input 
                className="input" 
                type="time" 
                value={staff.availableEnd} 
                onChange={e => handleStaffChange(staff.id, 'availableEnd', e.target.value)}
                style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
              />
            </div>
            
            <input 
              className="input" 
              placeholder="備考（任意）" 
              value={staff.notes} 
              onChange={e => handleStaffChange(staff.id, 'notes', e.target.value)}
              style={{ border: 'none', background: 'transparent' }}
            />
            
            <button className="btn btn-secondary" style={{ color: 'var(--danger-color)', padding: '0.5rem', border: 'none', background: 'transparent' }} onClick={() => handleRemoveStaff(staff.id)}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {staffList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            まだスタッフが登録されていません。
          </div>
        )}
      </div>
    </div>
  );
}
