import React from 'react';
import { useStore } from '../store';
import { Clock } from 'lucide-react';

interface TimelineViewProps {
  eventId: string;
}

const parseTime = (t: string) => {
  if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Generate distinct pastel colors for different positions based on ID string
const getPositionColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 80%, 90%)`,
    border: `hsl(${hue}, 70%, 75%)`,
    text: `hsl(${hue}, 80%, 30%)`
  };
};

export const TimelineView: React.FC<TimelineViewProps> = ({ eventId }) => {
  const { Events, Staff, Shifts, Positions, PositionCategories } = useStore();
  const currentEvent = Events.find(e => e.id === eventId);
  
  if (!currentEvent) return null;

  // Find all categories and positions for this event
  const eventCategories = PositionCategories.filter(c => c.eventId === eventId);
  const eventCategoryIds = eventCategories.map(c => c.id);
  const eventPositions = Positions.filter(p => eventCategoryIds.includes(p.categoryId));
  const eventPositionIds = eventPositions.map(p => p.id);
  
  // Find all shifts and staff assigned
  const eventShifts = Shifts.filter(s => eventPositionIds.includes(s.positionId));
  const assignedStaffIds = Array.from(new Set(eventShifts.map(s => s.staffId)));
  const eventStaff = Staff.filter(s => assignedStaffIds.includes(s.id));

  // Determine timeline start and end based on event time and shifts
  let minMins = parseTime(currentEvent.startTime || '') || 480; // Default 08:00
  let maxMins = parseTime(currentEvent.endTime || '') || 1080; // Default 18:00

  // Expand timeline if shifts exceed event boundaries
  eventShifts.forEach(s => {
    const [start, end] = (s.timeBlock || '').split('-');
    if (start && end) {
      minMins = Math.min(minMins, parseTime(start));
      maxMins = Math.max(maxMins, parseTime(end));
    }
  });

  // Ensure minimum 1 hour span to avoid divide by zero
  if (maxMins <= minMins) maxMins = minMins + 60;
  
  const totalMins = maxMins - minMins;
  
  // 1時間あたり400pxとして最低幅を計算（スクロール前提でテキストを全て見せる）
  const minTimelineWidth = Math.max(1200, (totalMins / 60) * 400);

  // Generate hour markers
  const hourMarkers: number[] = [];
  for (let h = Math.floor(minMins / 60); h <= Math.ceil(maxMins / 60); h++) {
    const mins = h * 60;
    if (mins >= minMins && mins <= maxMins) {
      hourMarkers.push(mins);
    }
  }

  const getPositionStyle = (start: string, end: string) => {
    const startMins = parseTime(start);
    const endMins = parseTime(end);
    const left = Math.max(0, ((startMins - minMins) / totalMins) * 100);
    const width = Math.max(0, Math.min(100 - left, ((endMins - startMins) / totalMins) * 100));
    return { left: `${left}%`, width: `${width}%` };
  };

  // Sort staff logically (e.g., by role, then name)
  eventStaff.sort((a, b) => {
    if (a.role !== b.role) return (b.role || '').localeCompare(a.role || '');
    return a.name.localeCompare(b.name);
  });

  if (eventStaff.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 shadow-sm mt-4">
        <Clock size={48} className="mx-auto mb-4 opacity-30" />
        <p>タイムラインに表示するシフトデータがありません。</p>
        <p className="text-sm mt-2">シフトを割り当てると、ここにタイムラインが表示されます。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4 print:mt-0 print:border-none print:shadow-none print-only-timeline">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-print">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <Clock size={18} />
          シフト タイムライン
        </h3>
        <p className="text-sm text-gray-500">※印刷するとこのタイムライン形式のPDFが出力されます</p>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <div style={{ minWidth: `${minTimelineWidth}px` }} className="relative">
          {/* Header row (Time markers) */}
          <div className="flex border-b border-gray-300 bg-gray-100 print:bg-white print:border-b-2 print:border-black relative">
            <div className="sticky left-0 z-40 w-32 flex-shrink-0 p-3 font-bold text-gray-600 text-sm border-r border-gray-300 flex items-center justify-center bg-gray-100 print:static print:border-black print:text-black">
              スタッフ名
            </div>
            <div className="flex-1 relative h-10">
              {hourMarkers.map(mins => {
                const pos = ((mins - minMins) / totalMins) * 100;
                return (
                  <div 
                    key={mins} 
                    className="absolute top-0 bottom-0 border-l border-gray-300 print:border-black/30 flex flex-col items-center z-10"
                    style={{ left: `${pos}%` }}
                  >
                    <span className="text-xs font-bold text-gray-500 -ml-4 mt-2 print:text-black bg-gray-100 print:bg-white px-1 leading-none">{formatTime(mins)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body rows (Staff) */}
          <div className="flex flex-col">
            {eventStaff.map(staff => {
              const staffShifts = eventShifts.filter(s => s.staffId === staff.id);
              
              return (
                <div key={staff.id} className="flex border-b border-gray-200 hover:bg-gray-50 transition-colors print:border-black print:hover:bg-white page-break-inside-avoid relative group">
                  {/* Name column */}
                  <div className="sticky left-0 z-30 w-32 flex-shrink-0 p-2 font-bold text-sm text-gray-800 border-r border-gray-200 flex flex-col justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors print:static print:bg-white print:border-black">
                    <span className="truncate w-full" title={staff.name}>{staff.name}</span>
                    <span className="text-[10px] text-gray-500 font-normal">{staff.role}</span>
                  </div>
                  
                  {/* Timeline area */}
                  <div className="flex-1 relative h-14">
                    {/* Background Grid lines */}
                    {hourMarkers.map(mins => (
                      <div 
                        key={`grid-${mins}`} 
                        className="absolute top-0 bottom-0 border-l border-dashed border-gray-200 print:border-black/20"
                        style={{ left: `${((mins - minMins) / totalMins) * 100}%` }}
                      />
                    ))}

                    {/* Shift blocks */}
                    {(() => {
                      const mergedShifts: { positionId: string, start: string, end: string, ids: string[] }[] = [];
                      
                      const sortedShifts = [...staffShifts].sort((a, b) => {
                        const startA = (a.timeBlock || '').split('-')[0] || '';
                        const startB = (b.timeBlock || '').split('-')[0] || '';
                        return startA.localeCompare(startB);
                      });

                      sortedShifts.forEach(shift => {
                        const [start, end] = (shift.timeBlock || '').split('-');
                        if (!start || !end) return;

                        const lastMerged = mergedShifts[mergedShifts.length - 1];
                        if (lastMerged && lastMerged.positionId === shift.positionId && lastMerged.end === start) {
                          lastMerged.end = end;
                          lastMerged.ids.push(shift.id || '');
                        } else {
                          mergedShifts.push({
                            positionId: shift.positionId,
                            start,
                            end,
                            ids: [shift.id || '']
                          });
                        }
                      });

                      return mergedShifts.map(shift => {
                        const { start, end, positionId, ids } = shift;
                        const position = Positions.find(p => p.id === positionId);
                      const posName = position?.name || '不明';
                      const colors = getPositionColor(shift.positionId);
                      
                        return (
                          <div 
                            key={ids.join('-')} 
                            className="absolute top-[4px] bottom-[4px] rounded-[4px] text-[10px] sm:text-[11px] font-bold p-1 shadow-sm flex flex-col justify-center border print-exact-colors opacity-90 hover:opacity-100 transition-opacity z-20 cursor-default"
                            style={{ 
                              ...getPositionStyle(start, end),
                              backgroundColor: colors.bg,
                              borderColor: colors.border,
                              color: colors.text
                            }}
                            title={`${posName} (${start}-${end})`}
                          >
                            <div className="whitespace-nowrap overflow-visible leading-tight relative z-30" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.9), 0px 0px 5px rgba(255,255,255,0.9)' }}>
                              {posName}
                            </div>
                            <div className="whitespace-nowrap overflow-visible opacity-90 font-medium text-[9px] relative z-30" style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.9)' }}>
                              {start}-{end}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
