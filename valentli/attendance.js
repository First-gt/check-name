/* =========================================================
   Attendance System — JavaScript
   JSONP → Google Apps Script → Google Sheets
   ========================================================= */

/* ──────────────────────────────────────────────────────────
   ⚙️  CONFIG — วาง URL ของ Google Apps Script ตรงนี้
   ────────────────────────────────────────────────────────── */
var WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx3WsFIFPlBjJZXfzUe1IoWsPJ4yzCyPpIR_sJmx1f_cX8uD132IbTOyAHjFc5luwqR/exec";

/* ──────────────────────────────────────────────────────────
   🔧  INIT — ตั้งค่าวันที่ปัจจุบันเมื่อหน้าโหลด
   ────────────────────────────────────────────────────────── */
(function initDate() {
  var today = new Date();
  var yyyy  = today.getFullYear();
  var mm    = String(today.getMonth() + 1).padStart(2, "0");
  var dd    = String(today.getDate()).padStart(2, "0");
  document.getElementById("attDate").value = yyyy + "-" + mm + "-" + dd;
})();

/* ──────────────────────────────────────────────────────────
   📤  SEND DATA — ฟังก์ชันหลักส่งข้อมูลแบบ JSONP
   ────────────────────────────────────────────────────────── */
function sendData() {

  /* 1. ดึงค่าจากฟอร์ม */
  var attDate     = document.getElementById("attDate").value.trim();
  var studentId   = document.getElementById("studentId").value.trim();
  var studentName = document.getElementById("studentName").value.trim();
  var classroom   = document.getElementById("classroom").value.trim();
  var teacherName = document.getElementById("teacherName").value.trim();
  var attStatus   = document.getElementById("attStatus").value;
  var genderEl    = document.querySelector('input[name="gender"]:checked');
  var gender      = genderEl ? genderEl.value : "";

  /* 2. ตรวจสอบข้อมูลสำคัญ */
  if (!studentId || !studentName || !teacherName) {
    showToast("⚠️ กรุณากรอกรหัสนักเรียน, ชื่อ และชื่อครูให้ครบถ้วน", "error");
    if (!studentId)   shakeField("studentId");
    if (!studentName) shakeField("studentName");
    if (!teacherName) shakeField("teacherName");
    return;
  }

  /* 3. ตรวจสอบ URL */
  if (!WEB_APP_URL || WEB_APP_URL === "https://script.google.com/macros/s/AKfycbxjewnNDkXoE2fpbqiAEulTorwjUQXNlKXoLRrwPNj8CEo3M-tvoyUCZJ7YPRPiVn9q/exec") {
    showToast("❌ ยังไม่ได้กำหนด Web App URL ใน attendance.js", "error");
    return;
  }

  /* 4. Disable ปุ่มเพื่อป้องกันการกดซ้ำ */
  setButtonState(true, "กำลังบันทึกข้อมูล...");

  /* 5. สร้าง payload */
  var attendanceData = [{
    date:      attDate,
    id:        studentId,
    name:      studentName,
    gender:    gender,
    classroom: classroom,
    teacher:   teacherName,
    status:    attStatus
  }];

  var payload = {
    action: "saveAttendance",
    data:   attendanceData
  };

  /* 6. ยิง JSONP */
  var callbackName = "onSuccess";
  var finalUrl = WEB_APP_URL
    + "?callback=" + callbackName
    + "&payload=" + encodeURIComponent(JSON.stringify(payload));

  /* ลบ script tag เก่า (ถ้ามี) */
  var oldScript = document.getElementById("jsonp_script");
  if (oldScript) oldScript.parentNode.removeChild(oldScript);

  var script = document.createElement("script");
  script.id  = "jsonp_script";
  script.src = finalUrl;

  /* Error fallback — หาก script โหลดไม่ได้ (network error / CORS ฯลฯ) */
  script.onerror = function () {
    onSuccess({ success: false, message: "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบ URL หรืออินเทอร์เน็ต" });
  };

  document.body.appendChild(script);

  /* Safety timeout — กันกรณี callback ไม่ถูกเรียก */
  window._attTimeout = setTimeout(function () {
    if (document.getElementById("submitBtn").disabled) {
      onSuccess({ success: false, message: "หมดเวลารอ Server กรุณาลองใหม่อีกครั้ง" });
    }
  }, 15000); /* 15 วินาที */
}

/* ──────────────────────────────────────────────────────────
   ✅  CALLBACK — รับสัญญาณตอบกลับจาก Google Apps Script
   ────────────────────────────────────────────────────────── */
function onSuccess(response) {
  clearTimeout(window._attTimeout);

  if (response && response.success === true) {
    /* สำเร็จ */
    showToast("✅ บันทึกข้อมูลสำเร็จเรียบร้อย!", "success");
    /* เคลียร์เฉพาะข้อมูลนักเรียน (คนต่อไปกรอกต่อได้ทันที) */
    document.getElementById("studentId").value   = "";
    document.getElementById("studentName").value = "";
    /* Reset gender ให้เป็น "ชาย" */
    var maleRadio = document.getElementById("genderMale");
    if (maleRadio) maleRadio.checked = true;
    /* Reset status */
    document.getElementById("attStatus").value = "มา";
    /* เปิดปุ่มกลับมา */
    setButtonState(false, "บันทึกข้อมูล");
    /* Focus ที่ studentId สำหรับนักเรียนคนต่อไป */
    setTimeout(function () {
      document.getElementById("studentId").focus();
    }, 300);

  } else {
    /* ล้มเหลว */
    var msg = (response && response.message)
      ? response.message
      : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
    showToast("❌ " + msg, "error");
    setButtonState(false, "บันทึกข้อมูล");
  }
}

/* ──────────────────────────────────────────────────────────
   🔧  HELPERS
   ────────────────────────────────────────────────────────── */

/* ปิด/เปิดปุ่ม + เปลี่ยน label */
function setButtonState(disabled, label) {
  var btn     = document.getElementById("submitBtn");
  var btnText = document.getElementById("btnText");
  var btnIcon = btn.querySelector(".btn-icon");

  btn.disabled = disabled;

  if (disabled) {
    btnText.textContent = label;
    if (btnIcon) {
      btnIcon.innerHTML = '<span class="btn-spinner"></span>';
    }
  } else {
    btnText.textContent = label;
    if (btnIcon) {
      btnIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
    }
  }
}

/* Toast notification */
var _toastTimer = null;
function showToast(message, type) {
  var toast   = document.getElementById("toast");
  var toastMsg = document.getElementById("toastMsg");

  toast.className = "toast toast-" + (type || "info");
  toastMsg.textContent = message;

  /* Force reflow เพื่อ reset animation */
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 4000);
}

/* Shake animation สำหรับ field ที่ยังไม่กรอก */
function shakeField(fieldId) {
  var el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
  el.addEventListener("animationend", function () {
    el.classList.remove("shake");
  }, { once: true });
}
