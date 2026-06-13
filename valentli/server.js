const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const CSV_FILE = path.join(__dirname, 'attendance_records.csv');

// Initialize CSV file with headers if it doesn't exist
if (!fs.existsSync(CSV_FILE)) {
  const headers = "วันที่,รหัสนักเรียน,ชื่อ-นามสกุล,เพศ,ชั้นเรียน,ชื่อครูประจำชั้น,สถานะ,บันทึกเวลาสำเร็จ\n";
  fs.writeFileSync(CSV_FILE, headers, 'utf8');
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Serve static files
  if (pathname === '/' || pathname === '/attendance.html') {
    fs.readFile(path.join(__dirname, 'attendance.html'), (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error loading attendance.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      }
    });
  } else if (pathname === '/attendance.css') {
    fs.readFile(path.join(__dirname, 'attendance.css'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading CSS');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
        res.end(data);
      }
    });
  } else if (pathname === '/attendance.js') {
    fs.readFile(path.join(__dirname, 'attendance.js'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading JS');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(data);
      }
    });
  } else if (pathname === '/api') {
    // Handle JSONP request to save attendance
    const callback = parsedUrl.query.callback || 'onSuccess';
    const payloadStr = parsedUrl.query.payload;
    
    let result = { success: false, message: 'ไม่พบข้อมูล' };
    
    if (payloadStr) {
      try {
        const payload = JSON.parse(decodeURIComponent(payloadStr));
        if (payload.action === 'saveAttendance' && Array.isArray(payload.data)) {
          const dataArray = payload.data;
          
          // Current timestamp in local timezone format
          const now = new Date();
          const tzOffset = now.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');

          let newLines = '';
          dataArray.forEach((d) => {
            // Escape double quotes for CSV format
            const row = [
              d.date || '', // Column A: วันที่
              d.id || '', // Column B: รหัสนักเรียน
              d.name || '', // Column C: ชื่อ-นามสกุล
              d.gender || '', // Column D: เพศ
              d.classroom || '', // Column E: ชั้นเรียน
              d.teacher || '', // Column F: ชื่อครูประจำชั้น
              d.status || '', // Column G: สถานะ
              localISOTime // Column H: บันทึกเวลาสำเร็จ
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
            newLines += row + '\n';
          });
          
          fs.appendFileSync(CSV_FILE, newLines, 'utf8');
          result = { success: true, message: `บันทึกสำเร็จเรียบร้อย! (ลงในไฟล์ attendance_records.csv)` };
        } else {
          result = { success: false, message: 'คำขอไม่ถูกต้อง' };
        }
      } catch (err) {
        result = { success: false, message: 'Error processing data: ' + err.message };
      }
    }
    
    const jsonOutput = `${callback}(${JSON.stringify(result)});`;
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(jsonOutput);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
