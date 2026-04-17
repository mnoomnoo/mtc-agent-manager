DEFAULT_AGENT_JSON = """{
    "Devices": "devices.xml",
    "ReconnectInterval": 5000,
    "BufferSize": 14,
    "SchemaVersion": "2.7",
    "MonitorConfigFiles": true,
    "MinimumConfigReloadAge": 15,
    "WorkerThreads": 2,
    "AllowPut": true,
    "DataPath": "/mtconnect/data",
    "HttpHeaders": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Accept"
    },
    "Sinks": {
        "Mqtt2Service": {
            "MqttHost": "localhost",
            "MqttPort": 1883
        }
    },
    "Adapters": {
        "my_device": {
            "ShdrVersion": 2,
            "Realtime": true,
            "Host": "192.168.0.1",
            "Port": 8878,
            "AutoAvailable": true
        }
    },
    "Files": {
        "schemas": {
            "Path": "schemas",
            "Location": "/schemas/"
        },
        "styles": {
            "Path": "styles",
            "Location": "/styles/"
        },
        "Favicon": {
            "Path": "styles/favicon.ico",
            "Location": "/favicon.ico"
        }
    },
    "StreamsStyle": {
        "Location": "/styles/styles.xsl"
    },
    "DevicesStyle": {
        "Location": "/styles/styles.xsl"
    },
    "logger_config": {
        "logging_level": "info",
        "output": "cout"
    }
}
"""

DEFAULT_DEVICES_XML = """<?xml version="1.0" encoding="UTF-8"?>
<MTConnectDevices
    xmlns:m="urn:mtconnect.org:MTConnectDevices:2.4"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema_instance"
    xmlns="urn:mtconnect.org:MTConnectDevices:2.4"
    xsi:schemaLocation="urn:mtconnect.org:MTConnectDevices:2.4 /schemas/MTConnectDevices_2.4.xsd">
    <Devices>
        <Device uuid="00000000-0000-0000-0000-000000000001" id="my_device" name="my_device">
            <DataItems>
                <DataItem category="EVENT" id="avail" type="AVAILABILITY" />
                <DataItem category="EVENT" id="exe" type="EXECUTION" />
            </DataItems>
        </Device>
    </Devices>
</MTConnectDevices>
"""

DEFAULT_DOCKER_COMPOSE = """
services:

  agent:
    container_name: agent
    image: mtconnect/agent:2.7
    restart: unless-stopped
    ports:
      - 5000:5000
    network_mode: host
    volumes:
      - ./volumes/agent:/home/agent
    command: mtcagent run agent.json

  mosquitto:
    container_name: mosquitto
    image: eclipse-mosquitto:latest
    restart: unless-stopped
    ports:
      - '1883:1883'
      - '9001:9001'
    network_mode: host
    volumes:
      - ./volumes/mosquitto:/mosquitto
"""

DEFAULT_ENV = "COMPOSE_PROJECT_NAME=mtc-agent\n"

DEFAULT_MOSQUITTO_CONF = """allow_anonymous true
listener 1883
protocol mqtt
"""
