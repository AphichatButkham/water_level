#include <HX711_ADC.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

const int HX711_dout = 3;
const int HX711_sck = 2;

HX711_ADC LoadCell(HX711_dout, HX711_sck);
float calibrationValue = 864.53;

// BLE UUIDs
#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  // Web → ESP32 (Write)
#define CHARACTERISTIC_UUID_RX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  // ESP32 → Web (Notify)

BLECharacteristic *pCharacteristicRX; // Notify
BLECharacteristic *pCharacteristicTX; // Write

BLEAdvertising *pAdvertising;
bool deviceConnected = false;
String received = "";

// BLE Callbacks
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
    Serial.println("✅ BLE Connected");
  }
  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;
    Serial.println("⚠️ BLE Disconnected — Restarting advertising...");
    delay(500);
    pAdvertising->start();
  }
};

// Handle write data (Web sends "tare")
// Handle write data (Web sends "tare")
class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String rxValue = pCharacteristic->getValue(); // <-- FIXED: now String type

    if (rxValue.length() > 0) {
      received = rxValue;

      Serial.print("🎯 Received: ");
      Serial.println(received);

      if (received == "tare") {
        LoadCell.tare();
        Serial.println("⚖️ TARE DONE");
      }
    }
  }
};


void setup() {
  Serial.begin(115200);

  // HX711 setup
  LoadCell.begin();
  LoadCell.start(2000, true);
  LoadCell.setCalFactor(calibrationValue);
  Serial.println("✅ HX711 Ready");

  // BLE Init
  BLEDevice::init("ESP32C3-Scale");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Notify characteristic (scale value)
  pCharacteristicRX = pService->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristicRX->addDescriptor(new BLE2902());

  // Write characteristic (Web sends commands)
  pCharacteristicTX = pService->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_WRITE
  );
  pCharacteristicTX->setCallbacks(new MyCallbacks());

  pService->start();

  pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();

  Serial.println("✅ BLE Ready — Waiting for connection...");
}

void loop() {
  LoadCell.update();

  if (deviceConnected) {
    float weight = LoadCell.getData();
    
    char buffer[16];
    sprintf(buffer, "%.2f", weight);

    pCharacteristicRX->setValue((uint8_t *)buffer, strlen(buffer));
    pCharacteristicRX->notify();

    Serial.print("📦 Weight: ");
    Serial.println(buffer);
  }

  delay(100);
}
