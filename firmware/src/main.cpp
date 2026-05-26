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
#include <LiquidCrystal_I2C.h>
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
static LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

static float gasValue = 0;
static float dustValue = 0;
static float cei = 0;
static unsigned long lastTelemetryMs = 0;
static bool fanOn = false;
static bool ledOn = false;
static bool prevFanOn = false;
static bool alarmArmed = true;
static String lastStatus = "safe";

static float readGasRaw();
static float readDustRaw();
static float computeCeiScore(float gas, float dust);
static String deriveStatus(float gas, float dust, float ceiVal);
static void updateActuators(const String& status);
static void updateLcd(float gas, float dust, float ceiVal, const String& status);
static void publishTelemetry();
static void publishEvent(const char* type, const char* message);
static void reconnectMqtt();
static long long nowEpochMs();

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

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.print("FumeGuard");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK: " + WiFi.localIP().toString());

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm timeinfo;
  for (int i = 0; i < 20 && !getLocalTime(&timeinfo); i++) {
    delay(500);
  }

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
  reconnectMqtt();

  lcd.clear();
  lcd.print("MQTT ready");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }
  if (!mqtt.connected()) {
    reconnectMqtt();
  }
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastTelemetryMs < TELEMETRY_INTERVAL_MS) {
    return;
  }
  lastTelemetryMs = now;

  gasValue = readGasRaw();
  dustValue = readDustRaw();
  cei = computeCeiScore(gasValue, dustValue);

  String status = deriveStatus(gasValue, dustValue, cei);
  updateActuators(status);
  updateLcd(gasValue, dustValue, cei, status);

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

static void updateLcd(float gas, float dust, float ceiVal, const String& status) {
  lcd.setCursor(0, 0);
  lcd.printf("G:%4.0f D:%4.0f", gas, dust);
  lcd.setCursor(0, 1);
  lcd.printf("C:%3.0f %-7s", ceiVal, status.c_str());
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
  while (!mqtt.connected()) {
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
      return;
    }
    Serial.print(" fail ");
    Serial.println(mqtt.state());
    delay(3000);
  }
}
