const eventConfig = { name: 'Test', date: '2023-10-01', startTime: '09:00', endTime: '22:00', intervalMinutes: 15 };
const categories = Array.from({length: 10}, (_,i) => ({id: 'c'+i, name: 'Cat'+i}));
const positions = Array.from({length: 30}, (_,i) => ({id: 'p'+i, name: 'Pos'+i, categoryId: 'c'+(i%10), requiredCount: 2, color: '#ff0000', startTime: '09:00', endTime: '22:00'}));
const staffList = Array.from({length: 12}, (_,i) => ({id: 's'+i, name: 'Staff'+i, availableStart: '09:00', availableEnd: '22:00', notes: 'Something something'}));
const timeSlots = [];
let current = 9 * 60;
while(current < 22 * 60) {
  const h = Math.floor(current/60).toString().padStart(2,'0');
  const m = (current%60).toString().padStart(2,'0');
  timeSlots.push(`${h}:${m}`);
  current += 15;
}
const shifts = [];
staffList.forEach(s => {
  timeSlots.forEach(t => {
    shifts.push({staffId: s.id, timeSlot: t, positionId: 'p'+Math.floor(Math.random()*30)});
  });
});
const payload = {
  id: 'event_1',
  eventConfig, categories, positions, staffList, shifts, lastUpdated: Date.now()
};
console.log("JSON Length:", JSON.stringify(payload).length);
