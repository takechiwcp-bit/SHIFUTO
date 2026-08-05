
import type { AppStore } from '../store';
import { generateTimeSlots } from './ShiftGrid';
import { AlertCircle } from 'lucide-react';

interface Props {
  store: AppStore;
}

export default function ValidationAlerts({ store }: Props) {
  const { eventConfig, staffList, positions, shifts } = store;
  
  const timeSlots = generateTimeSlots(eventConfig.startTime, eventConfig.endTime, eventConfig.intervalMinutes);
  
  const shortages: Array<{ timeSlot: string, positionName: string, missing: number }> = [];
  
  const isPositionActiveAt = (pos: typeof positions[0], timeSlot: string) => {
    return timeSlot >= pos.startTime && timeSlot < pos.endTime;
  };

  positions.forEach(pos => {
    timeSlots.forEach(slot => {
      if (!isPositionActiveAt(pos, slot)) return; // Only check during active hours
      
      const assignedCount = shifts.filter(s => s.positionId === pos.id && s.timeSlot === slot).length;
      if (assignedCount < pos.requiredCount) {
        shortages.push({
          timeSlot: slot,
          positionName: pos.name,
          missing: pos.requiredCount - assignedCount
        });
      }
    });
  });
  
  const warnings: string[] = shortages.map(s => `${s.timeSlot} の「${s.positionName}」が不足しています（あと${s.missing}人）`);

  // 2. Continuous work warnings (Break check)
  staffList.forEach(staff => {
    let continuousMinutes = 0;
    let hasWarning = false;
    
    for (const slot of timeSlots) {
      const isWorking = shifts.some(s => s.staffId === staff.id && s.timeSlot === slot);
      if (isWorking) {
        continuousMinutes += eventConfig.intervalMinutes;
        if (continuousMinutes >= eventConfig.maxContinuousWorkMinutes && !hasWarning) {
          warnings.push(`${staff.name} さんが長時間の連続勤務（${continuousMinutes}分以上）になっています。休憩を入れてください。`);
          hasWarning = true;
        }
      } else {
        // Break taken
        continuousMinutes = 0;
        hasWarning = false; // Reset warning flag for next block
      }
    }
  });

  return (
    <div className="card glass" style={{ position: 'sticky', top: '2rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertCircle size={20} color={warnings.length > 0 ? 'var(--warning-color)' : 'var(--success-color)'} />
        アラート・検証
      </h3>
      
      {warnings.length === 0 ? (
        <div style={{ color: 'var(--success-color)', fontSize: '0.875rem' }}>
          問題ありません。シフトは完璧です！
        </div>
      ) : (
        <div style={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {warnings.map((warning, idx) => (
              <li key={idx} style={{ 
                fontSize: '0.875rem', 
                padding: '0.75rem', 
                backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                borderLeft: '4px solid var(--warning-color)',
                borderRadius: '4px',
                color: 'var(--text-color)'
              }}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
