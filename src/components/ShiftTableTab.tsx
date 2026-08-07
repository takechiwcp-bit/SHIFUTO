import { useStore } from '../store';
import { Table } from 'lucide-react';
import { format, addMinutes, parse } from 'date-fns';

interface ShiftTableTabProps {
  eventId: string;
}

export const ShiftTableTab: React.FC<ShiftTableTabProps> = ({ eventId }) => {
  const { Positions, PositionCategories, Staff, Shifts } = useStore();

  const eventCategories = PositionCategories.filter(c => c.eventId === eventId);
  const eventCategoryIds = eventCategories.map(c => c.id);
  const eventPositions = Positions.filter(p => eventCategoryIds.includes(p.categoryId));

  const generateTimeBlocks = (start: string, end: string, unit: number) => {
    const blocks: string[] = [];
    try {
      let current = parse(start, 'HH:mm', new Date());
      const endTime = parse(end, 'HH:mm', new Date());
      
      while (current < endTime) {
        blocks.push(format(current, 'HH:mm'));
        current = addMinutes(current, unit);
      }
    } catch (e) {
      console.error(e);
    }
    return blocks;
  };

  const getGlobalTimeBlocks = () => {
    if (eventPositions.length === 0) return [];
    
    let minTime = eventPositions[0].startTime;
    let maxTime = eventPositions[0].endTime;
    
    eventPositions.forEach(p => {
      if (p.startTime < minTime) minTime = p.startTime;
      if (p.endTime > maxTime) maxTime = p.endTime;
    });

    const minUnit = Math.min(...eventPositions.map(p => p.unitTime));
    return generateTimeBlocks(minTime, maxTime, minUnit || 30);
  };

  const globalTimeBlocks = getGlobalTimeBlocks();

  if (eventPositions.length === 0) {
    return (
      <div className="glass-panel text-center py-12 text-gray-500">
        <Table size={48} className="mx-auto mb-4 opacity-50" />
        <p>このイベントにはポジションが作成されていません。</p>
        <p>「ポジション管理」タブからポジションを追加してください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="shift-container bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 sticky left-0 z-10">
          <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
            <Table size={20} className="text-indigo-500" />
            全体シフト表（スタッフ別）
          </h3>
        </div>
        <div className="overflow-x-auto pb-4">
          <div className="shift-grid" style={{ minWidth: 'max-content' }}>
            <div className="shift-header-row" style={{ gridTemplateColumns: `120px repeat(${globalTimeBlocks.length}, minmax(80px, 1fr))` }}>
              <div className="shift-header-cell sticky left-0 z-20 bg-gray-100 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">名前 \ 時間</div>
              {globalTimeBlocks.map(tb => (
                <div key={tb} className="shift-header-cell bg-gray-50 text-gray-700 font-bold truncate px-2">
                  {tb}
                </div>
              ))}
            </div>
            
            {Staff.map(staff => {
              return (
                <div key={staff.id} className="shift-data-row border-b border-gray-100 hover:bg-gray-50 transition-colors" style={{ gridTemplateColumns: `120px repeat(${globalTimeBlocks.length}, minmax(80px, 1fr))` }}>
                  <div className="shift-header-cell sticky left-0 z-10 bg-white border-r flex items-center justify-center font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-gray-600">
                    {staff.name}
                  </div>
                  {globalTimeBlocks.map(tb => {
                    const shift = Shifts.find(s => {
                      if (s.staffId !== staff.id) return false;
                      const [start, end] = (s.timeBlock || '').split('-');
                      if (!start || !end) return s.timeBlock === tb; // Fallback for old single-time blocks
                      return tb >= start && tb < end; // String comparison works for HH:mm
                    });
                    const position = shift ? Positions.find(p => p.id === shift.positionId) : null;
                    
                    const isTimeAvailable = (!staff.availableStartTime || staff.availableStartTime <= tb) && (!staff.availableEndTime || staff.availableEndTime > tb);
                    
                    return (
                      <div key={tb} className={`shift-cell p-1 border-r border-gray-100 flex items-center justify-center ${!isTimeAvailable && !position ? 'bg-gray-50' : ''}`}>
                        {position ? (
                          <div className="w-full h-full bg-indigo-100 text-indigo-700 rounded text-xs font-bold flex flex-col items-center justify-center px-1 text-center border border-indigo-200">
                            <span className="truncate w-full">{position.name}</span>
                          </div>
                        ) : (
                          <div className="text-gray-300 text-xs">
                            {!isTimeAvailable ? '×' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
