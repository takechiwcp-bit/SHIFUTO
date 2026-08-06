const { parse, addMinutes, isBefore, format } = require('date-fns');

// Mock data
const eventConfig = {
  startTime: '09:00',
  endTime: '17:00',
  intervalMinutes: "30", // string to test
  maxContinuousWorkMinutes: 240
};
const positions = [{ id: 'p1', categoryId: 'c1', name: '受付', requiredCount: 1, startTime: '09:00', endTime: '17:00' }];
const categories = [{ id: 'c1', name: 'フロント' }];
const staffList = [
  { id: 's1', name: '山田', availableStart: '09:00', availableEnd: '17:00', notes: '' },
  { id: 's2', name: '佐藤', availableStart: '09:00', availableEnd: '17:00', notes: '受付' }
];
let shifts = [];

const autoAssignShifts = () => {
    const start = parse(eventConfig.startTime, 'HH:mm', new Date());
    let end = parse(eventConfig.endTime, 'HH:mm', new Date());
    if (isBefore(end, start)) {
      end = addMinutes(end, 24 * 60);
    }
    const slots = [];
    let current = start;
    while (isBefore(current, end)) {
      slots.push(format(current, 'HH:mm'));
      current = addMinutes(current, Number(eventConfig.intervalMinutes));
    }
    
    console.log("Slots:", slots);
    
    const newShifts = [...shifts];
    const continuousMinutes = {};
    const totalShifts = {};
    
    staffList.forEach(s => {
      continuousMinutes[s.id] = 0;
      totalShifts[s.id] = newShifts.filter(sh => sh.staffId === s.id).length;
    });

    const isAvailable = (staffId, timeSlot) => {
      const staff = staffList.find(s => s.id === staffId);
      if (!staff) return false;
      const startT = staff.availableStart || eventConfig.startTime;
      const endT = staff.availableEnd || eventConfig.endTime;
      return timeSlot >= startT && timeSlot < endT;
    };
    
    for (const time of slots) {
       const workingThisSlot = new Set(newShifts.filter(s => s.timeSlot === time).map(s => s.staffId));
       
       const activePositions = positions.filter(p => {
          const startT = p.startTime || eventConfig.startTime;
          const endT = p.endTime || eventConfig.endTime;
          return time >= startT && time < endT;
       });
       
       for (const pass of [1, 2]) {
         for (const pos of activePositions) {
            const currentAssigned = newShifts.filter(s => s.timeSlot === time && s.positionId === pos.id).length;
            const needed = (Number(pos.requiredCount) || 1) - currentAssigned;
            
            if (needed > 0) {
              let candidates = staffList.filter(s => {
                 if (!isAvailable(s.id, time)) return false;
                 if (workingThisSlot.has(s.id)) return false;
                 
                 const maxMins = Number(eventConfig.maxContinuousWorkMinutes) || 240;
                 if (continuousMinutes[s.id] + Number(eventConfig.intervalMinutes) > maxMins) return false;
                 
                 const notes = s.notes || '';
                 const cat = categories.find(c => c.id === pos.categoryId);
                 
                 const mentionsThis = (pos.name && notes.includes(pos.name)) || (cat && cat.name && notes.includes(cat.name));
                 const mentionsOtherPos = positions.some(p => p.name && p.id !== pos.id && notes.includes(p.name));
                 const mentionsOtherCat = categories.some(c => c.name && (!cat || c.id !== cat.id) && notes.includes(c.name));
                 const mentionsAny = mentionsOtherPos || mentionsOtherCat;
                 
                 if (pass === 1) return mentionsThis;
                 else return !mentionsAny;
              });
              
              const scored = candidates.map(s => {
                 let score = 0;
                 score -= (totalShifts[s.id] || 0) * 10;
                 return { staff: s, score };
              });
              
              scored.sort((a, b) => b.score - a.score);
              
              for (let i = 0; i < Math.min(needed, scored.length); i++) {
                 const sId = scored[i].staff.id;
                 newShifts.push({ staffId: sId, timeSlot: time, positionId: pos.id });
                 workingThisSlot.add(sId);
                 totalShifts[sId]++;
              }
            }
         }
       }
       
       staffList.forEach(s => {
          if (workingThisSlot.has(s.id)) {
            continuousMinutes[s.id] += Number(eventConfig.intervalMinutes);
          } else {
            continuousMinutes[s.id] = 0;
          }
       });
    }
    
    console.log("New Shifts:", newShifts);
}

autoAssignShifts();
