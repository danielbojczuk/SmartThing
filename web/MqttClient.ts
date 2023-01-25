import {mqtt5, iot, auth} from "aws-iot-device-sdk-v2";
import { AWSCognitoCredentialsProvider } from "./AWSCognitoCredentialsProvider";
import {once} from "events";

export class MqttClient {
    private mqttClient!: mqtt5.Mqtt5Client;
    constructor(private readonly settings: any, private readonly log: (msg: string) => void, private readonly messageReceivedFunction: (payload:any) => void) {
        
    }

    public async subscribe(topic: string) {
        const suback = await  this.mqttClient.subscribe({
            subscriptions: [
                { qos: mqtt5.QoS.AtLeastOnce, topicFilter: topic },
            ]
        });
        this.log('Suback result: ' + JSON.stringify(suback));
    }

    public async publish(payload: any, topic: string) {
        const qos0PublishResult = await this.mqttClient.publish({
            qos: mqtt5.QoS.AtLeastOnce,
            topicName: topic,
            payload: JSON.stringify(payload),
        });
        this.log('QoS 0 Publish result: ' + JSON.stringify(qos0PublishResult));
    }

    public async connect(): Promise<void> {
        const provider = new AWSCognitoCredentialsProvider(this.log, {
            IdentityPoolId: this.settings.AWS_COGNITO_IDENTITY_POOL_ID,
            Region: this.settings.AWS_REGION});

        await provider.refreshCredentials();

        this.mqttClient =  this.initializeClient(provider);

        const attemptingConnect = once(this.mqttClient, "attemptingConnect");
        const connectionSuccess = once(this.mqttClient, "connectionSuccess");

        this.mqttClient.start();

        await attemptingConnect;
        await connectionSuccess;
    } 

    private initializeClient(provider: auth.CredentialsProvider): mqtt5.Mqtt5Client {
        const wsConfig : iot.WebsocketSigv4Config = {
            credentialsProvider: provider,
            region: this.settings.AWS_REGION,
        };
    
        const builder: iot.AwsIotMqtt5ClientConfigBuilder = iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
            this.settings.AWS_IOT_ENDPOINT,
            wsConfig,
        );
    
        const client : mqtt5.Mqtt5Client = new mqtt5.Mqtt5Client(builder.build());
    
        client.on('error', (error) => {
            this.log("Error event: " + error.toString());
        });
    
        client.on("messageReceived",(eventData: mqtt5.MessageReceivedEvent) => this.messageReceivedFunction(eventData));
    
        client.on('attemptingConnect', (eventData: mqtt5.AttemptingConnectEvent) => {
            this.log("Attempting Connect event");
        });
    
        client.on('connectionSuccess', (eventData: mqtt5.ConnectionSuccessEvent) => {
            this.log("Connection Success event");
            this.log ("Connack: " + JSON.stringify(eventData.connack));
            this.log ("Settings: " + JSON.stringify(eventData.settings));
        });
    
        client.on('connectionFailure', (eventData: mqtt5.ConnectionFailureEvent) => {
            this.log("Connection failure event: " + eventData.error.toString());
        });
    
        client.on('disconnection', (eventData: mqtt5.DisconnectionEvent) => {
            this.log("Disconnection event: " + eventData.error.toString());
            if (eventData.disconnect !== undefined) {
                this.log('Disconnect packet: ' + JSON.stringify(eventData.disconnect));
            }
        });
    
        client.on('stopped', (eventData: mqtt5.StoppedEvent) => {
            this.log("Stopped event");
        });
    
        return client;
    }
}