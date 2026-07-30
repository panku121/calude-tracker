/**
 * Google Apps Script — paste ALL of this into Extensions → Apps Script, then:
 * 1. Save
 * 2. Run setupHeaders once
 * 3. Run testWrite once — if a test row appears, script is linked
 * 4. Deploy → Manage deployments → Edit → New version → Deploy
 *    Execute as: Me | Who has access: Anyone  (NOT "Anyone with Google account")
 * 5. Paste the /exec Web App URL into script.js → GOOGLE_SCRIPT_URL
 */

function getTrackerSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('aiTracker') || ss.getActiveSheet();
  return sheet;
}

/** Run once to create bold header row. */
function setupHeaders() {
  var sheet = getTrackerSheet_();
  var headers = [
    'Timestamp',
    'Name',
    'AI Tool',
    'Plan Type',
    'Usage Mode',
    'Cost',
    'Currency',
    'Purchase Email',
    'Work Type',
    'Benefit',
    'Notes',
    'Form Source'
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

/** Adds the source column without changing any existing rows or columns. */
function ensureSourceColumn_(sheet) {
  var sourceColumn = 12;
  var sourceHeader = sheet.getRange(1, sourceColumn);
  if (!sourceHeader.getValue()) {
    sourceHeader.setValue('Form Source').setFontWeight('bold');
  }
}

/** Run once from the editor — should add a "TEST OK" row in the sheet. */
function testWrite() {
  var sheet = getTrackerSheet_();
  if (sheet.getLastRow() === 0) setupHeaders();
  sheet.appendRow([
    new Date().toLocaleString(),
    'TEST OK',
    'Claude',
    'Pro',
    'IDE / Coding',
    '1',
    '$',
    'test@example.com',
    'Coding',
    'Time Saved',
    'Apps Script write works',
    'Claude user form'
  ]);
}

function parseIncoming_(e) {
  var params = {};

  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (key) {
      params[key] = e.parameter[key];
    });
  }

  if (e && e.postData && e.postData.contents) {
    var raw = e.postData.contents;
    try {
      if (raw.charAt(0) === '{') {
        var json = JSON.parse(raw);
        Object.keys(json).forEach(function (key) {
          params[key] = json[key];
        });
      } else if (raw.indexOf('=') !== -1) {
        raw.split('&').forEach(function (pair) {
          var parts = pair.split('=');
          var key = decodeURIComponent((parts[0] || '').replace(/\+/g, ' '));
          var val = decodeURIComponent((parts.slice(1).join('=') || '').replace(/\+/g, ' '));
          if (key) params[key] = val;
        });
      }
    } catch (err) {
      // keep e.parameter values
    }
  }

  return params;
}

/** Skip duplicate writes when client sends form POST + GET fallback together. */
function markSubmissionOrSkip_(submissionId) {
  if (!submissionId) return false;
  var cache = CacheService.getScriptCache();
  var key = 'sub_' + String(submissionId).slice(0, 80);
  if (cache.get(key)) return true;
  cache.put(key, '1', 600); // 10 minutes
  return false;
}

function appendEntry_(params) {
  var sheet = getTrackerSheet_();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (markSubmissionOrSkip_(params.submissionId)) {
      return { duplicate: true };
    }

    if (sheet.getLastRow() === 0) setupHeaders();
    ensureSourceColumn_(sheet);

    sheet.appendRow([
      params.timestamp || new Date().toLocaleString(),
      params.name || '',
      params.tool || '',
      params.plan || '',
      params.usage || '',
      params.cost || '',
      params.currency || '',
      params.email || '',
      params.work || '',
      params.benefit || '',
      params.notes || '',
      params.source || ''
    ]);
    return { duplicate: false };
  } finally {
    lock.releaseLock();
  }
}

function handleIncoming_(e) {
  var params = parseIncoming_(e || {});

  if (!params.name && !params.email && !params.tool) {
    return { result: 'error', message: 'Empty payload' };
  }

  var write = appendEntry_(params);
  return {
    result: 'success',
    duplicate: !!(write && write.duplicate)
  };
}

function doPost(e) {
  try {
    var out = handleIncoming_(e);
    return ContentService
      .createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET also writes when form fields are present.
 * Incognito browsers often block iframe/fetch POST redirects, but allow a simple GET.
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    if (params.name || params.email || params.tool) {
      var out = handleIncoming_(e);
      return ContentService
        .createTextOutput(JSON.stringify(out))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'Claude usage tracker is live',
        sheet: getTrackerSheet_().getName()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
