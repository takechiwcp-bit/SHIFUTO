import type { AppStore } from '../store';
import { parse, addMinutes, isBefore, format } from 'date-fns';

interface Props {
  store: AppStore;
}

export function generateTimeSlots(startTime: string, endTime: string, interval: number) {
  const start = parse(startTime, 'HH:mm', new Date());
  let end = parse(endTime, 'HH:mm', new Date());
  
  if (isBefore(end, start)) {
    end = addMinutes(end, 24 * 60); // handle past midnight
  }
  
  let current = start;
  const slots: string[] = [];
  
  while (isBefore(current, end)) {
    slots.push(format(current, 'HH:mm'));
    current = addMinutes(current, interval);
  }
  return slots;
}

export default function ShiftGrid({ store }: Props) {
  const { eventConfig, categories, staffList, positions, shifts, setShifts } = store;
  
  const timeSlots = generateTimeSlots(eventConfig.startTime, eventConfig.endTime, eventConfig.intervalMinutes);
  
  // Helper to check if a position is active at a given time
  const isPositionActiveAt = (pos: typeof positions[0], timeSlot: string) => {
    // Basic string comparison works for HH:mm format
    const start = pos.startTime || eventConfig.startTime;
    const end = pos.endTime || eventConfig.endTime;
    return timeSlot >= start && timeSlot < end;
  };
  
  const handleAssign = (staffId: string, timeSlot: string, positionId: string) => {
    // Remove existing
    let newShifts = shifts.filter(s => !(s.staffId === staffId && s.timeSlot === timeSlot));
    // Add new if not empty
    if (positionId) {
      newShifts.push({ staffId, timeSlot, positionId });
    }
    setShifts(newShifts);
  };
  
  const isAvailable = (staffId: string, timeSlot: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return false;
    const start = staff.availableStart || eventConfig.startTime;
    const end = staff.availableEnd || eventConfig.endTime;
    return timeSlot >= start && timeSlot < end;
  };

  return (
    <div id="shift-grid-export" style={{ background: 'var(--surface-bg)', padding: '1rem', borderRadius: 'var(--border-radius)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>シフト表作成</h2>
        
        {positions.length > 0 && staffList.length > 0 && categories.length > 0 && (
          <button 
            className="btn btn-primary" 
            style={{ backgroundColor: 'var(--accent-color)', border: 'none' }}
            onClick={() => {
              if (window.confirm('すでに手動で入っているシフトはそのまま残し、空いている枠を自動で割り当てます。よろしいですか？')) {
                store.autoAssignShifts();
              }
            }}
          >
            🪄 自動でシフトを組む
          </button>
        )}
      </div>
      
      {positions.length === 0 || staffList.length === 0 || categories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          カテゴリー、ポジション、またはスタッフが登録されていません。まずは設定ウィザードとスタッフ入力を完了してください。
        </div>
      ) : (
        <div className="shift-table-container">
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 'max-content' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 20, background: 'var(--surface-bg)', padding: '0.75rem', borderBottom: '2px solid var(--surface-border)', textAlign: 'left', borderRight: '1px solid var(--surface-border)' }}>
                  スタッフ
                </th>
                {timeSlots.map(slot => (
                  <th key={slot} style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-bg)', padding: '0.75rem', borderBottom: '2px solid var(--surface-border)', textAlign: 'center', fontSize: '0.875rem' }}>
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map(staff => (
                <tr key={staff.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--surface-bg)', padding: '0.75rem', fontWeight: 500, borderRight: '1px solid var(--surface-border)' }}>
                    {staff.name}
                    {staff.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }} title={staff.notes}>{staff.notes}</div>}
                  </td>
                  {timeSlots.map(time => {
                    const available = isAvailable(staff.id, time);
                    const currentShift = shifts.find(s => s.staffId === staff.id && s.timeSlot === time);
                    const currentPos = positions.find(p => p.id === currentShift?.positionId);
                    
                    return (
                      <td key={time} style={{ padding: '0.25rem', textAlign: 'center', borderBottom: '1px solid var(--surface-border)', background: available ? 'transparent' : 'var(--surface-hover)' }}>
                        {available ? (
                          <select 
                            value={currentShift?.positionId || ''}
                            onChange={(e) => handleAssign(staff.id, time, e.target.value)}
                            style={{ 
                              width: '90px', 
                              padding: '0.25rem', 
                              borderRadius: '4px', 
                              border: currentPos ? 'none' : '1px dashed var(--surface-border)',
                              background: currentPos ? currentPos.color : 'var(--surface-bg)',
                              color: currentPos ? 'white' : 'var(--text-muted)',
                              cursor: 'pointer',
                              fontWeight: currentPos ? '600' : 'normal',
                              fontSize: '0.75rem',
                              textAlign: 'center',
                              appearance: 'none',
                              transition: 'all 0.2s',
                              outline: 'none',
                              boxShadow: currentPos ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!currentPos) {
                                e.currentTarget.style.background = 'var(--surface-hover)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!currentPos) {
                                e.currentTarget.style.background = 'var(--surface-bg)';
                              }
                            }}
                          >
                            <option value="" style={{ color: 'black' }}>＋ 割当</option>
                            {categories.map(cat => {
                              const activeCatPositions = positions.filter(p => p.categoryId === cat.id && isPositionActiveAt(p, time));
                              if (activeCatPositions.length === 0) return null;
                              
                              return (
                                <optgroup key={cat.id} label={cat.name} style={{ color: 'black' }}>
                                  {activeCatPositions.map(p => (
                                    <option key={p.id} value={p.id} style={{ color: 'black' }}>{p.name}</option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                        ) : (
                          <span style={{ color: 'var(--surface-border)', fontSize: '0.75rem' }}>不可</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={timeSlots.length + 1} style={{ padding: '1rem 0.75rem', background: 'var(--surface-bg)', textAlign: 'left', borderBottom: '2px solid var(--surface-border)' }}>
                  📊 【ポジション別の不足人数チェック】
                </th>
              </tr>
              {positions.map(pos => (
                <tr key={`shortage-${pos.id}`}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--surface-bg)', padding: '0.75rem', fontWeight: 500, borderRight: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: pos.color }}></div>
                      <span style={{ fontSize: '0.875rem' }}>{pos.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(必要: {pos.requiredCount || 1}名)</span>
                    </div>
                  </td>
                  {timeSlots.map(time => {
                    const active = isPositionActiveAt(pos, time);
                    if (!active) {
                      return <td key={time} style={{ padding: '0.25rem', textAlign: 'center', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}><span style={{ color: 'var(--surface-border)' }}>-</span></td>;
                    }
                    
                    const currentAssigned = shifts.filter(s => s.timeSlot === time && s.positionId === pos.id).length;
                    const shortage = Math.max(0, (Number(pos.requiredCount) || 1) - currentAssigned);
                    
                    return (
                      <td key={time} style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid var(--surface-border)', fontSize: '0.75rem', fontWeight: shortage > 0 ? 'bold' : 'normal', color: shortage > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                        {shortage > 0 ? `不足 ${shortage}名` : 'OK'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
