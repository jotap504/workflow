import mqtt from 'mqtt';

// Default configuration for a public MQTT broker with WebSockets
// In a real scenario, this would be your EMQX or HiveMQ endpoint
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const MQTT_OPTIONS = {
    clientId: `qr_web_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
};

let client = null;

export const connectMqtt = () => {
    if (client && client.connected) return client;

    console.log('[MQTT] Connecting to broker...');
    client = mqtt.connect(MQTT_BROKER, MQTT_OPTIONS);

    client.on('connect', () => {
        console.log('[MQTT] Connected successfully');
    });

    client.on('error', (err) => {
        console.error('[MQTT] Connection error: ', err);
        client.end();
    });

    return client;
};

export const getClient = () => {
    if (!client || !client.connected) {
        return connectMqtt();
    }
    return client;
};

/**
 * Publish settings to a specific device via MQTT
 * @param {string} uid Device UID
 * @param {object} settings Settings object
 */
export const publishSettings = (uid, settings) => {
    const c = getClient();
    const topic = `qrsolo/${uid}/cmnd/settings`;
    // Construct the payload matching ESP32 expectation
    const payload = JSON.stringify({
        user: settings.user,
        mpToken: settings.mpToken,
        wifiSsid: settings.wifiSsid,
        wifiPass: settings.wifiPass,
        devName: settings.name,
        vol: parseInt(settings.volume),
        bright: parseInt(settings.brightness),
        mqttEn: settings.mqttEn,
        mqttServer: settings.mqttServer,
        // Add other fields as needed
    });

    console.log(`[MQTT] Publishing settings to ${topic}`);
    c.publish(topic, payload, { qos: 1 });
};

/**
 * Subscribe to a device's status
 * @param {string} uid Device UID
 * @param {function} onStatus Callback for status strings
 * @param {function} onState Callback for state JSON
 */
export const subscribeToDevice = (uid, onStatus, onState) => {
    const c = getClient();
    const topicBase = `qrsolo/${uid}`;
    const statusTopic = `${topicBase}/stat/status`;
    const stateTopic = `${topicBase}/stat/state`;

    c.subscribe([statusTopic, stateTopic], (err) => {
        if (err) console.error(`[MQTT] Subscription error for ${uid}:`, err);
    });

    const handleMessage = (topic, message) => {
        const msgStr = message.toString();
        if (topic === statusTopic) {
            if (onStatus) onStatus(msgStr);
        } else if (topic === stateTopic) {
            try {
                if (onState) onState(JSON.parse(msgStr));
            } catch (e) {
                console.error('[MQTT] Error parsing state JSON:', e);
            }
        }
    };

    c.on('message', handleMessage);

    return () => {
        c.unsubscribe([statusTopic, stateTopic]);
        c.removeListener('message', handleMessage);
    };
};

/**
 * Trigger remote action
 * @param {string} uid 
 * @param {string} command (activate, reset, etc)
 * @param {any} value 
 */
export const sendCommand = (uid, command, value) => {
    const c = getClient();
    const topic = `qrsolo/${uid}/cmnd/${command}`;
    const payload = typeof value === 'object' ? JSON.stringify(value) : String(value);
    c.publish(topic, payload, { qos: 1 });
};
