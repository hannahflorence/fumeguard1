#pragma once

// ESP32-WROOM-DA pin assignments (FumeGuard hardware)
#define PIN_SYS_LED     2
#define PIN_GREEN_LED   17
#define PIN_YELLOW_LED  19
#define PIN_RED_LED     4
#define PIN_BUZZER      16
#define PIN_RELAY       26
// NOTE: ESP32 Wi-Fi cannot reliably read ADC2 pins (GPIO0/2/4/12-15/25-27).
// Move MQ-135 analog output to an ADC1 pin (GPIO32-39). We use GPIO34.
//#define PIN_MQ135       34
#define PIN_MQ135       34
#define PIN_DUST_LED    27
#define PIN_DUST_ADC    35

#define I2C_SDA         21
#define I2C_SCL         22

// I2C OLED (128x64 SH1106) — common address 0x3C (try 0x3D if blank)
#define OLED_I2C_ADDR   0x3C

// Sampling
#define TELEMETRY_INTERVAL_MS  180000
#define ADC_SAMPLES            10

// Thresholds (match packages/shared DEFAULT_THRESHOLDS / standalone sketch)
#define GAS_HAZARD_RAW         1000.0f
#define GAS_WARNING_RAW        800.0f
#define DUST_HAZARD_RAW        400.0f
#define DUST_WARNING_RAW       320.0f
#define CEI_HAZARD_BELOW       70.0f
#define SENSOR_ADC_MAX         3000.0f

#define IDLE_LOAD_THRESHOLD    0.05f
#define IDLE_TIMEOUT_MS        (5UL * 60UL * 1000UL)
