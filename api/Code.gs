const SHEET_ID = '1Op0O3sUWPec0cjNENKbRfO3RKvphkCJo79Vr_pxfjb8';

const TABS = [
  'inventaire', 'lineup', 'horaires_site', 'repas',
  'shifts_cuisine', 'shifts_bar',
  'covoit_voitures', 'covoit_passagers', 'covoit_train',
  'plan_dodo', 'todo', 'montage_tasks', 'textes',
];


// ── Lecture & écriture ───────────────────────────────────────────────────────

function doGet(e) {
  if (e.parameter.action) {
    return handleWrite(e);
  }

  const tab = e.parameter.tab;
  const response = tab ? getTab(tab) : getAllTabs();

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── Écriture ─────────────────────────────────────────────────────────────────

function handleWrite(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  try {
    switch (e.parameter.action) {

      case 'update_cell': {
        const sheet = ss.getSheetByName(e.parameter.tab);
        if (!sheet) throw new Error('Onglet introuvable : ' + e.parameter.tab);

        const headers = sheet
          .getRange(1, 1, 1, sheet.getLastColumn())
          .getValues()[0]
          .map(h => h.toString().trim());

        const colIdx = headers.indexOf(e.parameter.col) + 1;
        if (colIdx === 0) throw new Error('Colonne introuvable : ' + e.parameter.col);

        const rowIdx = parseInt(e.parameter.row);
        let value = e.parameter.value;
        if (value === 'true')  value = true;
        if (value === 'false') value = false;

        sheet.getRange(rowIdx, colIdx).setValue(value);
        break;
      }

      case 'append_todo': {
        const sheet = ss.getSheetByName('todo');
        sheet.appendRow([e.parameter.tache, e.parameter.categorie, false]);
        break;
      }

    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ── Lecture ───────────────────────────────────────────────────────────────────

function getTab(tabName) {
  if (!TABS.includes(tabName)) {
    return { error: `Onglet inconnu : ${tabName}` };
  }

  const ss   = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    return { error: `Onglet introuvable dans le Sheets : ${tabName}` };
  }

  return { [tabName]: sheetToJson(sheet) };
}


function getAllTabs() {
  const ss     = SpreadsheetApp.openById(SHEET_ID);
  const result = {};

  for (const tabName of TABS) {
    const sheet       = ss.getSheetByName(tabName);
    result[tabName]   = sheet ? sheetToJson(sheet) : [];
  }

  return result;
}


function sheetToJson(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => h.toString().trim());
  const rows    = data.slice(1);

  return rows
    .map((row, i) => ({ row, sheetRow: i + 2 }))
    .filter(({ row }) => row.some(cell => cell !== ''))
    .map(({ row, sheetRow }) => {
      const obj = { _row: sheetRow };
      headers.forEach((header, i) => { obj[header] = formatCell(row[i]); });
      return obj;
    });
}


function formatCell(value) {
  if (value && typeof value.getFullYear === 'function') {
    const tz = Session.getScriptTimeZone();
    if (value.getFullYear() === 1899) {
      return Utilities.formatDate(value, tz, 'HH:mm');
    }
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  }
  return value ?? '';
}
