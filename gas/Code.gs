const SCRIPT_VERSION = "1.0";

function doGet(e) {
  try {
    const data = fetchAllData();
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    
    let result = null;
    
    switch (action) {
      case 'ADD_EVENT':
        result = addRecord('Events', payload);
        break;
      case 'UPDATE_EVENT':
        result = updateRecord('Events', payload);
        break;
      case 'DELETE_EVENT':
        result = deleteRecord('Events', payload.id);
        break;
      case 'ADD_CATEGORY':
        result = addRecord('PositionCategories', payload);
        break;
      case 'UPDATE_CATEGORY':
        result = updateRecord('PositionCategories', payload);
        break;
      case 'DELETE_CATEGORY':
        result = deleteRecord('PositionCategories', payload.id);
        break;
      case 'ADD_POSITION':
        result = addRecord('Positions', payload);
        break;
      case 'UPDATE_POSITION':
        result = updateRecord('Positions', payload);
        break;
      case 'DELETE_POSITION':
        result = deletePositionAndRelated(payload.id);
        break;
      case 'ADD_STAFF':
        result = addRecord('Staff', payload);
        break;
      case 'UPDATE_STAFF':
        result = updateRecord('Staff', payload);
        break;
      case 'DELETE_STAFF':
        result = deleteStaffAndRelated(payload.id);
        break;
      case 'UPSERT_TRAIT':
        result = upsertTrait(payload);
        break;
      case 'ASSIGN_SHIFT':
        result = assignShift(payload);
        break;
      case 'BULK_ASSIGN_SHIFTS':
        result = bulkAssignShifts(payload);
        break;
      case 'CLEAR_ALL_SHIFTS':
        result = clearAllShifts();
        break;
      case 'REMOVE_SHIFT':
        result = removeShift(payload.positionId, payload.timeBlock, payload.slotIndex);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }
    
    // Return updated state
    const data = fetchAllData();
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = getHeadersForSheet(sheetName);
    if (headers.length > 0) {
      sheet.appendRow(headers);
    }
  } else {
    // Auto-sync headers to ensure no data loss if new columns were added
    const expectedHeaders = getHeadersForSheet(sheetName);
    if (expectedHeaders.length > 0) {
      const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
      if (expectedHeaders.length > existingHeaders.length || expectedHeaders.some((h, i) => h !== existingHeaders[i])) {
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      }
    }
  }
  return sheet;
}

function getHeadersForSheet(sheetName) {
  switch (sheetName) {
    case 'Events':
      return ['id', 'name', 'date', 'startTime', 'endTime', 'remarks', 'workMinutesBeforeBreak', 'breakMinutes'];
    case 'PositionCategories': return ['id', 'eventId', 'name', 'allowedRole'];
    case 'Positions': return ['id', 'categoryId', 'name', 'requiredPeople', 'unitTime', 'startTime', 'endTime', 'remarks', 'isFixed'];
    case 'Staff': return ['id', 'name', 'availableStartTime', 'availableEndTime', 'remarks', 'role'];
    case 'StaffTraits': return ['staffId', 'positionId', 'trait'];
    case 'Shifts': return ['id', 'positionId', 'timeBlock', 'slotIndex', 'staffId'];
    default: return [];
  }
}

function fetchAllData() {
  const sheets = ['Events', 'PositionCategories', 'Positions', 'Staff', 'StaffTraits', 'Shifts'];
  const result = {};
  
  sheets.forEach(sheetName => {
    const sheet = getOrCreateSheet(sheetName);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      result[sheetName] = [];
      return;
    }
    
    const headers = values[0];
    const rows = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const obj = {};
      let isEmpty = true;
      for (let j = 0; j < headers.length; j++) {
        let val = row[j];
        if (val instanceof Date) {
          if (headers[j].toLowerCase().includes('time')) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm");
          } else if (headers[j] === 'date') {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
          } else {
            val = val.toISOString();
          }
        }
        obj[headers[j]] = val !== undefined ? val : null;
        if (val !== "") isEmpty = false;
      }
      if (!isEmpty) {
        rows.push(obj);
      }
    }
    result[sheetName] = rows;
  });
  
  return result;
}

function addRecord(sheetName, payload) {
  const sheet = getOrCreateSheet(sheetName);
  const headers = getHeadersForSheet(sheetName);
  const newRow = headers.map(header => payload[header] !== undefined ? payload[header] : "");
  sheet.appendRow(newRow);
  return payload;
}

function updateRecord(sheetName, payload) {
  const sheet = getOrCreateSheet(sheetName);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  if (values.length < 2) return null;
  
  const headers = values[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) throw new Error("No id column found");
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][idIndex] === payload.id) {
      const newRow = headers.map((header, j) => {
        return payload[header] !== undefined ? payload[header] : values[i][j];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([newRow]);
      return payload;
    }
  }
  return null;
}

function deleteRecord(sheetName, id) {
  const sheet = getOrCreateSheet(sheetName);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  if (values.length < 2) return null;
  
  const headers = values[0];
  const idIndex = headers.indexOf('id');
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function deletePositionAndRelated(id) {
  const posDeleted = deleteRecord('Positions', id);
  if (posDeleted) {
    deleteRecordsByField('Shifts', 'positionId', id);
    deleteRecordsByField('StaffTraits', 'positionId', id);
  }
  return posDeleted;
}

function deleteStaffAndRelated(id) {
  const staffDeleted = deleteRecord('Staff', id);
  if (staffDeleted) {
    deleteRecordsByField('Shifts', 'staffId', id);
    deleteRecordsByField('StaffTraits', 'staffId', id);
  }
  return staffDeleted;
}

function deleteRecordsByField(sheetName, fieldName, value) {
  const sheet = getOrCreateSheet(sheetName);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  if (values.length < 2) return 0;
  
  const headers = values[0];
  const fieldIndex = headers.indexOf(fieldName);
  if (fieldIndex === -1) return 0;
  
  let deletedCount = 0;
  // 削除による行ズレを防ぐため、下から上へループする
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][fieldIndex]) === String(value)) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  return deletedCount;
}

function upsertTrait(payload) {
  const sheet = getOrCreateSheet('StaffTraits');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = getHeadersForSheet('StaffTraits');
  const staffIdIdx = headers.indexOf('staffId');
  const positionIdIdx = headers.indexOf('positionId');
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][staffIdIdx] === payload.staffId && values[i][positionIdIdx] === payload.positionId) {
       const newRow = headers.map((header, j) => {
          return payload[header] !== undefined ? payload[header] : values[i][j];
       });
       sheet.getRange(i + 1, 1, 1, headers.length).setValues([newRow]);
       return payload;
    }
  }
  addRecord('StaffTraits', payload);
  return payload;
}

function assignShift(payload) {
  const sheet = getOrCreateSheet('Shifts');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = getHeadersForSheet('Shifts');
  const posIdx = headers.indexOf('positionId');
  const timeIdx = headers.indexOf('timeBlock');
  const slotIdx = headers.indexOf('slotIndex');
  
  for (let i = 1; i < values.length; i++) {
    let cellTime = values[i][timeIdx];
    if (cellTime instanceof Date) {
      cellTime = Utilities.formatDate(cellTime, Session.getScriptTimeZone(), "HH:mm");
    }
    
    if (String(values[i][posIdx]) === String(payload.positionId) && 
        String(cellTime) === String(payload.timeBlock) && 
        String(values[i][slotIdx]) === String(payload.slotIndex)) {
       const newRow = headers.map((header, j) => {
          return payload[header] !== undefined ? payload[header] : values[i][j];
       });
       sheet.getRange(i + 1, 1, 1, headers.length).setValues([newRow]);
       return payload;
    }
  }
  
  payload.id = payload.id || Utilities.getUuid();
  addRecord('Shifts', payload);
  return payload;
}

function removeShift(positionId, timeBlock, slotIndex) {
  const sheet = getOrCreateSheet('Shifts');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = getHeadersForSheet('Shifts');
  const posIdx = headers.indexOf('positionId');
  const timeIdx = headers.indexOf('timeBlock');
  const slotIdx = headers.indexOf('slotIndex');
  
  for (let i = 1; i < values.length; i++) {
    let cellTime = values[i][timeIdx];
    if (cellTime instanceof Date) {
      cellTime = Utilities.formatDate(cellTime, Session.getScriptTimeZone(), "HH:mm");
    }

    if (String(values[i][posIdx]) === String(positionId) && 
        String(cellTime) === String(timeBlock) && 
        String(values[i][slotIdx]) === String(slotIndex)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function bulkAssignShifts(payloads) {
  const sheet = getOrCreateSheet('Shifts');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = getHeadersForSheet('Shifts');
  const posIdx = headers.indexOf('positionId');
  const timeIdx = headers.indexOf('timeBlock');
  const slotIdx = headers.indexOf('slotIndex');
  
  const rowsToAppend = [];
  
  for (const payload of payloads) {
    let updated = false;
    for (let i = 1; i < values.length; i++) {
      let cellTime = values[i][timeIdx];
      if (cellTime instanceof Date) {
        cellTime = Utilities.formatDate(cellTime, Session.getScriptTimeZone(), "HH:mm");
      }
      if (String(values[i][posIdx]) === String(payload.positionId) && 
          String(cellTime) === String(payload.timeBlock) && 
          String(values[i][slotIdx]) === String(payload.slotIndex)) {
         const newRow = headers.map((header, j) => {
            return payload[header] !== undefined ? payload[header] : values[i][j];
         });
         sheet.getRange(i + 1, 1, 1, headers.length).setValues([newRow]);
         values[i] = newRow; 
         updated = true;
         break;
      }
    }
    
    if (!updated) {
      payload.id = payload.id || Utilities.getUuid();
      const newRow = headers.map(header => payload[header] !== undefined ? payload[header] : "");
      rowsToAppend.push(newRow);
      values.push(newRow);
    }
  }
  
  if (rowsToAppend.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
  
  return payloads;
}

function clearAllShifts() {
  const sheet = getOrCreateSheet('Shifts');
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true };
}
