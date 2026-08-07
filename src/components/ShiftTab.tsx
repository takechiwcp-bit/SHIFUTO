import { useState } from 'react';
import { useStore } from '../store';
import { Calendar, UserPlus, X, Wand2, LayoutGrid, Users } from 'lucide-react';
import { format, addMinutes, parse } from 'date-fns';
import type { Staff, Shift } from '../types';

interface ShiftTabProps {
  eventId: string;
}

export const ShiftTab: React.FC<ShiftTabProps> = ({ eventId }) => {
  const { Positions, PositionCategories, Staff, Shifts, StaffTraits, dispatchAction } = useStore();
  
  const [viewMode, setViewMode] = useState<'position' | 'staff'>('position');

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

  const handleAutoAssign = () => {
    const newAssignments: Omit<Shift, 'id'>[] = [];
    const currentShifts = [...Shifts];

    for (const pos of eventPositions) {
      const timeBlocks = generateTimeBlocks(pos.startTime, pos.endTime, pos.unitTime);
      for (const tb of timeBlocks) {
        for (let slotIndex = 0; slotIndex < pos.requiredPeople; slotIndex++) {
          const existing = currentShifts.find(s => s.positionId === pos.id && s.timeBlock === tb && s.slotIndex === slotIndex);
          if (existing) continue;

          const availableStaff = Staff.filter(s => {
            const isTimeAvailable = (!s.availableStartTime || s.availableStartTime <= tb) && (!s.availableEndTime || s.availableEndTime > tb);
            if (!isTimeAvailable) return false;
            
            const isAlreadyWorking = currentShifts.some(shift => shift.staffId === s.id && shift.timeBlock === tb);
            if (isAlreadyWorking) return false;
            
            const trait = StaffTraits.find(t => t.staffId === s.id && t.positionId === pos.id)?.trait;
            if (trait === '×') return false;
            
            return true;
          });

          if (availableStaff.length > 0) {
            const traitScore = (s: Staff) => {
              const trait = StaffTraits.find(t => t.staffId === s.id && t.positionId === pos.id)?.trait;
              if (trait === '◎') return 3;
              if (trait === '◯') return 2;
              if (trait === '△') return 1;
              return 0;
            };
            
            availableStaff.sort((a, b) => traitScore(b) - traitScore(a));
            
            const selectedStaff = availableStaff[0];
            const newShift = {
              positionId: pos.id,
              timeBlock: tb,
              slotIndex: slotIndex,
              staffId: selectedStaff.id
            };
            newAssignments.push(newShift as any);
            currentShifts.push(newShift as any);
          }
        }
      }
    }

    if (newAssignments.length > 0) {
      dispatchAction('BULK_ASSIGN_SHIFTS', newAssignments);
    } else {
      alert("割り当て可能なスタッフがいませんでした");
    }
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

  // Calculate common time blocks for Staff View
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${viewMode === 'position' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setViewMode('position')}
          >
            <LayoutGrid size={16} />
            ポジション別
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${viewMode === 'staff' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setViewMode('staff')}
          >
            <Users size={16} />
            スタッフ別
          </button>
        </div>
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={handleAutoAssign}
        >
          <Wand2 size={18} />
          自動シフト作成
        </button>
      </div>

      {viewMode === 'position' ? (
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
                                  className="text-white bg-black/20 hover:bg-red-500 rounded-full p-1 transition-colors"
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
        </div>
      ) : (
        <div className="shift-container bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 sticky left-0 z-10">
            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <Users size={20} className="text-indigo-500" />
              スタッフ別シフト表
            </h3>
          </div>
          <div className="overflow-x-auto pb-4">
            <div className="shift-grid" style={{ minWidth: 'max-content' }}>
              <div className="shift-header-row" style={{ gridTemplateColumns: `150px repeat(${globalTimeBlocks.length}, minmax(80px, 1fr))` }}>
                <div className="shift-header-cell sticky left-0 z-10 bg-gray-100 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">スタッフ名 \ 時間</div>
                {globalTimeBlocks.map(tb => (
                  <div key={tb} className="shift-header-cell bg-gray-50 text-gray-600">{tb}</div>
                ))}
              </div>
              
              {Staff.map(staff => {
                return (
                  <div key={staff.id} className="shift-data-row border-b border-gray-100 hover:bg-gray-50 transition-colors" style={{ gridTemplateColumns: `150px repeat(${globalTimeBlocks.length}, minmax(80px, 1fr))` }}>
                    <div className="shift-header-cell sticky left-0 z-10 bg-white border-r flex items-center font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {staff.name}
                    </div>
                    {globalTimeBlocks.map(tb => {
                      const shift = Shifts.find(s => s.staffId === staff.id && s.timeBlock === tb);
                      const position = shift ? Positions.find(p => p.id === shift.positionId) : null;
                      
                      const isTimeAvailable = (!staff.availableStartTime || staff.availableStartTime <= tb) && (!staff.availableEndTime || staff.availableEndTime > tb);
                      
                      return (
                        <div key={tb} className={`shift-cell p-1 border-r border-gray-100 flex items-center justify-center ${!isTimeAvailable && !position ? 'bg-gray-100' : ''}`}>
                          {position ? (
                            <div className="w-full h-full bg-indigo-100 text-indigo-700 rounded text-xs font-bold flex items-center justify-center px-1 truncate border border-indigo-200">
                              {position.name}
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
      )}

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

                    const isAvailable = (!s.availableStartTime || s.availableStartTime <= assignModal.timeBlock) && 
                                        (!s.availableEndTime || s.availableEndTime > assignModal.timeBlock);

                    return (
                      <div 
                        key={s.id}
                        className={`flex justify-between items-center p-3 border rounded-lg cursor-pointer transition-colors ${!isAvailable ? 'opacity-50 bg-gray-50 hover:bg-gray-100' : 'hover:bg-indigo-50'}`}
                        onClick={() => handleAssign(s.id)}
                      >
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {s.name}
                            {!isAvailable && <span className="text-xs bg-red-500 text-white px-1 rounded">時間外</span>}
                          </div>
                          {(s.availableStartTime && s.availableEndTime) && (
                            <div className="text-xs text-gray-500 mb-1">
                              可能時間: {s.availableStartTime}〜{s.availableEndTime}
                            </div>
                          )}
                          {s.remarks && <div className="text-xs text-gray-400">{s.remarks}</div>}
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
