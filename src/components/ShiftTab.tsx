import { useState } from 'react';
import { useStore } from '../store';
import { Calendar, UserPlus, X } from 'lucide-react';
import { format, addMinutes, parse } from 'date-fns';

interface ShiftTabProps {
  eventId: string;
}

export const ShiftTab: React.FC<ShiftTabProps> = ({ eventId }) => {
  const { Positions, PositionCategories, Staff, Shifts, StaffTraits, dispatchAction } = useStore();
  
  const eventCategories = PositionCategories.filter(c => c.eventId === eventId);
  const eventCategoryIds = eventCategories.map(c => c.id);
  const eventPositions = Positions.filter(p => eventCategoryIds.includes(p.categoryId));

  const [assignModal, setAssignModal] = useState<{
    positionId: string;
    timeBlock: string;
    slotIndex: number;
  } | null>(null);

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

  const handleAssign = (staffId: string) => {
    if (!assignModal) return;
    dispatchAction('ASSIGN_SHIFT', {
      positionId: assignModal.positionId,
      timeBlock: assignModal.timeBlock,
      slotIndex: assignModal.slotIndex,
      staffId
    });
    setAssignModal(null);
  };

  const handleRemove = (positionId: string, timeBlock: string, slotIndex: number) => {
    dispatchAction('REMOVE_SHIFT', { positionId, timeBlock, slotIndex });
  };

  if (eventPositions.length === 0) {
    return (
      <div className="glass-panel text-center py-12 text-gray-500">
        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
        <p>このイベントにはポジションが作成されていません。</p>
        <p>「ポジション管理」タブからポジションを追加してください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {eventPositions.map(pos => {
        const timeBlocks = generateTimeBlocks(pos.startTime, pos.endTime, pos.unitTime);
        
        return (
          <div key={pos.id} className="shift-container">
            <div className="p-4 border-b bg-white flex justify-between items-center sticky left-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-primary">{pos.name}</h3>
                <p className="text-sm text-gray-500">必要人数: {pos.requiredPeople}名 / 単位: {pos.unitTime}分 / 備考: {pos.remarks}</p>
              </div>
            </div>
            
            <div className="shift-grid overflow-x-auto pb-4">
              <div className="shift-header-row" style={{ gridTemplateColumns: `120px repeat(${timeBlocks.length}, minmax(80px, 1fr))` }}>
                <div className="shift-header-cell sticky left-0 z-10 bg-gray-50 border-r">枠 \ 時間</div>
                {timeBlocks.map(tb => (
                  <div key={tb} className="shift-header-cell">{tb}</div>
                ))}
              </div>

              {Array.from({ length: pos.requiredPeople }).map((_, slotIndex) => (
                <div key={slotIndex} className="shift-data-row" style={{ gridTemplateColumns: `120px repeat(${timeBlocks.length}, minmax(80px, 1fr))` }}>
                  <div className="shift-header-cell sticky left-0 z-10 bg-white border-r">枠 {slotIndex + 1}</div>
                  
                  {timeBlocks.map(tb => {
                    const assignedShift = Shifts.find(s => s.positionId === pos.id && s.timeBlock === tb && s.slotIndex === slotIndex);
                    const assignedStaff = assignedShift ? Staff.find(s => s.id === assignedShift.staffId) : null;
                    
                    return (
                      <div key={tb} className="shift-cell relative group">
                        {assignedStaff ? (
                          <div className="slot-indicator assigned flex justify-between items-center h-full w-full p-2">
                            <span className="truncate text-xs font-bold">{assignedStaff.name}</span>
                            <button 
                              className="text-white hover:text-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemove(pos.id, tb, slotIndex)}
                            >
                              <X size={14}/>
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="slot-indicator h-full w-full flex items-center justify-center text-gray-400 hover:text-primary border border-dashed border-gray-300"
                            onClick={() => setAssignModal({ positionId: pos.id, timeBlock: tb, slotIndex })}
                          >
                            <UserPlus size={16} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {assignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4">
              <h2>スタッフ割り当て</h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setAssignModal(null)}><X size={24}/></button>
            </div>
            
            <p className="mb-4 text-sm text-gray-600">
              {Positions.find(p => p.id === assignModal.positionId)?.name} ({assignModal.timeBlock}) 枠 {assignModal.slotIndex + 1}
            </p>

            <div className="max-h-96 overflow-y-auto pr-2">
              {Staff.length === 0 ? (
                <p className="text-gray-500">スタッフが登録されていません。</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {Staff.map(s => {
                    const trait = StaffTraits.find(t => t.staffId === s.id && t.positionId === assignModal.positionId)?.trait;
                    let badgeColor = 'bg-gray-100 text-gray-600';
                    if (trait === '◎') badgeColor = 'bg-blue-100 text-blue-700';
                    if (trait === '◯') badgeColor = 'bg-green-100 text-green-700';
                    if (trait === '△') badgeColor = 'bg-yellow-100 text-yellow-700';
                    if (trait === '×') badgeColor = 'bg-red-100 text-red-700';

                    return (
                      <div 
                        key={s.id}
                        className="flex justify-between items-center p-3 border rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors"
                        onClick={() => handleAssign(s.id)}
                      >
                        <div>
                          <div className="font-semibold">{s.name}</div>
                          {s.remarks && <div className="text-xs text-gray-500">{s.remarks}</div>}
                        </div>
                        {trait && <span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>{trait}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
