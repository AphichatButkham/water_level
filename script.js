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

  } catch (error) {
    alert("❌ BLE Error: " + error);
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
  if (!bleCharacteristicTX) return alert("❌ BLE Not Connected");

  const encoder = new TextEncoder();
  await bleCharacteristicTX.writeValue(encoder.encode("tare"));
  alert("✅ Tare Sent");
}

// ---- Add BLE Button ----
const btn = document.createElement("button");
btn.innerText = "Connect BLE";
btn.style.cssText = "position:fixed; top:15px; right:15px; padding:10px 20px; font-size:18px;";
btn.onclick = connectBLE;
document.body.appendChild(btn);

// ---- Add Tare Button ----
const tareBtn = document.createElement("button");
tareBtn.innerText = "Tare";
tareBtn.style.cssText = "position:fixed; top:65px; right:15px; padding:10px 20px; font-size:18px;";
tareBtn.onclick = sendTare;
document.body.appendChild(tareBtn);
