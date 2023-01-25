import jquery = require("jquery");
import settings = require('./settings');
import {toUtf8} from "@aws-sdk/util-utf8-browser";
import { MqttClient } from "./MqttClient";

const $: JQueryStatic = jquery;
let lampStatus:boolean = false;

function log(msg: string) {
    let now = new Date();
    $('#console').append(`<pre>${now.toString()}: ${msg}</pre>`);
    var objDiv = document.getElementById("console");
    if(objDiv) {
      objDiv.scrollTop = objDiv.scrollHeight;
    }
}

function swtichLampImg() {
  $('#lamp').html(`<img src="img/${Number(lampStatus)}.png" height="90%">`);
}

function requestSwitch() {
  const payload = {
    state: {
      desired: {
        status: Number(!lampStatus),
      }
    }
  }
  mqttClient.publish(payload, settings.AWS_SHADOW_UPDATE_PUBLISH_TOPIC);  
}

function updatePage(eventData: any) {
  log("Message Received event " + JSON.stringify(eventData.message));
  log("  with payload: " + toUtf8(eventData.message.payload as Buffer));

  if (!eventData.message.payload) {
    return;
  }

  const payload = JSON.parse(Buffer.from(eventData.message.payload).toString());
  if(eventData.message.topicName == settings.AWS_SHADOW_GET_ACCEPTED_TOPIC) {
    lampStatus = payload.state.reported.status as boolean;
  } else {
    lampStatus = payload.current.state.reported.status as boolean;
  }
  swtichLampImg();
}

async function main(){
    await mqttClient.connect();
    await mqttClient.subscribe(settings.AWS_SHADOW_DOCUMENT_UPDATE_TOPIC);
    await mqttClient.subscribe(settings.AWS_SHADOW_GET_ACCEPTED_TOPIC);
    await mqttClient.publish("",settings.AWS_SHADOW_REQUEST_TOPIC);
}

const mqttClient = new MqttClient(settings,log,updatePage);

$(document).ready(() => {
  $("#lamp").on("click", () => requestSwitch());
  main();
});