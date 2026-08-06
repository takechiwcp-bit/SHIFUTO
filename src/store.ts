import { useState, useEffect } from 'react';
import { parse, addMinutes, isBefore, format } from 'date-fns';
import type { EventConfig, Category, Position, Staff, ShiftEntry } from './types';

export const defaultEventConfig: EventConfig = {
  name: '新規イベント',
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '17:00',
  intervalMinutes: 30,
  maxContinuousWorkMinutes: 240,
};

// ==========================================
// ここにGASのURLを貼り付けます
// 例: "https://script.google.com/macros/s/AKfycb.../exec"
// ==========================================
export const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyqUuD3fatjoOv9Uu7hZ9lsZOsUd8AuAAVjAJBy0Y0R8vhip8p1wsVAXZGNiCNI41bQsQ/exec";

export const useAppStore = () => {
  // Load from local storage
  const [eventConfig, setEventConfig] = useState<EventConfig>(() => {
    const saved = localStorage.getItem('shift_eventConfig');
    return saved ? JSON.parse(saved) : defaultEventConfig;
  });
  
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('shift_categories');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [positions, setPositions] = useState<Position[]>(() => {
    const saved = localStorage.getItem('shift_positions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('shift_staffList');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [shifts, setShifts] = useState<ShiftEntry[]>(() => {
    const saved = localStorage.getItem('shift_shifts');
    return saved ? JSON.parse(saved) : [];
  });

  const [isEventLoaded, setIsEventLoaded] = useState(() => {
    return localStorage.getItem('shift_eventLoaded') !== null;
  });

  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);

  // Save to local storage
  useEffect(() => { localStorage.setItem('shift_eventConfig', JSON.stringify(eventConfig)); }, [eventConfig]);
  useEffect(() => { localStorage.setItem('shift_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('shift_positions', JSON.stringify(positions)); }, [positions]);
  useEffect(() => { localStorage.setItem('shift_staffList', JSON.stringify(staffList)); }, [staffList]);
  useEffect(() => { localStorage.setItem('shift_shifts', JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { if(isEventLoaded) localStorage.setItem('shift_eventLoaded', 'true'); }, [isEventLoaded]);

  // Auto-sync to cloud when local data changes
  useEffect(() => {
    if (!WEBHOOK_URL || !isEventLoaded) return;
    if (isRemoteUpdate) {
      setIsRemoteUpdate(false);
      return;
    }
    
    setSyncStatus('saving');
    const timer = setTimeout(() => {
      syncToCloud();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [eventConfig, categories, positions, staffList, shifts]);

  const exportToFile = () => {
    const data = {
      eventConfig,
      categories,
      positions,
      staffList,
      shifts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventConfig.name || 'event'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importFromFile = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.eventConfig) setEventConfig(data.eventConfig);
          if (data.categories) setCategories(data.categories);
          if (data.positions) setPositions(data.positions);
          if (data.staffList) setStaffList(data.staffList);
          if (data.shifts) setShifts(data.shifts);
          setIsEventLoaded(true);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  };

  const resetData = () => {
    setEventConfig(defaultEventConfig);
    setCategories([]);
    setPositions([]);
    setStaffList([]);
    setShifts([]);
    setIsEventLoaded(true);
  };

  const syncToCloud = async () => {
    if (!WEBHOOK_URL) return;
    
    const newTimestamp = Date.now();
    const data = {
      eventConfig,
      categories,
      positions,
      staffList,
      shifts,
      lastUpdated: newTimestamp
    };
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success) {
        setLastUpdated(newTimestamp);
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const loadFromCloud = async () => {
    if (!WEBHOOK_URL) return;
    
    try {
      const response = await fetch(WEBHOOK_URL);
      const data = await response.json();
      
      if (data && data.eventConfig) {
        // Only update if remote is newer
        if (data.lastUpdated && data.lastUpdated <= lastUpdated) {
          return;
        }
        
        setIsRemoteUpdate(true);
        setEventConfig(data.eventConfig);
        setCategories(data.categories || []);
        setPositions(data.positions || []);
        setStaffList(data.staffList || []);
        setShifts(data.shifts || []);
        setLastUpdated(data.lastUpdated || Date.now());
        setIsEventLoaded(true);
      }
    } catch (err) {
      console.error('Cloud load failed', err);
    }
  };

  const autoAssignShifts = () => {
    // Generate time slots
    const start = parse(eventConfig.startTime, 'HH:mm', new Date());
    let end = parse(eventConfig.endTime, 'HH:mm', new Date());
    if (isBefore(end, start)) {
      end = addMinutes(end, 24 * 60);
    }
    const slots: string[] = [];
    let current = start;
    while (isBefore(current, end)) {
      slots.push(format(current, 'HH:mm'));
      current = addMinutes(current, eventConfig.intervalMinutes);
    }
    
    const newShifts = [...shifts];
    const continuousMinutes: Record<string, number> = {};
    const totalShifts: Record<string, number> = {};
    
    staffList.forEach(s => {
      continuousMinutes[s.id] = 0;
      totalShifts[s.id] = newShifts.filter(sh => sh.staffId === s.id).length;
    });

    const isAvailable = (staffId: string, timeSlot: string) => {
      const staff = staffList.find(s => s.id === staffId);
      if (!staff) return false;
      const start = staff.availableStart || eventConfig.startTime;
      const end = staff.availableEnd || eventConfig.endTime;
      return timeSlot >= start && timeSlot < end;
    };
    
    for (const time of slots) {
       const workingThisSlot = new Set(newShifts.filter(s => s.timeSlot === time).map(s => s.staffId));
       
       const activePositions = positions.filter(p => {
          const start = p.startTime || eventConfig.startTime;
          const end = p.endTime || eventConfig.endTime;
          return time >= start && time < end;
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
                 
                 if (pass === 1) {
                   return mentionsThis;
                 } else {
                   return !mentionsAny;
                 }
              });
              
              const scored = candidates.map(s => {
                 let score = 0;
                 // 公平に割り振るためのスコア計算
                 score += Math.random() * 5; 
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
            continuousMinutes[s.id] += eventConfig.intervalMinutes;
          } else {
            continuousMinutes[s.id] = 0;
          }
       });
    }
    
    setShifts(newShifts);
  };

  return {
    eventConfig, setEventConfig,
    categories, setCategories,
    positions, setPositions,
    staffList, setStaffList,
    shifts, setShifts,
    isEventLoaded, setIsEventLoaded,
    exportToFile,
    importFromFile,
    resetData,
    syncToCloud,
    loadFromCloud,
    autoAssignShifts,
    syncStatus
  };
};

export type AppStore = ReturnType<typeof useAppStore>;
