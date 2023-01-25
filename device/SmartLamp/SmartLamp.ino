#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "configuration.h"

WiFiClientSecure secureClient = WiFiClientSecure();
PubSubClient mqttClient(secureClient);


BearSSL::X509List cert(cacert);
BearSSL::X509List client_crt(client_cert);
BearSSL::PrivateKey key(privkey);

const char *ntp1 = "time.windows.com";
const char *ntp2 = "pool.ntp.org";

bool buttonStatus = false;
bool deviceStatus = false;
bool desiredDeviceStatus = false;

StaticJsonDocument<500> jsonBuffer;

void setup() {
  Serial.begin(9600);
  WiFi.begin(wifiSSID, wifiPassword);
  pinMode(D1, OUTPUT);
  pinMode(D2, INPUT_PULLUP);
  deviceOff();
  pinMode(D3, OUTPUT);
  ledOff();
  connectWifi();
  setTIme();
  connectMqtt();
}

void loop() {
  delay(100);
  connectWifi();
  connectMqtt();
  ledOn();

  controlButton();
  mqttClient.loop();
  controlDeviceStatus();
  if(deviceStatus) {
    deviceOn();
  } else {
    deviceOff();
  }  
}

void controlDeviceStatus() {
  if (desiredDeviceStatus != deviceStatus) {
    deviceStatus = desiredDeviceStatus;
    publishMessage(deviceStatus);    
  }
}

void controlButton() {
   if (isButtonPressed()) {
     Serial.println("Button Pressed"); 
    if(!buttonStatus) {
      Serial.println("Device status changed");
      desiredDeviceStatus = !desiredDeviceStatus;
     }
     buttonStatus = true;
     return;
   }
   buttonStatus = false;
}


bool isButtonPressed() {
  return digitalRead(D2) == LOW;
}

void ledOn() {
  digitalWrite(D3, HIGH);
}

void ledOff() {
  digitalWrite(D3, LOW);
}

void deviceOn() {
  digitalWrite(D1, HIGH);
}

void deviceOff() {
  digitalWrite(D1, LOW);
}

void connectMqtt()
{
  if(mqttClient.connected()) {
    return;
  }
  ledOff();
  secureClient.setTrustAnchors(&cert);
  secureClient.setClientRSACert(&client_crt, &key);

  mqttClient.setServer(mqttBroker, mqttPort);
  mqttClient.setCallback(messageReceived);
  
  Serial.println("Connecting to IOT broker...");
  mqttClient.setKeepAlive(1200);

  while (!mqttClient.connect(deviceName))
  {
    Serial.print(".");
    delay(1000);
  }

  if (!mqttClient.connected()) {
    Serial.println("AWS IoT Timeout!");
    return;
  }

  bool subscribed = mqttClient.subscribe("$aws/things/SmartLamp1/shadow/update/delta");
  if(subscribed) {
    Serial.println("subscribed to topic");
  }

  Serial.println("Connected to MQTT Broker!");
}

void connectWifi() {
  if(WiFi.status() == WL_CONNECTED) {
    return;
  }
  ledOff();
  Serial.print("Connecting to wifi.");
  while (WiFi.status() != WL_CONNECTED) {
     delay(500);
     Serial.print(".");
  }

  Serial.println("WiFi connected.");
  Serial.println(WiFi.localIP());
}

void setTIme() {
  Serial.println("Updating data and time... ");
  configTime(0, 1, ntp1, ntp2);
}

void publishMessage(bool state) {
  StaticJsonDocument<200> doc;
  doc["state"]["reported"]["status"] = (int) state;
  doc["state"]["desired"]["status"] = (int) state;
  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer); // print to client
  mqttClient.publish("$aws/things/SmartLamp1/shadow/update", jsonBuffer);
}

void messageReceived(char *topic, byte *payload, unsigned int length)
{
  StaticJsonDocument<500> root;
  deserializeJson(root, payload);

  Serial.print("Received [");
  Serial.print(topic);
  Serial.print("]: ");
  for (int i = 0; i < length; i++)
  {
    Serial.print((char)payload[i]);
  }
  Serial.print(" ------------- ");
  Serial.print(root["state"]["status"].as<int>());
  Serial.println();

  
  if(root["state"]["status"].as<int>() == 1) {
    desiredDeviceStatus = true;
    return;
  }
  
  if(root["state"]["status"].as<int>() == 0) {
    desiredDeviceStatus = false;
    return;
  }  
}
