#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "configuration.h"

WiFiClientSecure secureClient = WiFiClientSecure();
PubSubClient mqttClient(secureClient);
int returnCode;

BearSSL::X509List cert(cacert);
BearSSL::X509List client_crt(client_cert);
BearSSL::PrivateKey key(privkey);

void connectMqtt()
{ 
  if(mqttClient.connected()) {
    return;
  }

  secureClient.setTrustAnchors(&cert);
  secureClient.setClientRSACert(&client_crt, &key);
 
  mqttClient.setServer(mqttBroker, mqttPort);
 
  Serial.println("Connecting to IOT");
 
  while (!mqttClient.connect(deviceName))
  {
    Serial.print(".");
    delay(1000);
  }
 
  if (!mqttClient.connected()) {
    Serial.println("AWS IoT Timeout!");
    return;
  }
     
  Serial.println("AWS IoT Connected!");
}

void connectWifi() {
  if(WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.print("Connecting.");
  while (WiFi.status() != WL_CONNECTED) {
     delay(500);
     Serial.print(".");
  }

  Serial.println("WiFi connected:");
  Serial.println(WiFi.localIP());
}

void setup() {
  WiFi.begin(wifiSSID, wifiPassword);
  Serial.begin(9600);
  connectWifi();  
  connectMqtt();
}

void loop() {
  delay(500);
  connectWifi(); 
  connectMqtt();
}
