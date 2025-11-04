// BLE UUIDs
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

// RX: ESP32 -> Web (Notification)
const CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// TX: Web -> ESP32 (Write)
const CHARACTERISTIC_UUID_TX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

let bleDevice;
let bleCharacteristic;
let bleCharacteristicTX;

// Create Fluid Meter
var fm = new FluidMeter();
fm.init({
  targetContainer: document.getElementById("gauge-waterlevel"),
  fillPercentage: 0,
  options: {
    fontSize: "70px",
    fontFamily: "Arial",
    fontFillStyle: "white",
    drawShadow: true,
    drawText: true,
    drawPercentageSign: false,
    drawBubbles: true,
    size: 300,
    borderWidth: 1,
    fontSize: "45px",
    backgroundColor: false,
    foregroundColor: "#fff",
    maxValue: 1000,
    foregroundFluidLayer: {
      fillStyle: "purple",
      angularSpeed: 100,
      maxAmplitude: 12,
      frequency: 30,
      horizontalSpeed: -150
    },
    backgroundFluidLayer: {
      fillStyle: "pink",
      angularSpeed: 100,
      maxAmplitude: 9,
      frequency: 30,
      horizontalSpeed: 150
    }
  }
});

// ---- BLE Connect ----
async function connectBLE() {
  try {
    // อัพเดทสถานะปุ่ม
    const bleBtn = document.querySelector('.ble-btn');
    bleBtn.innerHTML = '<span class="material-symbols-outlined">bluetooth_searching</span>Connecting...';
    bleBtn.classList.add('connecting');
    
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "ESP32C3-Scale" }],
      optionalServices: [SERVICE_UUID]
    });

    const server = await bleDevice.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);

    bleCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    bleCharacteristicTX = await service.getCharacteristic(CHARACTERISTIC_UUID_TX);

    await bleCharacteristic.startNotifications();
    bleCharacteristic.addEventListener("characteristicvaluechanged", handleNotification);

    // อัพเดทสถานะเมื่อเชื่อมต่อสำเร็จ
    bleBtn.innerHTML = '<span class="material-symbols-outlined">bluetooth_connected</span>Connected';
    bleBtn.classList.remove('connecting');
    bleBtn.classList.add('connected');
    
    // แสดงการแจ้งเตือน
    showNotification("BLE Connected Successfully");
    
  } catch (error) {
    // รีเซ็ตสถานะปุ่มเมื่อเกิดข้อผิดพลาด
    const bleBtn = document.querySelector('.ble-btn');
    bleBtn.innerHTML = '<span class="material-symbols-outlined">bluetooth</span>Connect BLE';
    bleBtn.classList.remove('connecting', 'connected');
    
    showNotification("BLE Error: " + error, "error");
  }
}

// ---- Handle data from ESP32C3 ----
function handleNotification(event) {
  const rawText = new TextDecoder().decode(event.target.value).trim();
  const value = parseFloat(rawText);

  if (!isNaN(value)) {
    console.log("BLE Value:", value);
    let displayValue = Math.min(value, 1000); 
    fm.setPercentage(displayValue);
  }
}

// ---- Send Tare Command ----
async function sendTare() {
  if (!bleCharacteristicTX) {
    showNotification("BLE Not Connected", "error");
    return;
  }

  // เพิ่มเอฟเฟกต์การโหลดชั่วคราว
  const tareBtn = document.querySelector('.tare-btn');
  const originalText = tareBtn.innerHTML;
  tareBtn.innerHTML = '<span class="material-symbols-outlined">autorenew</span>Taring...';
  
  try {
    const encoder = new TextEncoder();
    await bleCharacteristicTX.writeValue(encoder.encode("tare"));
    
    // รีเซ็ตปุ่มหลังจากเสร็จสิ้น
    setTimeout(() => {
      tareBtn.innerHTML = originalText;
    }, 800);
    
    showNotification("Tare Command Sent");
  } catch (error) {
    tareBtn.innerHTML = originalText;
    showNotification("Tare Failed: " + error, "error");
  }
}

// ---- Create Modern BLE Controls ----
function createBLEControls() {
  const controlsContainer = document.createElement("div");
  controlsContainer.className = "ble-controls";
  
  // ปุ่ม Connect BLE
  const bleBtn = document.createElement("button");
  bleBtn.className = "ble-btn";
  bleBtn.innerHTML = '<span class="material-symbols-outlined">bluetooth</span>Connect BLE';
  bleBtn.onclick = connectBLE;
  
  // ปุ่ม Tare
  const tareBtn = document.createElement("button");
  tareBtn.className = "tare-btn";
  tareBtn.innerHTML = '<span class="material-symbols-outlined">balance</span>Tare';
  tareBtn.onclick = sendTare;
  
  controlsContainer.appendChild(bleBtn);
  controlsContainer.appendChild(tareBtn);
  document.body.appendChild(controlsContainer);
}

// ---- Simple Notification System ----
function showNotification(message, type = "success") {
  // สร้างองค์ประกอบการแจ้งเตือน
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="material-symbols-outlined">
      ${type === "success" ? "check_circle" : "error"}
    </span>
    <span>${message}</span>
  `;
  
  // เพิ่มสไตล์การแจ้งเตือน
  notification.style.cssText = `
    position: fixed;
    top: 90px;
    right: 20px;
    background: ${type === "success" ? "#4CAF50" : "#f44336"};
    color: white;
    padding: 12px 18px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 10000;
    font-size: 14px;
    animation: fadeIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // ซ่อนการแจ้งเตือนหลังจาก 3 วินาที
  setTimeout(() => {
    notification.style.animation = "fadeOut 0.3s ease";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', function() {
  createBLEControls();
});