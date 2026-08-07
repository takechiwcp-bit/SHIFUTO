import { useState, useEffect, useRef } from 'react';
import { parse, addMinutes, isBefore, format } from 'date-fns';
import type { EventConfig, Category, Position, Staff, ShiftEntry, ShiftEvent } from './types';
import { supabase } from './supabase';

export const defaultEventConfig: EventConfig = {
  name: '新規イベント',
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '17:00',
  intervalMinutes: 30,
  maxContinuousWorkMinutes: 240,
  aiPrompt: ''
};

export const useAppStore = () => {
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

  const [eventsList, setEventsList] = useState<ShiftEvent[]>(() => {
    const saved = localStorage.getItem('shift_eventsList');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeEventId, setActiveEventId] = useState<string | null>(() => {
    return localStorage.getItem('shift_activeEventId');
  });

  const [lastUpdated, setLastUpdated] = useState<number>(() => {
    const saved = localStorage.getItem('shift_lastUpdated');
    return saved ? parseInt(saved) : 0;
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Ref to prevent infinite loops from remote updates
  const isRemoteUpdateRef = useRef(false);
  const syncStatusRef = useRef(syncStatus);
  syncStatusRef.current = syncStatus;

  // Save working state to local storage
  useEffect(() => { localStorage.setItem('shift_eventConfig', JSON.stringify(eventConfig)); }, [eventConfig]);
  useEffect(() => { localStorage.setItem('shift_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('shift_positions', JSON.stringify(positions)); }, [positions]);
  useEffect(() => { localStorage.setItem('shift_staffList', JSON.stringify(staffList)); }, [staffList]);
  useEffect(() => { localStorage.setItem('shift_shifts', JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { localStorage.setItem('shift_eventsList', JSON.stringify(eventsList)); }, [eventsList]);
  useEffect(() => { 
    if (activeEventId) localStorage.setItem('shift_activeEventId', activeEventId);
    else localStorage.removeItem('shift_activeEventId');
  }, [activeEventId]);
  useEffect(() => { 
    if (isEventLoaded) localStorage.setItem('shift_eventLoaded', 'true'); 
    else localStorage.removeItem('shift_eventLoaded');
  }, [isEventLoaded]);
  useEffect(() => { localStorage.setItem('shift_lastUpdated', lastUpdated.toString()); }, [lastUpdated]);

  // Auto-sync to Supabase when local data changes
  useEffect(() => {
    if (!isEventLoaded || !activeEventId) return;
    
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    
    setSyncStatus('saving');
    const timer = setTimeout(() => {
      syncToSupabase();
    }, 1500); // 1.5秒デバウンス
    
    return () => clearTimeout(timer);
  }, [eventConfig, categories, positions, staffList, shifts]);

  // Supabase リアルタイムサブスクリプション
  useEffect(() => {
    // 初回ロード
    loadFromSupabase();

    // リアルタイム通信の購読
    const channel = supabase
      .channel('public-schema')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
         const record = payload.new || payload.old;
         if (!record) return;
         
         const evtId = record.event_id || (payload.table === 'events' ? record.id : null);
         
         // リモートからの変更で、かつ自分が保存中でない場合のみリロード
         if (evtId === activeEventId && syncStatusRef.current !== 'saving') {
             // reload the specific event data after a short delay to batch multiple updates
             setTimeout(() => {
               if (syncStatusRef.current !== 'saving') {
                 loadFullEvent(activeEventId);
               }
             }, 500);
         } else if (payload.table === 'events' && !activeEventId) {
             // ダッシュボードにいる場合は一覧だけ更新
             loadFromSupabase();
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeEventId]);

  const removeStaff = (id: string) => {
    setStaffList(prev => prev.filter(s => s.id !== id));
  };

  const loadFullEvent = async (id: string) => {
    try {
      const { data: evt } = await supabase.from('events').select('*').eq('id', id).single();
      if (!evt) return;

      const { data: catData } = await supabase.from('categories').select('*').eq('event_id', id);
      const { data: posData } = await supabase.from('positions').select('*').eq('event_id', id);
      const { data: staffData } = await supabase.from('staff').select('*').eq('event_id', id);
      const { data: schedData } = await supabase.from('position_schedules').select('*').eq('event_id', id);

      isRemoteUpdateRef.current = true;
      
      setEventConfig({
        name: evt.name,
        date: evt.date,
        startTime: evt.start_time,
        endTime: evt.end_time,
        intervalMinutes: evt.interval_minutes,
        maxContinuousWorkMinutes: evt.max_continuous_work_minutes,
        aiPrompt: evt.ai_prompt
      });
      setLastUpdated(evt.last_updated);

      setCategories((catData || []).map(c => ({ id: c.id, name: c.name })));
      
      setPositions((posData || []).map(p => ({
        id: p.id,
        categoryId: p.category_id,
        name: p.name,
        color: p.color || '#3b82f6',
        startTime: p.start_time || evt.start_time,
        endTime: p.end_time || evt.end_time,
        requiredCount: p.required_count
      })));

      setStaffList((staffData || []).map(s => ({
        id: s.id,
        name: s.name,
        availableStart: s.available_start || evt.start_time,
        availableEnd: s.available_end || evt.end_time,
        notes: s.notes || ''
      })));

      const parsedShifts: ShiftEntry[] = [];
      (schedData || []).forEach(sched => {
         const slots = sched.time_slots || {};
         for (const [timeSlot, staffId] of Object.entries(slots)) {
            parsedShifts.push({
               staffId: staffId as string,
               positionId: sched.position_id,
               timeSlot
            });
         }
      });
      setShifts(parsedShifts);
    } catch (err) {
      console.error('Failed to load full event', err);
    }
  };

  const loadFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('events').select('*');
      if (error) throw error;
      
      if (data) {
        const events: ShiftEvent[] = data.map(d => ({
          id: d.id,
          eventConfig: {
            name: d.name,
            date: d.date,
            startTime: d.start_time,
            endTime: d.end_time,
            intervalMinutes: d.interval_minutes,
            maxContinuousWorkMinutes: d.max_continuous_work_minutes,
            aiPrompt: d.ai_prompt
          },
          categories: [], positions: [], staffList: [], shifts: [],
          lastUpdated: d.last_updated,
        }));
        
        setEventsList(events);
      }

      if (activeEventId) {
        await loadFullEvent(activeEventId);
      }
    } catch (err) {
      console.error('Supabase load error', err);
    }
  };

  const syncToSupabase = async () => {
    if (!activeEventId) return;

    try {
      const newTimestamp = Date.now();

      // 1. events table
      await supabase.from('events').upsert({
        id: activeEventId,
        name: eventConfig.name,
        date: eventConfig.date,
        start_time: eventConfig.startTime,
        end_time: eventConfig.endTime,
        interval_minutes: eventConfig.intervalMinutes,
        max_continuous_work_minutes: eventConfig.maxContinuousWorkMinutes,
        ai_prompt: eventConfig.aiPrompt || '',
        last_updated: newTimestamp
      });

      // Helper function for intelligent diffing
      const syncTable = async (tableName: string, localArray: any[], localToDbMapper: (item: any) => any) => {
         const { data: cloudData } = await supabase.from(tableName).select('id').eq('event_id', activeEventId);
         const localIds = new Set(localArray.map(x => x.id));
         const toDelete = (cloudData || []).filter(c => !localIds.has(c.id)).map(c => c.id);
         
         if (toDelete.length > 0) {
           await supabase.from(tableName).delete().in('id', toDelete);
         }
         if (localArray.length > 0) {
           await supabase.from(tableName).upsert(localArray.map(localToDbMapper));
         }
      };

      // 2. categories
      await syncTable('categories', categories, c => ({ 
        id: c.id, event_id: activeEventId, name: c.name 
      }));

      // 3. positions
      await syncTable('positions', positions, p => ({ 
        id: p.id, event_id: activeEventId, category_id: p.categoryId, name: p.name, 
        color: p.color, start_time: p.startTime, end_time: p.endTime, required_count: p.requiredCount 
      }));

      // 4. staff
      await syncTable('staff', staffList, s => ({ 
        id: s.id, event_id: activeEventId, name: s.name, 
        available_start: s.availableStart, available_end: s.availableEnd, notes: s.notes 
      }));

      // 5. position_schedules
      const scheduleMap = new Map<string, Record<string, string>>();
      positions.forEach(p => scheduleMap.set(p.id, {}));
      shifts.forEach(sh => {
         if (!scheduleMap.has(sh.positionId)) scheduleMap.set(sh.positionId, {});
         scheduleMap.get(sh.positionId)![sh.timeSlot] = sh.staffId;
      });

      const schedulesToUpsert = Array.from(scheduleMap.entries()).map(([posId, timeSlots]) => ({
         id: `${activeEventId}_${posId}`, 
         event_id: activeEventId,
         position_id: posId,
         time_slots: timeSlots
      }));
      await syncTable('position_schedules', schedulesToUpsert, s => s);

      setLastUpdated(newTimestamp);
      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error('Supabase sync error', err);
      setSyncStatus('error');
    }
  };

  // ----- その他の既存機能 -----

  const exportToFile = () => {
    const data = { eventConfig, categories, positions, staffList, shifts };
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
          
          const id = Date.now().toString();
          setLastUpdated(Date.now());
          setActiveEventId(id);
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

  const createNewEvent = () => {
    const id = Date.now().toString();
    setEventConfig(defaultEventConfig);
    setCategories([]);
    setPositions([]);
    setStaffList([]);
    setShifts([]);
    setLastUpdated(Date.now());
    setActiveEventId(id);
    setIsEventLoaded(true);
    return id;
  };

  const loadEvent = (id: string) => {
    setActiveEventId(id);
    setIsEventLoaded(true);
    loadFullEvent(id);
  };

  const resetData = () => {
    setActiveEventId(null);
    setIsEventLoaded(false);
  };

  const autoAssignShifts = () => {
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
       
       for (const pos of activePositions) {
          const currentAssigned = newShifts.filter(s => s.timeSlot === time && s.positionId === pos.id).length;
          const needed = (Number(pos.requiredCount) || 1) - currentAssigned;
          
          if (needed > 0) {
            let candidates = staffList.filter(s => {
               if (!isAvailable(s.id, time)) return false;
               if (workingThisSlot.has(s.id)) return false;
               
               const maxMins = Number(eventConfig.maxContinuousWorkMinutes) || 240;
               if (continuousMinutes[s.id] + Number(eventConfig.intervalMinutes) > maxMins) return false;
               
               return true;
            });
            
            const cat = categories.find(c => c.id === pos.categoryId);
            
            const scored = candidates.map(s => {
               let score = 0;
               const notes = s.notes || '';
               
               const mentionedPosIds = new Set(positions.filter(p => p.name && notes.includes(p.name)).map(p => p.id));
               const mentionedCatIds = new Set(categories.filter(c => c.name && notes.includes(c.name)).map(c => c.id));
               
               let mentionsThis = false;
               if (mentionedPosIds.has(pos.id)) {
                 mentionsThis = true;
               } else if (cat && mentionedCatIds.has(cat.id)) {
                 const mentionedSpecificPosInCat = positions.some(p => p.categoryId === cat.id && p.name && notes.includes(p.name));
                 if (!mentionedSpecificPosInCat) {
                   mentionsThis = true; 
                 }
               }
               
               const isNG = notes.includes('NG') || notes.includes('不可') || notes.includes('無理') || notes.includes('ない') || notes.includes('以外');
               
               if (mentionsThis) {
                 if (isNG) {
                   score -= 1000;
                 } else {
                   score += 100;
                 }
               }
               
               score += Math.random() * 5; 
               score -= (totalShifts[s.id] || 0) * 10;
               return { staff: s, score };
            });
            
            const validScored = scored.filter(s => s.score > -500);
            validScored.sort((a, b) => b.score - a.score);
            
            for (let i = 0; i < Math.min(needed, validScored.length); i++) {
               const sId = validScored[i].staff.id;
               newShifts.push({ staffId: sId, timeSlot: time, positionId: pos.id });
               workingThisSlot.add(sId);
               totalShifts[sId]++;
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
    removeStaff,
    isEventLoaded, setIsEventLoaded,
    exportToFile,
    importFromFile,
    resetData,
    createNewEvent,
    loadEvent,
    eventsList,
    activeEventId,
    syncToCloud: syncToSupabase,
    loadFromCloud: loadFromSupabase,
    autoAssignShifts,
    syncStatus
  };
};

export type AppStore = ReturnType<typeof useAppStore>;
