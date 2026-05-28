/**
 * Google Apps Script Backend for Effective Call Monitoring System
 * 
 * Instructions:
 * 1. Create a Google Spreadsheet.
 * 2. Rename the active sheet to "MASTER_DATA".
 * 3. Open Extensions -> Apps Script.
 * 4. Paste this entire code into your Apps Script editor.
 * 5. Run the "initialSetup" function once to generate column headers.
 * 6. Deploy as Web App:
 *    - Click "Deploy" -> "New deployment"
 *    - Select type: "Web app"
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone"
 *    - Click Deploy, authorize permissions, and copy the Web App URL.
 * 7. Paste the Web App URL into the configuration panel of your Effective Call Monitoring application.
 */

// Define Column Headers of the MASTER_DATA sheet
const HEADERS = [
  "data_type", "record_id", "username", "password", "name", "role", 
  "supervisor_username", "region", "branch", "store_id", "store_name", 
  "address", "visit_date", "checkin_time", "photo_url", "omzet", 
  "notes", "effective_call", "approval_status", "rejection_notes", 
  "revision_count", "spv_approval", "asm_approval", "ddm_approval", 
  "created_at", "updated_at"
];

const SHEET_NAME = "MASTER_DATA";

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  return handleRequest(e, "GET");
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  return handleRequest(e, "POST");
}

/**
 * Main Request Handler with CORS Support
 */
function handleRequest(e, method) {
  const result = { success: false, error: "Unknown error" };
  
  try {
    let payload = null;
    
    if (method === "POST" && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    }
    
    if (!payload || !payload.action) {
      result.error = "Missing action parameter";
      return buildOutput(result);
    }
    
    // Execute corresponding action
    const action = payload.action;
    const data = payload.data || {};
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      initialSetup();
    }
    
    if (action === "test") {
      result.success = true;
      result.message = "Connection successful!";
      result.spreadsheetUrl = spreadsheet.getUrl();
    } else if (action === "diagnose") {
      result.success = true;
      result.data = {
        spreadsheetName: spreadsheet.getName(),
        sheets: spreadsheet.getSheets().map(function(s) { return s.getName(); }),
        masterDataExists: !!sheet,
        headers: sheet ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn() || 1, 1)).getValues()[0] : [],
        totalRows: sheet ? sheet.getLastRow() : 0,
        dataTypeCounts: (function() {
          var counts = { USER: 0, SCHEDULE: 0, VISIT: 0, OTHER: 0 };
          if (!sheet) return counts;
          var rows = getAllRows(sheet);
          rows.forEach(function(row) {
            var dt = String(row.data_type || "").toUpperCase().trim();
            if (dt === "USER") counts.USER++;
            else if (dt === "SCHEDULE") counts.SCHEDULE++;
            else if (dt === "VISIT") counts.VISIT++;
            else counts.OTHER++;
          });
          return counts;
        })(),
        users: (function() {
          if (!sheet) return [];
          var rows = getAllRows(sheet);
          return rows.filter(function(row) {
            return String(row.data_type || "").toUpperCase().trim() === "USER";
          }).map(function(row) {
            return {
              username: row.username,
              name: row.name,
              role: row.role
            };
          });
        })()
      };
    } else if (action === "seed") {
      result.success = executeSeed(sheet, data);
    } else if (action === "saveRecord") {
      result.success = handleSaveRecord(sheet, data);
    } else if (action === "deleteRecord") {
      result.success = handleDeleteRecord(sheet, data);
    } else if (action === "getAll") {
      result.success = true;
      result.data = getAllRows(sheet);
    } else if (action === "login") {
      result.success = true;
      result.data = handleLogin(sheet, data.username, data.password);
    } else if (action === "submitVisit") {
      result.success = handleSubmitVisit(sheet, data);
    } else if (action === "approveVisit") {
      result.success = handleApproveVisit(sheet, data);
    } else if (action === "rejectVisit") {
      result.success = handleRejectVisit(sheet, data);
    } else if (action === "resubmitVisit") {
      result.success = handleResubmitVisit(sheet, data);
    } else {
      result.error = "Unsupported action: " + action;
    }
  } catch (err) {
    result.success = false;
    result.error = err.toString();
  }
  
  return buildOutput(result);
}

/**
 * Return JSON Response with CORS Allow All headers
 */
function buildOutput(object) {
  const output = ContentService.createTextOutput(JSON.stringify(object));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Create headers in the MASTER_DATA sheet if not already defined
 */
function initialSetup() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  sheet.clear();
  sheet.appendRow(HEADERS);
  // Freeze first row
  sheet.setFrozenRows(1);
}

/**
 * Get dynamic mapping of columns to indices
 */
function getColumnMapping(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const mapping = {};
  HEADERS.forEach(header => {
    const idx = headerRow.indexOf(header);
    mapping[header] = idx !== -1 ? idx : -1;
  });
  return mapping;
}

/**
 * Map sheet values to JavaScript objects
 */
function getAllRows(sheet) {
  if (sheet.getLastRow() < 2) return [];
  
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const mapping = getColumnMapping(sheet);
  const timezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  
  return values.map((row, idx) => {
    const obj = { rowIndex: idx + 2 }; // Row index in sheets (2-based)
    Object.keys(mapping).forEach(key => {
      const colIdx = mapping[key];
      let val = colIdx !== -1 && colIdx < row.length ? row[colIdx] : "";
      
      // Prevent timezone-shifting on dates by formatting them prior to JSON serialization
      if (val instanceof Date && !isNaN(val.getTime())) {
        try {
          if (key === "visit_date") {
            val = Utilities.formatDate(val, timezone, "yyyy-MM-dd");
          } else if (key === "checkin_time") {
            val = Utilities.formatDate(val, timezone, "HH:mm:ss");
          } else if (key === "created_at" || key === "updated_at") {
            val = Utilities.formatDate(val, timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
          } else {
            val = Utilities.formatDate(val, timezone, "yyyy-MM-dd");
          }
        } catch (err) {
          val = val.toISOString();
        }
      }
      
      obj[key] = val;
    });
    return obj;
  });
}

/**
 * Handle Login Validation
 */
function handleLogin(sheet, username, password) {
  const rows = getAllRows(sheet);
  const users = rows.filter(r => r.data_type === "USER");
  const matched = users.find(u => u.username.toLowerCase() === username.toLowerCase() && String(u.password) === String(password));
  
  if (matched) {
    return {
      authenticated: true,
      user: {
        username: matched.username,
        name: matched.name,
        role: matched.role,
        supervisor_username: matched.supervisor_username,
        region: matched.region,
        branch: matched.branch
      }
    };
  } else {
    throw new Error("Invalid username or password");
  }
}

/**
 * Submit field visit (SE)
 */
function handleSubmitVisit(sheet, visitData) {
  const lock = LockService.getScriptLock();
  try {
    // Acquire lock for up to 30 seconds to prevent race conditions
    lock.waitLock(30000);
    
    // Check if store already visited today
    const rows = getAllRows(sheet);
    const existingVisit = rows.find(r => 
      r.data_type === "VISIT" && 
      r.store_id === visitData.store_id && 
      r.visit_date === visitData.visit_date &&
      r.approval_status !== "REJECTED"
    );
    
    if (existingVisit) {
      throw new Error("This store has already been checked-in / visited today!");
    }
    
    const mapping = getColumnMapping(sheet);
    const newRow = new Array(HEADERS.length).fill("");
    
    const omzetValue = parseFloat(visitData.omzet) || 0;
    const isEffective = omzetValue > 0 ? "YES" : "NO";
    
    const visitFields = {
      data_type: "VISIT",
      record_id: "VST_" + Utilities.getUuid().substring(0, 8),
      username: visitData.username,
      store_id: visitData.store_id,
      store_name: visitData.store_name,
      address: visitData.address,
      visit_date: visitData.visit_date,
      checkin_time: visitData.checkin_time,
      photo_url: visitData.photo_url,
      omzet: omzetValue,
      notes: visitData.notes || "",
      effective_call: isEffective,
      approval_status: "SUBMITTED",
      rejection_notes: "",
      revision_count: 0,
      spv_approval: "PENDING",
      asm_approval: "PENDING",
      ddm_approval: "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Fill row values based on mapping
    Object.keys(visitFields).forEach(key => {
      const colIdx = mapping[key];
      if (colIdx !== -1) {
        newRow[colIdx] = visitFields[key];
      }
    });
    
    sheet.appendRow(newRow);
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Approve field visit
 */
function handleApproveVisit(sheet, approvalData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const rows = getAllRows(sheet);
    const record = rows.find(r => r.data_type === "VISIT" && r.record_id === approvalData.record_id);
    if (!record) {
      throw new Error("Visit record not found with ID: " + approvalData.record_id);
    }
    
    const mapping = getColumnMapping(sheet);
    const rowIndex = record.rowIndex;
    
    let spvStatus = record.spv_approval;
    let asmStatus = record.asm_approval;
    let ddmStatus = record.ddm_approval;
    let nextStatus = record.approval_status;
    const reviewerName = approvalData.reviewer_name;
    const nowStr = new Date().toISOString();
    
    if (approvalData.role === "SPV") {
      spvStatus = "APPROVED_BY_" + reviewerName + "_AT_" + nowStr;
      nextStatus = "SPV_APPROVED";
    } else if (approvalData.role === "ASM") {
      asmStatus = "APPROVED_BY_" + reviewerName + "_AT_" + nowStr;
      nextStatus = "ASM_APPROVED";
    } else if (approvalData.role === "DDM") {
      ddmStatus = "APPROVED_BY_" + reviewerName + "_AT_" + nowStr;
      nextStatus = "DDM_APPROVED";
    }
    
    // Update individual values in the Google Sheet in batch
    const range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
    const rowValues = range.getValues()[0];
    
    if (mapping["spv_approval"] !== -1) rowValues[mapping["spv_approval"]] = spvStatus;
    if (mapping["asm_approval"] !== -1) rowValues[mapping["asm_approval"]] = asmStatus;
    if (mapping["ddm_approval"] !== -1) rowValues[mapping["ddm_approval"]] = ddmStatus;
    if (mapping["approval_status"] !== -1) rowValues[mapping["approval_status"]] = nextStatus;
    if (mapping["updated_at"] !== -1) rowValues[mapping["updated_at"]] = nowStr;
    
    range.setValues([rowValues]);
    
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Reject / Revision Required field visit
 */
function handleRejectVisit(sheet, rejectionData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const rows = getAllRows(sheet);
    const record = rows.find(r => r.data_type === "VISIT" && r.record_id === rejectionData.record_id);
    if (!record) {
      throw new Error("Visit record not found");
    }
    
    const mapping = getColumnMapping(sheet);
    const rowIndex = record.rowIndex;
    
    const reviewerName = rejectionData.reviewer_name;
    const nowStr = new Date().toISOString();
    const reason = rejectionData.rejection_notes || "No standard reason provided.";
    
    let spvStatus = record.spv_approval;
    let asmStatus = record.asm_approval;
    let ddmStatus = record.ddm_approval;
    
    if (rejectionData.role === "SPV") {
      spvStatus = "REJECTED_BY_" + reviewerName + "_AT_" + nowStr;
    } else if (rejectionData.role === "ASM") {
      asmStatus = "REJECTED_BY_" + reviewerName + "_AT_" + nowStr;
    } else if (rejectionData.role === "DDM") {
      ddmStatus = "REJECTED_BY_" + reviewerName + "_AT_" + nowStr;
    }
    
    // Update individual values in the Google Sheet in batch
    const range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
    const rowValues = range.getValues()[0];
    
    if (mapping["spv_approval"] !== -1) rowValues[mapping["spv_approval"]] = spvStatus;
    if (mapping["asm_approval"] !== -1) rowValues[mapping["asm_approval"]] = asmStatus;
    if (mapping["ddm_approval"] !== -1) rowValues[mapping["ddm_approval"]] = ddmStatus;
    if (mapping["rejection_notes"] !== -1) rowValues[mapping["rejection_notes"]] = reason;
    if (mapping["approval_status"] !== -1) rowValues[mapping["approval_status"]] = "REJECTED";
    if (mapping["updated_at"] !== -1) rowValues[mapping["updated_at"]] = nowStr;
    
    range.setValues([rowValues]);
    
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Resubmit field visit after revision
 */
function handleResubmitVisit(sheet, revisionData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const rows = getAllRows(sheet);
    const record = rows.find(r => r.data_type === "VISIT" && r.record_id === revisionData.record_id);
    if (!record) {
      throw new Error("Visit record not found");
    }
    
    const mapping = getColumnMapping(sheet);
    const rowIndex = record.rowIndex;
    
    const omzetValue = parseFloat(revisionData.omzet) || 0;
    const isEffective = omzetValue > 0 ? "YES" : "NO";
    const newRevisionCount = (parseInt(record.revision_count) || 0) + 1;
    const nowStr = new Date().toISOString();
    
    // Update individual values in the Google Sheet in batch
    const range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
    const rowValues = range.getValues()[0];
    
    if (mapping["omzet"] !== -1) rowValues[mapping["omzet"]] = omzetValue;
    if (mapping["photo_url"] !== -1) rowValues[mapping["photo_url"]] = revisionData.photo_url || record.photo_url;
    if (mapping["notes"] !== -1) rowValues[mapping["notes"]] = revisionData.notes || "";
    if (mapping["effective_call"] !== -1) rowValues[mapping["effective_call"]] = isEffective;
    if (mapping["approval_status"] !== -1) rowValues[mapping["approval_status"]] = "RESUBMITTED";
    if (mapping["rejection_notes"] !== -1) rowValues[mapping["rejection_notes"]] = "";
    if (mapping["revision_count"] !== -1) rowValues[mapping["revision_count"]] = newRevisionCount;
    if (mapping["spv_approval"] !== -1) rowValues[mapping["spv_approval"]] = "PENDING";
    if (mapping["asm_approval"] !== -1) rowValues[mapping["asm_approval"]] = "PENDING";
    if (mapping["ddm_approval"] !== -1) rowValues[mapping["ddm_approval"]] = "PENDING";
    if (mapping["updated_at"] !== -1) rowValues[mapping["updated_at"]] = nowStr;
    
    range.setValues([rowValues]);
    
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper to update a single sheet cell (1-based sheet indices)
 */
function updateCell(sheet, rowIndex, colZeroIndex, value) {
  if (colZeroIndex === -1) return;
  sheet.getRange(rowIndex, colZeroIndex + 1).setValue(value);
}

/**
 * Seed master schema & dummy records automatically
 */
function executeSeed(sheet, seedParams) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    // Clear and build setup
    initialSetup();
    const mapping = getColumnMapping(sheet);
    
    if (!seedParams || !seedParams.records || !Array.isArray(seedParams.records)) {
      return false;
    }
    
    const records = seedParams.records;
    if (records.length === 0) return true;
    
    const allNewRows = records.map(function(record) {
      const newRow = new Array(HEADERS.length).fill("");
      Object.keys(record).forEach(function(key) {
        const colIdx = mapping[key];
        if (colIdx !== undefined && colIdx !== -1) {
          newRow[colIdx] = record[key];
        }
      });
      return newRow;
    });
    
    // Write all rows in a single batch call!
    sheet.getRange(2, 1, allNewRows.length, HEADERS.length).setValues(allNewRows);
    
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Add or update a single record in the sheet non-destructively
 */
function handleSaveRecord(sheet, record) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const rows = getAllRows(sheet);
    const mapping = getColumnMapping(sheet);
    
    // Check if record already exists by record_id
    let existing = null;
    if (record.record_id) {
      existing = rows.find(function(r) { return r.record_id === record.record_id; });
    }
    
    // For USER, we can also match by username to prevent duplicate usernames
    if (!existing && record.data_type === "USER" && record.username) {
      existing = rows.find(function(r) {
        return r.data_type === "USER" && String(r.username).toLowerCase() === String(record.username).toLowerCase();
      });
    }

    const nowStr = new Date().toISOString();
    record.updated_at = nowStr;

    if (existing) {
      // Update the existing row in a SINGLE API call instead of 26 separate ones
      const rowIndex = existing.rowIndex;
      const range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
      const rowValues = range.getValues()[0];
      
      Object.keys(record).forEach(function(key) {
        if (key === "rowIndex") return;
        const colIdx = mapping[key];
        if (colIdx !== undefined && colIdx !== -1) {
          rowValues[colIdx] = record[key];
        }
      });
      range.setValues([rowValues]);
    } else {
      // Append a new row
      if (!record.record_id) {
        var prefix = "REC_";
        if (record.data_type === "USER") prefix = "USR_";
        else if (record.data_type === "SCHEDULE") prefix = "SCH_";
        else if (record.data_type === "VISIT") prefix = "VST_";
        record.record_id = prefix + Utilities.getUuid().substring(0, 8).toUpperCase();
      }
      if (!record.created_at) {
        record.created_at = nowStr;
      }
      
      const newRow = new Array(HEADERS.length).fill("");
      Object.keys(record).forEach(function(key) {
        const colIdx = mapping[key];
        if (colIdx !== undefined && colIdx !== -1) {
          newRow[colIdx] = record[key];
        }
      });
      sheet.appendRow(newRow);
    }
    
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Delete a single record by record_id or key properties safely
 */
function handleDeleteRecord(sheet, recordData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const rows = getAllRows(sheet);
    let existing = null;
    
    if (recordData.record_id) {
      existing = rows.find(function(r) { return r.record_id === recordData.record_id; });
    } else if (recordData.data_type === "USER" && recordData.username) {
      existing = rows.find(function(r) {
        return r.data_type === "USER" && String(r.username).toLowerCase() === String(recordData.username).toLowerCase();
      });
    }
    
    if (existing) {
      sheet.deleteRow(existing.rowIndex);
      return true;
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}
