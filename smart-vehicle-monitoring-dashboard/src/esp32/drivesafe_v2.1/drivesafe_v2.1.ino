/**********************************************************************
                     DriveSafe V2.1
        Smart Vehicle Black Box using ESP32

Features:
- SSD1306 OLED
- MPU6050
- NEO-6M GPS
- GPS speed
- GPS location
- Google Maps link
- ESP32 Wi-Fi
- Start/Stop button
- LED
- Buzzer
- Driver score
- Harsh acceleration detection
- Harsh braking detection
- Left/right turn detection
- Overspeed detection
- Accident detection

Web Dashboard API:
- GET  /telemetry  → JSON telemetry packet
- GET  /status     → JSON telemetry packet (alias)
- POST /command    → {"cmd":"trip_start"} or {"cmd":"trip_stop"}
- GET  /           → HTML status page (backward compatible)
**********************************************************************/

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <MPU6050_tockn.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <WebServer.h>

// ================================================================
// OLED
// ================================================================

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_SDA 21
#define OLED_SCL 22

Adafruit_SSD1306 display(
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    &Wire,
    -1
);

// ================================================================
// MPU6050
// ================================================================

MPU6050 mpu(Wire);

// ================================================================
// GPS
// ================================================================

TinyGPSPlus gps;

HardwareSerial GPS(1);

#define GPS_RX 16
#define GPS_TX 17

// GPS TX -> ESP32 GPIO16
// GPS RX -> not connected

// ================================================================
// PINS
// ================================================================

#define BUTTON_PIN 32
#define LED_PIN 13
#define BUZZER_PIN 27

// ================================================================
// WIFI — Station mode (connects to your phone hotspot)
//
// STEP 1: Turn on your phone hotspot
//         Name: "MyHotspot"  Password: "1234"
//
// STEP 2: Upload this code to ESP32
//
// STEP 3: Open Serial Monitor (115200 baud)
//         Look for "IP Address: 192.168.x.x"
//
// STEP 4: Use that IP in the dashboard Settings
// ================================================================

// ---- Your phone hotspot credentials ----
const char* wifiName = "MyHotspot";      // ← CHANGE to your hotspot name
const char* wifiPassword = "1234";       // ← CHANGE to your hotspot password

WebServer server(80);

// Fallback: AP mode if hotspot not available
const char* apName = "DriveSafe";
const char* apPassword = "12345678";
bool usingAP = false;

// ================================================================
// TRIP
// ================================================================

bool tripRunning = false;

String eventName = "READY";

int driverScore = 100;

// ================================================================
// GPS VARIABLES
// ================================================================

double latitude = 0.0;
double longitude = 0.0;

float speed = 0.0;
float altitude = 0.0;

int satellites = 0;

bool gpsFix = false;

// ================================================================
// MPU VARIABLES
// ================================================================

float ax = 0.0;
float ay = 0.0;
float az = 0.0;

float gx = 0.0;
float gy = 0.0;
float gz = 0.0;

// ================================================================
// EVENT LIMITS
// ================================================================

const float SPEED_LIMIT = 60.0;

const float HARSH_ACCEL_LIMIT = 1.8;

const float HARSH_BRAKE_LIMIT = -1.8;

const float TURN_LIMIT = 80.0;

const float ACCIDENT_LIMIT = 3.0;

// ================================================================
// TIMERS
// ================================================================

unsigned long lastButtonTime = 0;

unsigned long lastDisplayTime = 0;

unsigned long lastEventTime = 0;

unsigned long lastSerialTime = 0;

const unsigned long BUTTON_DELAY = 300;

const unsigned long DISPLAY_DELAY = 300;

const unsigned long EVENT_DELAY = 2000;

// ================================================================
// FUNCTION PROTOTYPES
// ================================================================

void startupScreen();

void readyScreen();

void dashboard();

void beep();

void warningBeep();

void emergencyBeep();

void readGPS();

void readMPU();

void detectEvents();

void handleButton();

void handleRoot();

void handleTelemetry();

void handleCommand();


// ******************************************************************
// SETUP
// ******************************************************************

void setup()
{
    Serial.begin(115200);

    delay(1000);

    Serial.println();
    Serial.println("====================================");
    Serial.println("          DriveSafe V2.1");
    Serial.println("====================================");

    // --------------------------------------------------------------
    // I2C
    // --------------------------------------------------------------

    Wire.begin(
        OLED_SDA,
        OLED_SCL
    );

    // --------------------------------------------------------------
    // PINS
    // --------------------------------------------------------------

    pinMode(
        BUTTON_PIN,
        INPUT_PULLUP
    );

    pinMode(
        LED_PIN,
        OUTPUT
    );

    pinMode(
        BUZZER_PIN,
        OUTPUT
    );

    digitalWrite(
        LED_PIN,
        LOW
    );

    digitalWrite(
        BUZZER_PIN,
        LOW
    );

    // --------------------------------------------------------------
    // OLED
    // --------------------------------------------------------------

    if (!display.begin(
            SSD1306_SWITCHCAPVCC,
            0x3C))
    {
        Serial.println("OLED ERROR");

        while (1)
        {
            digitalWrite(
                LED_PIN,
                !digitalRead(LED_PIN)
            );

            delay(500);
        }
    }

    display.setTextColor(
        SSD1306_WHITE
    );

    startupScreen();

    // --------------------------------------------------------------
    // GPS
    // --------------------------------------------------------------

    GPS.begin(
        9600,
        SERIAL_8N1,
        GPS_RX,
        GPS_TX
    );

    Serial.println(
        "GPS initialized"
    );

    // --------------------------------------------------------------
    // MPU6050
    // --------------------------------------------------------------

    display.clearDisplay();

    display.setTextSize(1);

    display.setCursor(0, 0);

    display.println(
        "MPU6050"
    );

    display.setCursor(0, 15);

    display.println(
        "Calibration..."
    );

    display.setCursor(0, 30);

    display.println(
        "Keep sensor still"
    );

    display.display();

    mpu.begin();

    delay(500);

    mpu.calcGyroOffsets(true);

    Serial.println(
        "MPU6050 ready"
    );

    // --------------------------------------------------------------
    // WIFI — Station mode (connects to your phone hotspot)
    // --------------------------------------------------------------

    WiFi.mode(WIFI_STA);
    WiFi.begin(wifiName, wifiPassword);

    Serial.println();
    Serial.print("Connecting to hotspot: ");
    Serial.println(wifiName);

    // Wait up to 15 seconds for connection
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30)
    {
        delay(500);
        Serial.print(".");
        attempts++;

        // Blink LED while connecting
        digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        // ---- SUCCESS: Connected to phone hotspot ----
        usingAP = false;

        Serial.println();
        Serial.println("WiFi CONNECTED!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());

        Serial.print("Gateway: ");
        Serial.println(WiFi.gatewayIP());

        Serial.print("Signal: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    }
    else
    // --------------------------------------------------------------
    // FALLBACK: Create own hotspot if phone hotspot not available
    // --------------------------------------------------------------
    {
        usingAP = true;

        Serial.println();
        Serial.println("Hotspot not found! Switching to AP mode...");

        WiFi.mode(WIFI_AP);
        WiFi.softAP(apName, apPassword);

        Serial.println("AP mode active");
        Serial.print("Network: ");
        Serial.println(apName);
        Serial.print("Password: ");
        Serial.println(apPassword);
        Serial.print("IP Address: ");
        Serial.println(WiFi.softAPIP());
    }

    digitalWrite(LED_PIN, LOW);

    // --------------------------------------------------------------
    // WEB SERVER ROUTES
    // --------------------------------------------------------------

    server.on(
        "/",
        HTTP_GET,
        handleRoot
    );

    server.on(
        "/telemetry",
        HTTP_GET,
        handleTelemetry
    );

    server.on(
        "/status",
        HTTP_GET,
        handleTelemetry
    );

    server.on(
        "/command",
        HTTP_POST,
        handleCommand
    );

    server.begin();

    Serial.println(
        "Web server started"
    );

    Serial.println(
        "Endpoints: / /telemetry /status /command"
    );

    // --------------------------------------------------------------
    // STARTUP BEEP
    // --------------------------------------------------------------

    beep();

    eventName = "READY";

    driverScore = 100;

    tripRunning = false;

    readyScreen();
}


// ******************************************************************
// LOOP
// ******************************************************************

void loop()
{
    // --------------------------------------------------------------
    // GPS
    // --------------------------------------------------------------

    readGPS();

    // --------------------------------------------------------------
    // WIFI SERVER
    // --------------------------------------------------------------

    server.handleClient();

    // --------------------------------------------------------------
    // BUTTON
    // --------------------------------------------------------------

    handleButton();

    // --------------------------------------------------------------
    // MPU
    // --------------------------------------------------------------

    if (tripRunning)
    {
        readMPU();

        detectEvents();
    }

    // --------------------------------------------------------------
    // LED
    // --------------------------------------------------------------

    if (tripRunning)
    {
        digitalWrite(
            LED_PIN,
            HIGH
        );
    }
    else
    {
        digitalWrite(
            LED_PIN,
            LOW
        );
    }

    // --------------------------------------------------------------
    // OLED
    // --------------------------------------------------------------

    if (
        millis() - lastDisplayTime >=
        DISPLAY_DELAY
    )
    {
        lastDisplayTime =
            millis();

        dashboard();
    }

    // --------------------------------------------------------------
    // SERIAL MONITOR
    // --------------------------------------------------------------

    if (
        millis() - lastSerialTime >=
        3000
    )
    {
        lastSerialTime =
            millis();

        Serial.println();
        Serial.println(
            "========== DriveSafe =========="
        );

        // Show connection status and IP
        if (usingAP)
        {
            Serial.println("MODE: AP (no phone hotspot found)");
            Serial.println("Network: DriveSafe / 12345678");
            Serial.println("IP: 192.168.4.1");
            Serial.println();
            Serial.println("Dashboard endpoint:");
            Serial.println("http://192.168.4.1/telemetry");
        }
        else
        {
            Serial.println("MODE: STATION (connected to phone hotspot)");
            Serial.print("IP: ");
            Serial.println(WiFi.localIP());
            Serial.println();
            Serial.println("Dashboard endpoint:");
            Serial.print("http://");
            Serial.print(WiFi.localIP());
            Serial.println("/telemetry");
            Serial.println();
            Serial.println("Use this IP in dashboard Settings!");
        }

        if (gpsFix)
        {
            Serial.println(
                "GPS FIX: OK"
            );

            Serial.print(
                "Latitude : "
            );

            Serial.println(
                latitude,
                6
            );

            Serial.print(
                "Longitude: "
            );

            Serial.println(
                longitude,
                6
            );

            Serial.print(
                "Speed    : "
            );

            Serial.print(
                speed,
                2
            );

            Serial.println(
                " km/h"
            );

            Serial.print(
                "Satellites: "
            );

            Serial.println(
                satellites
            );

            Serial.println(
                "Google Maps:"
            );

            Serial.print(
                "https://maps.google.com/?q="
            );

            Serial.print(
                latitude,
                6
            );

            Serial.print(",");

            Serial.println(
                longitude,
                6
            );
        }
        else
        {
            Serial.println(
                "GPS FIX: NO FIX"
            );

            Serial.print(
                "Satellites: "
            );

            Serial.println(
                satellites
            );
        }

        Serial.print(
            "Event: "
        );

        Serial.println(
            eventName
        );

        Serial.print(
            "Score: "
        );

        Serial.println(
            driverScore
        );

        Serial.print(
            "AX: "
        );

        Serial.println(
            ax
        );

        Serial.print(
            "AY: "
        );

        Serial.println(
            ay
        );

        Serial.print(
            "AZ: "
        );

        Serial.println(
            az
        );

        Serial.print(
            "GY: "
        );

        Serial.println(
            gy
        );
    }

    delay(10);
}


// ******************************************************************
// STARTUP SCREEN
// ******************************************************************

void startupScreen()
{
    display.clearDisplay();

    display.setTextSize(2);

    display.setCursor(
        8,
        0
    );

    display.println(
        "DriveSafe"
    );

    display.setTextSize(1);

    display.setCursor(
        18,
        28
    );

    display.println(
        "Smart Vehicle"
    );

    display.setCursor(
        28,
        43
    );

    display.println(
        "Black Box"
    );

    display.display();

    delay(2000);
}


// ******************************************************************
// READY SCREEN
// ******************************************************************

void readyScreen()
{
    display.clearDisplay();

    display.setTextSize(2);

    display.setCursor(
        20,
        0
    );

    display.println(
        "READY"
    );

    display.setTextSize(1);

    display.setCursor(
        10,
        30
    );

    display.println(
        "Press button"
    );

    display.setCursor(
        25,
        45
    );

    display.println(
        "to START"
    );

    display.display();
}


// ******************************************************************
// NORMAL BEEP
// ******************************************************************

void beep()
{
    tone(
        BUZZER_PIN,
        2500
    );

    delay(500);

    noTone(
        BUZZER_PIN
    );
}


// ******************************************************************
// WARNING BEEP (triple)
// ******************************************************************

void warningBeep()
{
    Serial.println(
        "WARNING BUZZER!"
    );

    // BEEP 1

    tone(
        BUZZER_PIN,
        3000
    );

    delay(500);

    noTone(
        BUZZER_PIN
    );

    delay(150);

    // BEEP 2

    tone(
        BUZZER_PIN,
        3000
    );

    delay(500);

    noTone(
        BUZZER_PIN
    );

    delay(150);

    // BEEP 3

    tone(
        BUZZER_PIN,
        3000
    );

    delay(500);

    noTone(
        BUZZER_PIN
    );
}


// ******************************************************************
// EMERGENCY BEEP (accident)
// ******************************************************************

void emergencyBeep()
{
    Serial.println(
        "!!! EMERGENCY BUZZER !!!"
    );

    for (int i = 0; i < 4; i++)
    {
        tone(BUZZER_PIN, 2000);
        delay(200);
        noTone(BUZZER_PIN);
        delay(100);

        tone(BUZZER_PIN, 3000);
        delay(200);
        noTone(BUZZER_PIN);
        delay(200);
    }
}


// ******************************************************************
// BUTTON
// ******************************************************************

void handleButton()
{
    static bool previousButton = HIGH;

    bool currentButton =
        digitalRead(
            BUTTON_PIN
        );

    if (
        previousButton == HIGH &&
        currentButton == LOW
    )
    {
        if (
            millis() - lastButtonTime >
            BUTTON_DELAY
        )
        {
            lastButtonTime =
                millis();

            // ------------------------------------------------------
            // START
            // ------------------------------------------------------

            if (!tripRunning)
            {
                tripRunning = true;

                eventName =
                    "TRIP START";

                driverScore =
                    100;

                beep();

                Serial.println(
                    "TRIP STARTED"
                );
            }

            // ------------------------------------------------------
            // STOP
            // ------------------------------------------------------

            else
            {
                tripRunning = false;

                eventName =
                    "TRIP STOP";

                beep();

                Serial.println(
                    "TRIP STOPPED"
                );
            }
        }
    }

    previousButton =
        currentButton;
}


// ******************************************************************
// GPS
// ******************************************************************

void readGPS()
{
    while (GPS.available())
    {
        char c =
            GPS.read();

        gps.encode(c);
    }

    // --------------------------------------------------------------
    // LOCATION
    // --------------------------------------------------------------

    if (gps.location.isValid())
    {
        latitude =
            gps.location.lat();

        longitude =
            gps.location.lng();

        gpsFix = true;
    }
    else
    {
        gpsFix = false;
    }

    // --------------------------------------------------------------
    // SPEED
    // --------------------------------------------------------------

    if (gps.speed.isValid())
    {
        speed =
            gps.speed.kmph();
    }

    // --------------------------------------------------------------
    // SATELLITES
    // --------------------------------------------------------------

    if (gps.satellites.isValid())
    {
        satellites =
            gps.satellites.value();
    }

    // --------------------------------------------------------------
    // ALTITUDE
    // --------------------------------------------------------------

    if (gps.altitude.isValid())
    {
        altitude =
            gps.altitude.meters();
    }
}


// ******************************************************************
// MPU6050
// ******************************************************************

void readMPU()
{
    mpu.update();

    ax =
        mpu.getAccX();

    ay =
        mpu.getAccY();

    az =
        mpu.getAccZ();

    gx =
        mpu.getGyroX();

    gy =
        mpu.getGyroY();

    gz =
        mpu.getGyroZ();
}


// ******************************************************************
// EVENT DETECTION
// ******************************************************************

void detectEvents()
{
    if (
        millis() - lastEventTime <
        EVENT_DELAY
    )
    {
        return;
    }

    // ==============================================================
    // ACCIDENT
    // ==============================================================

    if (
        fabs(ax) > ACCIDENT_LIMIT ||
        fabs(ay) > ACCIDENT_LIMIT
    )
    {
        eventName =
            "ACCIDENT";

        driverScore -= 10;

        if (driverScore < 0)
        {
            driverScore = 0;
        }

        Serial.println(
            "!!! ACCIDENT DETECTED !!!"
        );

        emergencyBeep();

        lastEventTime =
            millis();

        return;
    }

    // ==============================================================
    // HARSH ACCELERATION
    // ==============================================================

    if (
        ax > HARSH_ACCEL_LIMIT
    )
    {
        eventName =
            "HARSH ACCEL";

        driverScore -= 2;

        if (driverScore < 0)
        {
            driverScore = 0;
        }

        Serial.println(
            "!!! HARSH ACCELERATION !!!"
        );

        beep();

        lastEventTime =
            millis();

        return;
    }

    // ==============================================================
    // HARSH BRAKING
    // ==============================================================

    if (
        ax < HARSH_BRAKE_LIMIT
    )
    {
        eventName =
            "HARSH BRAKE";

        driverScore -= 3;

        if (driverScore < 0)
        {
            driverScore = 0;
        }

        Serial.println(
            "!!! HARSH BRAKING !!!"
        );

        warningBeep();

        lastEventTime =
            millis();

        return;
    }

    // ==============================================================
    // RIGHT TURN
    // ==============================================================

    if (
        gy > TURN_LIMIT
    )
    {
        eventName =
            "RIGHT TURN";

        if (driverScore > 0)
        {
            driverScore--;
        }

        Serial.println(
            "RIGHT TURN"
        );

        beep();

        lastEventTime =
            millis();

        return;
    }

    // ==============================================================
    // LEFT TURN
    // ==============================================================

    if (
        gy < -TURN_LIMIT
    )
    {
        eventName =
            "LEFT TURN";

        if (driverScore > 0)
        {
            driverScore--;
        }

        Serial.println(
            "LEFT TURN"
        );

        beep();

        lastEventTime =
            millis();

        return;
    }

    // ==============================================================
    // OVERSPEED
    // ==============================================================

    if (
        speed > SPEED_LIMIT
    )
    {
        eventName =
            "OVERSPEED";

        driverScore -= 2;

        if (driverScore < 0)
        {
            driverScore = 0;
        }

        Serial.println(
            "!!! OVERSPEED !!!"
        );

        warningBeep();

        lastEventTime =
            millis();

        return;
    }

    // ==============================================================
    // NORMAL
    // ==============================================================

    eventName =
        "NORMAL";
}


// ******************************************************************
// OLED DASHBOARD
// ******************************************************************

void dashboard()
{
    static unsigned long lastPageChange = 0;

    static int page = 0;

    if (
        millis() - lastPageChange >=
        3000
    )
    {
        lastPageChange =
            millis();

        page++;

        if (page > 1)
        {
            page = 0;
        }
    }

    display.clearDisplay();

    display.setTextSize(1);

    // ==============================================================
    // PAGE 1
    // ==============================================================

    if (page == 0)
    {
        display.setCursor(
            0,
            0
        );

        display.print(
            "TRIP: "
        );

        if (tripRunning)
        {
            display.print(
                "RUN"
            );
        }
        else
        {
            display.print(
                "STOP"
            );
        }

        display.setCursor(
            72,
            0
        );

        display.print(
            "SPD:"
        );

        if (gpsFix)
        {
            display.print(
                speed,
                0
            );
        }
        else
        {
            display.print(
                "--"
            );
        }

        display.setCursor(
            0,
            12
        );

        display.print(
            "EVENT:"
        );

        display.println(
            eventName
        );

        display.setCursor(
            0,
            24
        );

        display.print(
            "SCORE:"
        );

        display.print(
            driverScore
        );

        display.setCursor(
            72,
            24
        );

        display.print(
            "SAT:"
        );

        display.print(
            satellites
        );

        display.setCursor(
            0,
            36
        );

        display.print(
            "GPS:"
        );

        if (gpsFix)
        {
            display.print(
                "OK"
            );
        }
        else
        {
            display.print(
                "NO FIX"
            );
        }

        display.setCursor(
            0,
            50
        );

        if (tripRunning)
        {
            display.print(
                "DRIVE SAFE"
            );
        }
        else
        {
            display.print(
                "PRESS BUTTON"
            );
        }
    }

    // ==============================================================
    // PAGE 2
    // ==============================================================

    else
    {
        display.setCursor(
            0,
            0
        );

        display.println(
            "GPS STATUS"
        );

        display.setCursor(
            0,
            15
        );

        if (gpsFix)
        {
            display.println(
                "FIX: OK"
            );
        }
        else
        {
            display.println(
                "FIX: NO FIX"
            );
        }

        display.setCursor(
            0,
            28
        );

        display.print(
            "SATELLITES: "
        );

        display.println(
            satellites
        );

        display.setCursor(
            0,
            41
        );

        display.print(
            "SPEED: "
        );

        if (gpsFix)
        {
            display.print(
                speed,
                1
            );

            display.println(
                " km/h"
            );
        }
        else
        {
            display.println(
                "--"
            );
        }

        display.setCursor(
            0,
            54
        );

        display.println(
            "MAP LINK ON PHONE"
        );
    }

    display.display();
}


// ******************************************************************
// JSON HELPER — send CORS headers
// ******************************************************************

void sendCORS()
{
    server.sendHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    server.sendHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    server.sendHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );
}


// ******************************************************************
// JSON ENDPOINT — GET /telemetry or GET /status
//
// Returns a single JSON object with all live data.
// The web dashboard polls this endpoint every second.
// ******************************************************************

void handleTelemetry()
{
    sendCORS();

    // Handle preflight OPTIONS
    if (server.method() == HTTP_OPTIONS)
    {
        server.send(204);
        return;
    }

    // Build JSON string
    String json = "{";

    // ---- Trip state ----
    json += "\"tripRunning\":";
    json += tripRunning ? "true" : "false";

    // ---- GPS data ----
    json += ",\"speed\":";
    json += String(speed, 2);

    json += ",\"latitude\":";
    json += String(latitude, 6);

    json += ",\"longitude\":";
    json += String(longitude, 6);

    json += ",\"gpsFix\":";
    json += gpsFix ? "true" : "false";

    json += ",\"satellites\":";
    json += satellites;

    // ---- MPU6050 data ----
    json += ",\"ax\":";
    json += String(ax, 2);

    json += ",\"ay\":";
    json += String(ay, 2);

    json += ",\"az\":";
    json += String(az, 2);

    json += ",\"gx\":";
    json += String(gx, 2);

    json += ",\"gy\":";
    json += String(gy, 2);

    json += ",\"gz\":";
    json += String(gz, 2);

    // ---- Event + score ----
    json += ",\"eventName\":\"";
    json += eventName;
    json += "\"";

    json += ",\"driverScore\":";
    json += driverScore;

    // ---- Hardware status flags ----
    json += ",\"mpuOk\":true";
    json += ",\"oledOk\":true";

    json += "}";

    server.send(
        200,
        "application/json",
        json
    );
}


// ******************************************************************
// COMMAND ENDPOINT — POST /command
//
// Accepts:  {"cmd":"trip_start"}  or  {"cmd":"trip_stop"}
// Returns:  200 OK if accepted, 400 if unknown command
//
// This lets the web dashboard start/stop trips remotely.
// ******************************************************************

void handleCommand()
{
    sendCORS();

    if (server.method() == HTTP_OPTIONS)
    {
        server.send(204);
        return;
    }

    String body = server.arg("plain");

    Serial.print("Command received: ");
    Serial.println(body);

    // Simple string matching (no JSON parser needed)
    if (body.indexOf("trip_start") >= 0)
    {
        if (!tripRunning)
        {
            tripRunning = true;
            eventName = "TRIP START";
            driverScore = 100;

            beep();

            Serial.println("TRIP STARTED via API");
        }

        server.send(
            200,
            "application/json",
            "{\"ok\":true,\"tripRunning\":true}"
        );
    }
    else if (body.indexOf("trip_stop") >= 0)
    {
        if (tripRunning)
        {
            tripRunning = false;
            eventName = "TRIP STOP";

            beep();

            Serial.println("TRIP STOPPED via API");
        }

        server.send(
            200,
            "application/json",
            "{\"ok\":true,\"tripRunning\":false}"
        );
    }
    else
    {
        server.send(
            400,
            "application/json",
            "{\"ok\":false,\"error\":\"unknown command\"}"
        );
    }
}


// ******************************************************************
// HTML PAGE — GET / (backward compatible)
// ******************************************************************

void handleRoot()
{
    String page;

    page +=
        "<!DOCTYPE html>";

    page +=
        "<html>";

    page +=
        "<head>";

    page +=
        "<meta name='viewport' "
        "content='width=device-width,initial-scale=1'>";

    page +=
        "<title>DriveSafe</title>";

    page +=
        "</head>";

    page +=
        "<body>";

    page +=
        "<h1>DriveSafe</h1>";

    page +=
        "<h2>Vehicle GPS</h2>";

    // --------------------------------------------------------------
    // GPS FIX
    // --------------------------------------------------------------

    if (gpsFix)
    {
        page +=
            "<p><b>GPS: FIX OK</b></p>";

        page +=
            "<p>Satellites: ";

        page +=
            satellites;

        page +=
            "</p>";

        page +=
            "<p>Speed: ";

        page +=
            speed;

        page +=
            " km/h</p>";

        // ----------------------------------------------------------
        // MAP LINK
        // ----------------------------------------------------------

        String mapLink =
            "https://maps.google.com/?q=" +
            String(latitude, 6) +
            "," +
            String(longitude, 6);

        page +=
            "<a href='" +
            mapLink +
            "'>";

        page +=
            "<button "
            "style='font-size:24px;"
            "padding:15px'>";

        page +=
            "OPEN GOOGLE MAPS";

        page +=
            "</button>";

        page +=
            "</a>";

        page +=
            "<p>Current location available</p>";
    }

    else
    {
        page +=
            "<p><b>GPS: NO FIX</b></p>";

        page +=
            "<p>"
            "Move outside for GPS fix."
            "</p>";
    }

    // --------------------------------------------------------------
    // EVENT
    // --------------------------------------------------------------

    page +=
        "<hr>";

    page +=
        "<h3>Drive Status</h3>";

    page +=
        "<p>Trip: ";

    if (tripRunning)
    {
        page +=
            "<b>RUNNING</b>";
    }
    else
    {
        page +=
            "<b>STOPPED</b>";
    }

    page +=
        "</p>";

    page +=
        "<p>Event: <b>";

    page +=
        eventName;

    page +=
        "</b></p>";

    page +=
        "<p>Driver Score: <b>";

    page +=
        driverScore;

    page +=
        "</b></p>";

    // --------------------------------------------------------------
    // REFRESH
    // --------------------------------------------------------------

    page +=
        "<br>";

    page +=
        "<a href='/'>";

    page +=
        "<button "
        "style='font-size:18px;"
        "padding:10px'>";

    page +=
        "REFRESH";

    page +=
        "</button>";

    page +=
        "</a>";

    // --------------------------------------------------------------
    // JSON API INFO
    // --------------------------------------------------------------

    page +=
        "<hr>";

    page +=
        "<p><small>";

    page +=
        "JSON API: <a href='/telemetry'>/telemetry</a>";

    page +=
        "</small></p>";

    page +=
        "</body>";

    page +=
        "</html>";

    server.send(
        200,
        "text/html",
        page
    );
}
