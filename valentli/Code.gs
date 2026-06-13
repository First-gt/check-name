/**
 * =========================================================
 *  Google Apps Script — Attendance System Backend
 *  บันทึกข้อมูลการมาเรียนลง Google Sheets
 * =========================================================
 *
 *  วิธีติดตั้ง:
 *  1. เปิด Google Sheets ที่ต้องการบันทึกข้อมูล
 *  2. เมนู Extensions > Apps Script
 *  3. ลบโค้ดเดิมออก แล้ว วาง (Paste) โค้ดนี้ทั้งหมดแทน
 *  4. บันทึก (Ctrl+S)
 *  5. Deploy > New deployment > Web App
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  6. กด Deploy แล้ว Copy URL ที่ได้ไปวางใน attendance.js
 *     ที่บรรทัด:  var WEB_APP_URL = "...URL ตรงนี้...";
 * =========================================================
 */

/* ──────────────────────────────────────────────────────────
   ⚙️  CONFIG — กำหนดชื่อ Sheet
   ────────────────────────────────────────────────────────── */
var SHEET_NAME = "Attendance";   // ชื่อ Sheet tab ที่จะบันทึก

/* ──────────────────────────────────────────────────────────
   🌐  doGet — จุดรับ JSONP Request จากหน้าเว็บ
   ────────────────────────────────────────────────────────── */
function doGet(e) {
  var callbackName = e.parameter.callback || "onSuccess";
  var result;

  try {
    /* แกะ payload */
    var payloadStr = e.parameter.payload;
    if (!payloadStr) {
      throw new Error("ไม่พบ payload ในคำขอ");
    }
    var payload = JSON.parse(decodeURIComponent(payloadStr));

    /* ตรวจสอบ action */
    if (payload.action === "saveAttendance") {
      result = saveAttendance(payload.data);
    } else {
      throw new Error("Unknown action: " + payload.action);
    }

  } catch (err) {
    result = { success: false, message: err.message };
  }

  /* ส่งกลับแบบ JSONP */
  var jsonOutput = callbackName + "(" + JSON.stringify(result) + ");";
  return ContentService
    .createTextOutput(jsonOutput)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/* ──────────────────────────────────────────────────────────
   💾  saveAttendance — เขียนข้อมูลลง Google Sheets
   ────────────────────────────────────────────────────────── */
function saveAttendance(dataArray) {
  if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
    throw new Error("ข้อมูลที่ส่งมาไม่ถูกต้อง (dataArray ว่าง)");
  }

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  /* ถ้ายังไม่มี Sheet ให้สร้างใหม่พร้อม Header (เริ่มที่คอลัมน์ A) */
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var headers = [
      "วันที่",
      "รหัสนักเรียน",
      "ชื่อ-นามสกุล",
      "เพศ",
      "ชั้นเรียน",
      "ชื่อครูประจำชั้น",
      "สถานะ",
      "บันทึกเวลาสำเร็จ"
    ];
    // เขียนที่แถว 1 เริ่มต้นคอลัมน์ 1 (A)
    var headerRow = sheet.getRange(1, 1, 1, headers.length);
    headerRow.setValues([headers]);
    headerRow.setBackground("#2563eb");
    headerRow.setFontColor("#ffffff");
    headerRow.setFontWeight("bold");
    headerRow.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    /* ปรับความกว้างคอลัมน์ */
    sheet.setColumnWidth(1, 130);  // คอลัมน์ A: วันที่
    sheet.setColumnWidth(2, 110);  // คอลัมน์ B: รหัสนักเรียน
    sheet.setColumnWidth(3, 180);  // คอลัมน์ C: ชื่อ-นามสกุล
    sheet.setColumnWidth(4, 70);   // คอลัมน์ D: เพศ
    sheet.setColumnWidth(5, 100);  // คอลัมน์ E: ชั้นเรียน
    sheet.setColumnWidth(6, 150);  // คอลัมน์ F: ชื่อครูประจำชั้น
    sheet.setColumnWidth(7, 80);   // คอลัมน์ G: สถานะ
    sheet.setColumnWidth(8, 140);  // คอลัมน์ H: บันทึกเวลาสำเร็จ
  }

  /* หาแถวถัดไป */
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var nextRow = lastRow + 1;

  /* เวลาปัจจุบัน (timestamp) */
  var now = new Date();
  var timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  /* เขียนข้อมูลทุก record ลงคอลัมน์ A ถึง H */
  var newRows = [];
  for (var i = 0; i < dataArray.length; i++) {
    var d = dataArray[i];

    newRows.push([
      d.date      || "", // คอลัมน์ A: วันที่
      d.id        || "", // คอลัมน์ B: รหัสนักเรียน
      d.name      || "", // คอลัมน์ C: ชื่อ-นามสกุล
      d.gender    || "", // คอลัมน์ D: เพศ
      d.classroom || "", // คอลัมน์ E: ชั้นเรียน
      d.teacher   || "", // คอลัมน์ F: ชื่อครูประจำชั้น
      d.status    || "", // คอลัมน์ G: สถานะ
      timestampStr       // คอลัมน์ H: บันทึกเวลาสำเร็จ
    ]);
  }

  /* เขียนลง Sheet โดยเริ่มเขียนแถวถัดไปที่คอลัมน์ 1 (A) */
  sheet.getRange(nextRow, 1, newRows.length, newRows[0].length)
       .setValues(newRows);

  /* จัดสี แถวสลับ (Zebra Striping) คอลัมน์ A ถึง H */
  applyRowStyling(sheet, nextRow, newRows.length);

  return {
    success: true,
    message: "บันทึก " + newRows.length + " รายการสำเร็จ",
    row: nextRow
  };
}

/* ──────────────────────────────────────────────────────────
   🎨  applyRowStyling — ตกแต่งแถว
   ────────────────────────────────────────────────────────── */
function applyRowStyling(sheet, startRow, count) {
  for (var i = 0; i < count; i++) {
    var row   = startRow + i;
    var range = sheet.getRange(row, 1, 1, 8); // คอลัมน์ A ถึง H (รวม 8 คอลัมน์)
    /* สลับสีแถวคู่/คี่ */
    range.setBackground((row % 2 === 0) ? "#eff6ff" : "#ffffff");
    range.setFontColor("#1e293b");
    range.setVerticalAlignment("middle");

    /* จัดแนวตรงกลางสำหรับ วันที่, รหัสนักเรียน, เพศ, สถานะ, บันทึกเวลาสำเร็จ */
    sheet.getRange(row, 1).setHorizontalAlignment("center"); // วันที่ (A)
    sheet.getRange(row, 2).setHorizontalAlignment("center"); // รหัสนักเรียน (B)
    sheet.getRange(row, 4).setHorizontalAlignment("center"); // เพศ (D)
    sheet.getRange(row, 7).setHorizontalAlignment("center"); // สถานะ (G)
    sheet.getRange(row, 8).setHorizontalAlignment("center"); // บันทึกเวลาสำเร็จ (H)

    /* สีพิเศษสำหรับคอลัมน์สถานะ (คอลัมน์ G) */
    var statusCell = sheet.getRange(row, 7);
    var statusVal  = statusCell.getValue();
    statusCell.setFontWeight("bold");
    switch (statusVal) {
      case "มา":   statusCell.setFontColor("#16a34a"); break; // เขียว
      case "ขาด":  statusCell.setFontColor("#dc2626"); break; // แดง
      case "ลา":   statusCell.setFontColor("#d97706"); break; // เหลือง-ส้ม
      case "สาย":  statusCell.setFontColor("#2563eb"); break; // น้ำเงิน
      default:     statusCell.setFontColor("#475569"); break;
    }
  }
}

/* ──────────────────────────────────────────────────────────
   🧪  testSave — ใช้ทดสอบใน Apps Script Editor โดยตรง
   ────────────────────────────────────────────────────────── */
function testSave() {
  var fakeData = [{
    date:      "2026-06-13",
    id:        "6701001",
    name:      "เด็กชายทดสอบ ระบบ",
    gender:    "ชาย",
    classroom: "อนุบาล 2",
    teacher:   "ครูสมศรี ใจดี",
    status:    "มา"
  }];
  var result = saveAttendance(fakeData);
  Logger.log(JSON.stringify(result, null, 2));
}
