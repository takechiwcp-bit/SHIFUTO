import { useState } from 'react';
import { useStore } from '../store';
import { Calendar, UserPlus, X, Wand2, Users, Clock } from 'lucide-react';
import type { Staff, Shift } from '../types';

interface ShiftTabProps {
  eventId: string;
}

const generateTimeBlocks = (start: string, end: string, unitMins: number) => {
  if (!start || !end || !unitMins) return [];
  const blocks = [];
  try {
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

    let current = parseTime(start);
    const endTime = parseTime(end);

    let iterations = 0;
    while (current < endTime && iterations < 100) {
      iterations++;
      let next = current + unitMins;
      if (next > endTime) next = endTime;
      blocks.push(`${formatTime(current)}-${formatTime(next)}`);
      current = next;
    }
    return blocks;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const ShiftTab: React.FC<ShiftTabProps> = ({ eventId }) => {
  const { Positions, PositionCategories, Staff, Shifts, StaffTraits, dispatchAction } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  


  const eventCategories = PositionCategories.filter(c => c.eventId === eventId);
  const eventCategoryIds = eventCategories.map(c => c.id);
  const eventPositions = Positions.filter(p => eventCategoryIds.includes(p.categoryId));

  const [assignModal, setAssignModal] = useState<{
    positionId: string;
    slotIndex: number;
    startTime: string;
    endTime: string;
  } | null>(null);

  const handleAssign = (staffId: string) => {
    if (!assignModal) return;
    const timeBlock = `${assignModal.startTime}-${assignModal.endTime}`;
    dispatchAction('ASSIGN_SHIFT', {
      positionId: assignModal.positionId,
      timeBlock,
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
      for (let slotIndex = 0; slotIndex < pos.requiredPeople; slotIndex++) {
        // Find existing shifts for this slot
        const existingShifts = currentShifts.filter(s => s.positionId === pos.id && s.slotIndex === slotIndex);
        if (existingShifts.length > 0) continue; // Skip if already has shifts for simplicity in auto-assign

        const timeBlock = `${pos.startTime}-${pos.endTime}`;

        const availableStaff = Staff.filter(s => {
          // Simplified availability check for auto-assign: must be available for the entire position time
          const isTimeAvailable = (!s.availableStartTime || s.availableStartTime <= pos.startTime) && 
                                  (!s.availableEndTime || s.availableEndTime >= pos.endTime);
          if (!isTimeAvailable) return false;
          
          // Check if already working anywhere in this time block (simplified: if working at all)
          const isAlreadyWorking = currentShifts.some(shift => shift.staffId === s.id); // Very naive, but good enough for now
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
            timeBlock,
            slotIndex: slotIndex,
            staffId: selectedStaff.id
          };
          newAssignments.push(newShift as any);
          currentShifts.push(newShift as any);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex gap-2">
          <button 
            className="btn flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
            onClick={() => {
              if (window.confirm("すべてのシフトデータを消去してリセットしますか？\n（ポジションやスタッフの情報は消えません）")) {
                dispatchAction('CLEAR_ALL_SHIFTS', {});
              }
            }}
          >
            <X size={18} />
            全リセット
          </button>
          <button 
            className="btn btn-primary flex items-center gap-2"
            onClick={handleAutoAssign}
          >
            <Wand2 size={18} />
            自動シフト作成
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {eventPositions.map(pos => {
          return (
            <div key={pos.id} className="shift-container bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-primary">{pos.name}</h3>
                  <p className="text-sm text-gray-500">
                    設定時間: {pos.startTime}〜{pos.endTime} / 必要人数: {pos.requiredPeople}名 / 備考: {pos.remarks}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col p-4 gap-4">
                {Array.from({ length: pos.requiredPeople }).map((_, slotIndex) => {
                  const assignedShifts = Shifts.filter(s => s.positionId === pos.id && s.slotIndex === slotIndex);
                  
                  // Sort shifts by start time
                  assignedShifts.sort((a, b) => {
                    const startA = (a.timeBlock || '').split('-')[0] || '';
                    const startB = (b.timeBlock || '').split('-')[0] || '';
                    return startA.localeCompare(startB);
                  });

                  return (
                    <div key={slotIndex} className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 p-2 border-b border-gray-200 font-bold text-gray-700 text-sm flex items-center gap-2">
                        <Users size={16} />
                        枠 {slotIndex + 1}
                      </div>
                      <div className="flex flex-col p-2 gap-2">
                        {pos.isFixed ? (
                          // === 固定枠の場合 ===
                          assignedShifts.length > 0 ? (
                            assignedShifts.map(shift => {
                              const staff = Staff.find(s => s.id === shift.staffId);
                              const [start, end] = (shift.timeBlock || '').split('-');
                              return (
                                <div key={shift.id || shift.timeBlock} className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-3 rounded-md">
                                  <div className="flex items-center gap-4">
                                    <div className="font-bold text-indigo-900">{staff?.name || '不明なスタッフ'}</div>
                                    <div className="flex items-center gap-1 text-indigo-700 text-sm bg-white px-2 py-1 rounded shadow-sm">
                                      <Clock size={14} />
                                      {start} 〜 {end}
                                    </div>
                                  </div>
                                  <button 
                                    className="text-white bg-red-400 hover:bg-red-500 rounded-full p-1 transition-colors"
                                    onClick={() => handleRemove(pos.id, shift.timeBlock, slotIndex)}
                                  >
                                    <X size={16}/>
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <button 
                              className="py-3 w-full flex items-center justify-center gap-2 text-primary border border-dashed border-primary/30 rounded-md hover:bg-indigo-50 transition-colors font-bold text-sm bg-gray-50"
                              onClick={() => setAssignModal({ positionId: pos.id, slotIndex, startTime: pos.startTime, endTime: pos.endTime })}
                            >
                              <UserPlus size={18} />
                              この枠を通しで担当するスタッフを追加
                            </button>
                          )
                        ) : (
                          // === 変動枠の場合 ===
                          generateTimeBlocks(pos.startTime, pos.endTime, pos.unitTime).map(timeBlock => {
                            const [start, end] = timeBlock.split('-');
                            const shiftForBlock = assignedShifts.find(s => s.timeBlock === timeBlock);
                            
                            return (
                              <div key={timeBlock} className="flex items-stretch border border-gray-200 rounded overflow-hidden">
                                <div className="bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 flex items-center border-r border-gray-200 w-32 justify-center">
                                  {start} 〜 {end}
                                </div>
                                <div className="flex-1">
                                  {shiftForBlock ? (
                                    <div className="flex items-center justify-between bg-indigo-50 px-4 py-2 h-full">
                                      <div className="font-bold text-indigo-900">
                                        {Staff.find(s => s.id === shiftForBlock.staffId)?.name || '不明なスタッフ'}
                                      </div>
                                      <button 
                                        className="text-white bg-red-400 hover:bg-red-500 rounded-full p-1 transition-colors"
                                        onClick={() => handleRemove(pos.id, timeBlock, slotIndex)}
                                      >
                                        <X size={14}/>
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      className="w-full h-full py-2 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                      onClick={() => setAssignModal({ positionId: pos.id, slotIndex, startTime: start, endTime: end })}
                                    >
                                      <UserPlus size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {assignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4">
              <h2>シフト追加</h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setAssignModal(null)}><X size={24}/></button>
            </div>
            
            <p className="mb-4 text-sm font-bold text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
              {Positions.find(p => p.id === assignModal.positionId)?.name} - 枠 {assignModal.slotIndex + 1}
            </p>

            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <label className="text-sm text-gray-600 font-bold mb-1 block">開始時間</label>
                <div className="w-full p-2 border rounded bg-gray-100 text-gray-700">
                  {assignModal.startTime}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600 font-bold mb-1 block">終了時間</label>
                <div className="w-full p-2 border rounded bg-gray-100 text-gray-700">
                  {assignModal.endTime}
                </div>
              </div>
            </div>

            <p className="text-sm font-bold text-gray-700 mb-2">割り当てるスタッフを選択</p>
            <div className="mb-2">
              <input 
                type="text" 
                placeholder="スタッフ名を検索..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div className="h-[50vh] max-h-96 overflow-y-auto pr-2 border rounded-md p-2 bg-gray-50 flex flex-col gap-2">
              {Staff.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <p className="text-gray-500 text-sm">該当するスタッフがいません。</p>
              ) : (
                <>
                  {Staff.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => {
                    const trait = StaffTraits.find(t => t.staffId === s.id && t.positionId === assignModal.positionId)?.trait;
                    let badgeColor = 'bg-gray-100 text-gray-600';
                    if (trait === '◎') badgeColor = 'bg-blue-100 text-blue-700';
                    if (trait === '◯') badgeColor = 'bg-green-100 text-green-700';
                    if (trait === '△') badgeColor = 'bg-yellow-100 text-yellow-700';
                    if (trait === '×') badgeColor = 'bg-red-100 text-red-700';

                    const isAvailable = (!s.availableStartTime || s.availableStartTime <= assignModal.startTime) && 
                                        (!s.availableEndTime || s.availableEndTime >= assignModal.endTime);

                    return (
                      <div 
                        key={s.id}
                        className={`flex justify-between items-center p-3 bg-white border rounded-lg cursor-pointer transition-colors shadow-sm ${!isAvailable ? 'opacity-50 hover:bg-gray-50' : 'hover:border-primary hover:shadow-md'}`}
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
                        </div>
                        {trait && <span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>{trait}</span>}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
