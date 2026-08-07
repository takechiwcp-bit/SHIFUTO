export interface Category {
  id: string;
  name: string;
}

export interface Position {
  id: string;
  categoryId: string;
  name: string;
  color: string;
  startTime: string;
  endTime: string;
  requiredCount: number;
}

export interface Staff {
  id: string;
  name: string;
  availableStart: string; // "HH:mm" format
  availableEnd: string;   // "HH:mm" format
  notes: string;
}

export interface ShiftEntry {
  staffId: string;
  positionId: string;
  timeSlot: string; // "HH:mm" format
}

export interface EventConfig {
  name: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  intervalMinutes: number;
  maxContinuousWorkMinutes: number;
}

export interface ShiftEvent {
  id: string;
  eventConfig: EventConfig;
  categories: Category[];
  positions: Position[];
  staffList: Staff[];
  shifts: ShiftEntry[];
  lastUpdated: number;
  payload?: string;
  staffCount?: number;
  deletedStaffIds?: string[];
}
