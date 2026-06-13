/* ⚙️ CONFIG — วาง URL ของ Google Apps Script ตัวล่าสุดที่ Deploy ตรงนี้ครับ */
var WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwgUHKe_RqLFbOnVuIbs9kIj2SvhNzxSulUUhN1v7ZYPEFN9--b97lwP0jJmF_6psOL/exec";

var localStudentCache = [];

// แผนผังแมปชื่อเต็มแสดงผลในการ์ดสรุป
var classNamesMap = {
  "อ2": "อนุบาล 2", "อ3": "อนุบาล 3",
  "ป1": "ประถมศึกษาปีที่ 1", "ป2": "ประถมศึกษาปีที่ 2", "ป3": "ประถมศึกษาปีที่ 3",
  "ป4": "ประถมศึกษาปีที่ 4", "ป5": "ประถมศึกษาปีที่ 5", "ป6": "ประถมศึกษาปีที่ 6"
};

(function initApp() {
  var today = new Date();
  var yyyy = today.getFullYear();
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var dd = String(today.getDate()).padStart(2, '0');
  var formattedDate = yyyy + "-" + mm + "-" + dd;
  
  var attDateInput = document.getElementById("attDate");
  var summaryDateInput = document.getElementById("summaryDate");
  
  if(attDateInput) attDateInput.value = formattedDate;
  if(summaryDateInput) summaryDateInput.value = formattedDate;
})();

function switchTab(tabId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

function fetchStudentList() {
  var classroom = document.getElementById("activeClassroom").value;
  if (!classroom) {
    alert("กรุณาเลือกชั้นเรียนก่อนครับ");
    return;
  }
  
  document.getElementById("studentListContainer").innerHTML = '<p style="text-align:center; color:#FF9F0A; padding:2rem;">กำลังดึงรายชื่อนักเรียนจากหลังบ้าน...</p>';
  document.getElementById("submitAllBtn").style.display = "none";

  var payload = { action: "getStudents", classroom: classroom };
  callJsonp(payload, function(res) {
    if (res && res.success) {
      localStudentCache = res.students;
      renderStudentList(res.students);
    } else {
      document.getElementById("studentListContainer").innerHTML = '<p style="text-align:center; color:#FF453A; padding:2rem;">❌ ไม่พบรายชื่อข้อมูลในชั้นเรียนนี้</p>';
    }
  });
}

function renderStudentList(students) {
  var container = document.getElementById("studentListContainer");
  if (students.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#888; padding:2rem;">ไม่มีข้อมูลนักเรียนในห้องนี้</p>';
    return;
  }

  var html = "";
  students.forEach((st, index) => {
    html += `
      <div class="student-row" data-id="${st.id}">
        <div class="student-info">
          <span class="student-name">${st.no}. ${st.name} (รหัส: ${st.id})</span>
        </div>
        <div class="status-group">
          <button type="button" class="status-btn selected" data-status="มา" onclick="selectStatus(this, ${index})">✅ มา</button>
          <button type="button" class="status-btn" data-status="สาย" onclick="selectStatus(this, ${index})">⏰ สาย</button>
          <button type="button" class="status-btn" data-status="ลา" onclick="selectStatus(this, ${index})">📋 ลา</button>
          <button type="button" class="status-btn" data-status="ขาด" onclick="selectStatus(this, ${index})">❌ ขาด</button>
        </div>
      </div>
    `;
    st.currentStatus = "มา";
  });

  container.innerHTML = html;
  document.getElementById("submitAllBtn").style.display = "block";
}

function selectStatus(btn, index) {
  var row = btn.parentElement;
  row.querySelectorAll('.status-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  localStudentCache[index].currentStatus = btn.getAttribute('data-status');
}

function submitAttendanceRoom() {
  var teacher = document.getElementById("teacherName").value.trim();
  var date = document.getElementById("attDate").value;
  var classroom = document.getElementById("activeClassroom").value;

  if (!teacher) { alert("กรุณาใส่ชื่อครูผู้บันทึกด้วยครับ"); return; }

  var records = localStudentCache.map(st => {
    return {
      date: date,
      id: st.id,
      name: st.name,
      classroom: classroom,
      teacher: teacher,
      status: st.currentStatus
    };
  });

  var btn = document.getElementById("submitAllBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> กำลังบันทึกข้อมูลเข้าชีต...';

  var payload = { action: "saveAttendanceList", records: records };
  callJsonp(payload, function(res) {
    btn.disabled = false;
    btn.textContent = "💾 บันทึกข้อมูลส่งหลังบ้านทั้งหมด";
    if (res && res.success) {
      showToast("🎉 บันทึกข้อมูลนักเรียนห้อง " + classroom + " สำเร็จแล้ว!");
    } else {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
  });
}

// 📊 ฟังก์ชันวิเคราะห์สถิติรายวันแยกกลุ่ม อนุบาล และ ประถมศึกษา อย่างสวยงาม
function loadDailySummary() {
  var date = document.getElementById("summaryDate").value;
  var container = document.getElementById("classCardsContainer");
  container.innerHTML = '<p style="text-align:center; color:#FF9F0A; padding:2rem;">กำลังวิเคราะห์ผลแยกรายชั้นเรียน...</p>';
  
  var payload = { action: "getDailySummary", date: date };
  
  callJsonp(payload, function(res) {
    if (res && res.success) {
      var s = res.summary;
      
      var kindergartenHtml = '<div class="section-divider">🧸 ระดับชั้นอนุบาล</div>';
      var primaryHtml = '<div class="section-divider primary-school">🎒 ระดับชั้นประถมศึกษา</div>';
      
      var hasK = false;
      var hasP = false;

      for (var roomKey in s) {
        if (s.hasOwnProperty(roomKey)) {
          var roomData = s[roomKey];
          var totalInRoom = roomData.มา + roomData.สาย + roomData.ลา + roomData.ขาด;
          var displayName = classNamesMap[roomKey] || roomKey;
          
          var cardHtml = `
            <div class="class-summary-card">
              <div class="class-header-title">
                <span>🏫 ชั้น${displayName}</span>
                <span style="font-size:0.75rem; background:#2C2C2E; padding:4px 10px; border-radius:20px; color:#AEAEB2;">บันทึกแล้ว ${totalInRoom} คน</span>
              </div>
              <div class="class-grid">
                <div class="grid-item" style="border-bottom: 3px solid #30D158;">
                  <div class="grid-label">มา</div>
                  <div class="grid-count" style="color:#30D158;">${roomData.มา}</div>
                </div>
                <div class="grid-item" style="border-bottom: 3px solid #FF9F0A;">
                  <div class="grid-label">สาย</div>
                  <div class="grid-count" style="color:#FF9F0A;">${roomData.สาย}</div>
                </div>
                <div class="grid-item" style="border-bottom: 3px solid #BF5AF2;">
                  <div class="grid-label">ลา</div>
                  <div class="grid-count" style="color:#BF5AF2;">${roomData.ลา}</div>
                </div>
                <div class="grid-item" style="border-bottom: 3px solid #FF453A;">
                  <div class="grid-label">ขาด</div>
                  <div class="grid-count" style="color:#FF453A;">${roomData.ขาด}</div>
                </div>
              </div>
            </div>
          `;

          // จัดกลุ่มห้องลงประเภทการ์ดที่ถูกต้อง
          if (roomKey.indexOf("อ") === 0) {
            kindergartenHtml += cardHtml;
            hasK = true;
          } else if (roomKey.indexOf("ป") === 0) {
            primaryHtml += cardHtml;
            hasP = true;
          }
        }
      }
      
      // รวมการ์ดทั้งหมดเข้าด้วยกัน
      container.innerHTML = (hasK ? kindergartenHtml : "") + (hasP ? primaryHtml : "");
      
      if(!hasK && !hasP) {
        container.innerHTML = '<p style="text-align:center; color:#888; padding:2rem;">ไม่มีข้อมูลประวัติในวันนี้</p>';
      }
    } else {
      container.innerHTML = '<p style="text-align:center; color:#888; padding:2rem;">เกิดข้อผิดพลาดจากเซิร์ฟเวอร์</p>';
    }
  });
}

function callJsonp(payload, callbackName) {
  var uniqueCallback = "cb_" + Math.random().toString(36).substr(2, 9);
  window[uniqueCallback] = function(data) {
    callbackName(data);
    document.getElementById(uniqueCallback).remove();
    delete window[uniqueCallback];
  };
  var script = document.createElement("script");
  script.id = uniqueCallback;
  script.src = WEB_APP_URL + "?callback=" + uniqueCallback + "&payload=" + encodeURIComponent(JSON.stringify(payload));
  document.body.appendChild(script);
}

function showToast(msg) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 4000);
}