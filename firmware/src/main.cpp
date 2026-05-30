/**
 * FumeGuard ESP32 firmware
 * MQ-135 gas, GP2Y1014AU dust — logic aligned with standalone sketch
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <U8g2lib.h>
#include <time.h>

#include "config.h"

#if __has_include("secrets.h")
#include "secrets.h"
#else
#warning "Copy include/secrets.h.example to include/secrets.h"
#define WIFI_SSID "CHANGE_ME"
#define WIFI_PASSWORD "CHANGE_ME"
#define MQTT_HOST "192.168.1.100"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""
#define MQTT_SECURE false
#define DEVICE_ID "esp32-01"
#endif

#ifndef MQTT_SECURE
#define MQTT_SECURE false
#endif

static WiFiClient wifiClient;
static WiFiClientSecure secureWifiClient;
static PubSubClient mqtt;

static float gasValue = 0;
static float dustValue = 0;
static float cei = 0;
static unsigned long lastTelemetryMs = 0;
static bool fanOn = false;
static bool ledOn = false;
static bool prevFanOn = false;
static bool alarmArmed = true;
static String lastStatus = "safe";
static unsigned long lastWifiAttemptMs = 0;
static unsigned long lastWifiDotMs = 0;
static unsigned long lastMqttAttemptMs = 0;
static bool ntpConfigured = false;
static bool ntpSynced = false;
static unsigned long lastNtpAttemptMs = 0;

static float readGasRaw();
static float readDustRaw();
static float computeCeiScore(float gas, float dust);
static String deriveStatus(float gas, float dust, float ceiVal);
static void updateActuators(const String& status);
static void publishTelemetry();
static void publishEvent(const char* type, const char* message);
static void reconnectMqtt();
static long long nowEpochMs();
static void ensureWifiConnected();
static const char* wifiStatusText(wl_status_t status);

// ---------------------------------------------------------------------------
// OLED display (U8g2 / SH1106 128x64, I2C on SDA=21 SCL=22)
// ---------------------------------------------------------------------------

static U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(
    U8G2_R0, U8X8_PIN_NONE, I2C_SCL, I2C_SDA);
static bool oledReady = false;

static bool initOled() {
  Wire.begin(I2C_SDA, I2C_SCL);
  u8g2.setI2CAddress(OLED_I2C_ADDR * 2);
  if (!u8g2.begin()) {
    Serial.println("OLED init failed — check wiring and I2C address (0x3C/0x3D)");
    return false;
  }
  return true;
}

static void drawOledHeader() {
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(25, 10, "FUME GUARD");
}

static void showOledBootMessage(const char* message) {
  if (!oledReady) return;

  u8g2.clearBuffer();
  drawOledHeader();
  u8g2.setCursor(20, 25);
  u8g2.print(message);
  u8g2.sendBuffer();
}

static void updateOled(float gas, float dust, float ceiVal, const String& airStatus) {
  if (!oledReady) return;

  u8g2.clearBuffer();
  drawOledHeader();

  u8g2.setCursor(0, 25);
  u8g2.print("Gas:");
  u8g2.print((int)gas);

  u8g2.setCursor(0, 37);
  u8g2.print("Dust:");
  u8g2.print((int)dust);

  u8g2.setCursor(0, 49);
  u8g2.print("CEI:");
  u8g2.print((int)ceiVal);

  u8g2.setCursor(0, 61);
  u8g2.print("Status:");
  u8g2.print(airStatus.c_str());

  u8g2.sendBuffer();
}

// ---------------------------------------------------------------------------

static float mapRange(float value, float inMin, float inMax, float outMin, float outMax) {
  value = constrain(value, inMin, inMax);
  if (inMax == inMin) return outMin;
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_SYS_LED, OUTPUT);
  pinMode(PIN_GREEN_LED, OUTPUT);
  pinMode(PIN_YELLOW_LED, OUTPUT);
  pinMode(PIN_RED_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_DUST_LED, OUTPUT);
  pinMode(PIN_MQ135, INPUT);
  pinMode(PIN_DUST_ADC, INPUT);

  digitalWrite(PIN_DUST_LED, HIGH);
  digitalWrite(PIN_RELAY, HIGH);
  digitalWrite(PIN_SYS_LED, HIGH);
  digitalWrite(PIN_GREEN_LED, LOW);
  digitalWrite(PIN_YELLOW_LED, LOW);
  digitalWrite(PIN_RED_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  oledReady = initOled();
  if (oledReady) {
    showOledBootMessage("Starting...");
  }

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.disconnect(true, true);
  delay(200);
  ensureWifiConnected();

  if (MQTT_SECURE) {
    secureWifiClient.setInsecure();
    mqtt.setClient(secureWifiClient);
    Serial.println("MQTT: Secure TLS mode enabled");
  } else {
    mqtt.setClient(wifiClient);
    Serial.println("MQTT: Unsecure TCP mode enabled");
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  if (WiFi.status() == WL_CONNECTED) {
    reconnectMqtt();
  }

  if (oledReady) {
    showOledBootMessage("Boot complete");
  }
}

void loop() {
  ensureWifiConnected();

  if (WiFi.status() == WL_CONNECTED && !ntpSynced) {
    if (!ntpConfigured) {
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
      ntpConfigured = true;
    }
    unsigned long now = millis();
    if (now - lastNtpAttemptMs >= 30000) {
      lastNtpAttemptMs = now;
      struct tm timeinfo;
      if (getLocalTime(&timeinfo, 5000)) {
        ntpSynced = true;
        Serial.println("NTP sync OK");
      }
    }
  }

  if (WiFi.status() == WL_CONNECTED && !mqtt.connected()) {
    reconnectMqtt();
  }
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastTelemetryMs < TELEMETRY_INTERVAL_MS) {
    return;
  }
  lastTelemetryMs = now;

  gasValue = readGasRaw();
  dustValue = readDustRaw() * DUST_READING_SCALE;
  cei = computeCeiScore(gasValue, dustValue);

  String status = deriveStatus(gasValue, dustValue, cei);
  updateActuators(status);
  updateOled(gasValue, dustValue, cei, status);

  if (status != lastStatus) {
    if (status == "hazardous") {
      publishEvent("alert", "Hazardous air quality");
    } else {
      publishEvent("threshold", "Air quality status changed");
    }
    lastStatus = status;
  }

  if (fanOn && !prevFanOn) {
    publishEvent("fan_on", "Exhaust fan activated");
  } else if (!fanOn && prevFanOn) {
    publishEvent("fan_off", "Exhaust fan deactivated");
  }
  prevFanOn = fanOn;

  publishTelemetry();
}

static float readGasRaw() {
  long sum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) {
    sum += analogRead(PIN_MQ135);
    delay(2);
  }
  return (float)(sum / ADC_SAMPLES);
}

static float readDustRaw() {
  digitalWrite(PIN_DUST_LED, LOW);
  delayMicroseconds(280);
  int raw = analogRead(PIN_DUST_ADC);
  delayMicroseconds(40);
  digitalWrite(PIN_DUST_LED, HIGH);
  return (float)raw;
}

static float computeCeiScore(float gas, float dust) {
  float gasScore = mapRange(gas, 0, SENSOR_ADC_MAX, 100, 0);
  float dustScore = mapRange(dust, 0, SENSOR_ADC_MAX, 100, 0);
  return (gasScore + dustScore) / 2.0f;
}

static String deriveStatus(float gas, float dust, float ceiVal) {
  if (gas > GAS_HAZARD_RAW || dust > DUST_HAZARD_RAW || ceiVal < CEI_HAZARD_BELOW) {
    return "hazardous";
  }
  if (gas > GAS_WARNING_RAW || dust > DUST_WARNING_RAW) {
    return "warning";
  }
  return "safe";
}

static void updateActuators(const String& status) {
  digitalWrite(PIN_GREEN_LED, LOW);
  digitalWrite(PIN_YELLOW_LED, LOW);
  digitalWrite(PIN_RED_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  bool newFanOn = fanOn;

  if (status == "safe") {
    digitalWrite(PIN_GREEN_LED, HIGH);
    newFanOn = false;
    alarmArmed = true;
    ledOn = false;
  } else if (status == "warning") {
    digitalWrite(PIN_YELLOW_LED, HIGH);
    newFanOn = true;
    ledOn = true;
    if (alarmArmed) {
      digitalWrite(PIN_BUZZER, HIGH);
      delay(120);
      digitalWrite(PIN_BUZZER, LOW);
      alarmArmed = false;
    }
  } else if (status == "hazardous") {
    digitalWrite(PIN_RED_LED, HIGH);
    newFanOn = true;
    ledOn = true;
    if (alarmArmed) {
      digitalWrite(PIN_BUZZER, HIGH);
      delay(300);
      digitalWrite(PIN_BUZZER, LOW);
      alarmArmed = false;
    }
  }

  fanOn = newFanOn;
  digitalWrite(PIN_RELAY, fanOn ? LOW : HIGH);
}

static void publishTelemetry() {
  String status = deriveStatus(gasValue, dustValue, cei);

  JsonDocument doc;
  doc["ts"] = nowEpochMs();
  doc["gasPpm"] = (int)gasValue;
  doc["dustUgM3"] = (int)dustValue;
  doc["cei"] = roundf(cei * 10) / 10.0f;
  doc["status"] = status;
  doc["fanOn"] = fanOn;
  doc["ledOn"] = ledOn;

  char buf[384];
  serializeJson(doc, buf, sizeof(buf));

  String topic = String("fumeguard/") + DEVICE_ID + "/telemetry";
  mqtt.publish(topic.c_str(), buf, false);
}

static void publishEvent(const char* type, const char* message) {
  JsonDocument doc;
  doc["ts"] = nowEpochMs();
  doc["type"] = type;
  doc["message"] = message;

  char buf[256];
  serializeJson(doc, buf, sizeof(buf));
  String topic = String("fumeguard/") + DEVICE_ID + "/events";
  mqtt.publish(topic.c_str(), buf, false);
}

static long long nowEpochMs() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    return (long long)mktime(&timeinfo) * 1000LL;
  }
  return (long long)millis();
}

static void reconnectMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - lastMqttAttemptMs < 3000) return;
  lastMqttAttemptMs = now;

  Serial.print("MQTT connect...");
  String clientId = String("fumeguard-") + DEVICE_ID;
  bool ok;
  if (strlen(MQTT_USER) > 0) {
    ok = mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
  } else {
    ok = mqtt.connect(clientId.c_str());
  }
  if (ok) {
    Serial.println(" OK");
  } else {
    Serial.print(" fail ");
    Serial.println(mqtt.state());
  }
}

static void ensureWifiConnected() {
  static bool wifiLogged = false;
  wl_status_t status = WiFi.status();

  if (status == WL_CONNECTED) {
    if (!wifiLogged) {
      wifiLogged = true;
      Serial.println("\nWiFi OK: " + WiFi.localIP().toString());
    }
    return;
  }
  wifiLogged = false;

  unsigned long now = millis();
  if (now - lastWifiAttemptMs > 10000) {
    lastWifiAttemptMs = now;
    Serial.printf("\nWiFi connect start: ssid=\"%s\" status=%s\n", WIFI_SSID, wifiStatusText(status));
    WiFi.disconnect(true, true);
    delay(100);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }

  if (now - lastWifiDotMs > 500) {
    lastWifiDotMs = now;
    Serial.print(".");
  }
}

static const char* wifiStatusText(wl_status_t status) {
  switch (status) {
    case WL_IDLE_STATUS: return "IDLE";
    case WL_NO_SSID_AVAIL: return "NO_SSID";
    case WL_SCAN_COMPLETED: return "SCAN_DONE";
    case WL_CONNECTED: return "CONNECTED";
    case WL_CONNECT_FAILED: return "CONNECT_FAILED";
    case WL_CONNECTION_LOST: return "CONNECTION_LOST";
    case WL_DISCONNECTED: return "DISCONNECTED";
    default: return "UNKNOWN";
  }
}
