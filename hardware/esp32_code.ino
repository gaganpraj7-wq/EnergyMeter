#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASS";

const char* serverUrl = "https://your-backend-url/api/sensor";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
  }
}

void loop() {
  float voltage = analogRead(35);
  float current = analogRead(34);

  float power = voltage * current;
  float energy = power / 1000.0;

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String json = "{\"voltage\":" + String(voltage) +
                  ",\"current\":" + String(current) +
                  ",\"power\":" + String(power) +
                  ",\"energy\":" + String(energy) + "}";

    http.POST(json);
    http.end();
  }

  delay(5000);
}