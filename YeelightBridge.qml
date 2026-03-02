Item {
    anchors.fill : parent
    property var deviceList: []
    
    property var lastConnectedDevices: []
    
    Component.onCompleted: {
        bridgeServerIP.text = service.getSetting("General", "BridgeServerIP") || "127.0.0.1"
        bridgeServerPort.text = service.getSetting("General", "BridgeServerPort") || "8888"
        if (bridgeServerIP.text !== "" && bridgeServerPort.text !== "") {
            checkConnectionButton.clicked();
        }
    }

function addYeelightDevice() {
    const xhr = new XMLHttpRequest()
    const deviceData = {
        name: deviceName.text || (deviceModel.currentText + " (" + deviceIP.text + ")"),
        ip: deviceIP.text,
        token: deviceToken.text
    }
    
    xhr.open("POST", `http://${bridgeServerIP.text}:${bridgeServerPort.text}/bulbs`, true)
    xhr.setRequestHeader("Content-Type", "application/json")
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 201) {
                deviceIP.text = ""
                deviceToken.text = ""
                deviceName.text = ""
                deviceModel.currentIndex = 0
                checkConnectionButton.clicked()
            } else {
                console.log("Yeelight Bridge: Failed to add device, status:", xhr.status)
            }
        }
    }
    xhr.onerror = function() {
        console.log("Yeelight Bridge: Error adding device to server")
    }
    xhr.send(JSON.stringify(deviceData))
}

function deleteDevice(deviceId) {
    const xhr = new XMLHttpRequest()
    xhr.open("DELETE", `http://${bridgeServerIP.text}:${bridgeServerPort.text}/bulbs/${deviceId}`, true)
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                discovery.removedDevices(deviceId)
                checkConnectionButton.clicked()
            } else {
                console.log("Yeelight Bridge: Failed to delete device, status:", xhr.status)
            }
        }
    }
    xhr.onerror = function() {
        console.log("Yeelight Bridge: Error deleting device from server")
    }
    xhr.send()
}
Connections {
    target : bridgeServerIP
    function onTextEdited()
    {
        service.saveSetting("General", "BridgeServerIP", bridgeServerIP.text)
    }
}

Connections {
    target : bridgeServerPort
    function onTextEdited()
    {
        service.saveSetting("General", "BridgeServerPort", bridgeServerPort.text)
    }
}
    Flickable {
        anchors.fill: parent
        contentHeight: headerColumn.height

        		ScrollBar.vertical: ScrollBar {
			id: controllerListScrollBar
			anchors.right: parent.right
			width: 10
			visible: true //parent.height < parent.contentHeight
			policy: ScrollBar.AlwaysOn
			height: parent.availableHeight
			contentItem: Rectangle {
				radius: parent.width / 2
				color: theme.scrollBar
			}
		}
Column {
    id : headerColumn
    y : 0
    width : parent.width - 20
    spacing : 0
    Text {
        color : theme.primarytextcolor
        text : "Control Yeelight bulbs through SignalRGB. Start the bridge server (npm start), enable LAN control on your bulbs, then add them using IP and token."
        font.pixelSize : 14
        font.family : "Poppins"
        font.bold : false
        bottomPadding : 15
        width : parent.width
        wrapMode : Text.WordWrap
    }
Rectangle {
    width : parent.width
    height : 1
    color : "#444444"
}
Row {
    topPadding : 20
    spacing : 5
    Rectangle {
        x : 0
        y : 0
        width : 200
        height : 30
        radius : 2
        border.color : "#444444"
        border.width : 2
        color : "#141414"
        TextField {
            width : 180
            leftPadding : 0
            rightPadding : 10
            id : bridgeServerIP
            x : 10
            y : -5
            color : theme.primarytextcolor
            font.family : "Poppins"
            font.bold : true
            font.pixelSize : 16
            verticalAlignment : TextInput.AlignVCenter
            placeholderText : "Bridge Server IP"
            validator : RegularExpressionValidator {
                regularExpression : /^((?:[0-1]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.){0,3}(?:[0-1]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])$/
            }
            background : Item {
                width : parent.width
                height : parent.height
                Rectangle {
                    color : "transparent"
                    height : 1
                    width : parent.width
                    anchors.bottom : parent.bottom
                }
            }
        }
    }
    Rectangle {
        x : 0
        y : 0
        width : 60
        height : 30
        radius : 2
        border.color : "#444444"
        border.width : 2
        color : "#141414"
        TextField {
            width : 50
            leftPadding : 0
            rightPadding : 10
            id : bridgeServerPort
            x : 10
            y : -5
            color : theme.primarytextcolor
            font.family : "Poppins"
            font.bold : true
            font.pixelSize : 16
            verticalAlignment : TextInput.AlignVCenter
            placeholderText : "Port"
            validator : RegularExpressionValidator {
                regularExpression : /^([0-9]{1,4})$/
            }
            background : Item {
                width : parent.width
                height : parent.height
                Rectangle {
                    color : "transparent"
                    height : 1
                    width : parent.width
                    anchors.bottom : parent.bottom
                }
            }
        }
    }
    Item {
        Rectangle {
            width : 130
            height : 30
            color : "#009000"
            radius : 2
        }
        width : 135
        height : 30
        ToolButton {
            id: checkConnectionButton
            height : 30
            width : 130
            anchors.verticalCenter : parent.verticalCenter
            font.family : "Poppins"
            font.bold : true
            icon.source : "data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAV0lEQVQ4jWP8//8/A0UAnwH///3r+P/vXwdevQQMuPv/37+7+AxgItaluMAwMIARGpIdDAwMoVjklaD0PSxyqxkYGSsodsFoNFLBABYC8qsJGcBIaXYGAFjoNxCMz3axAAAAAElFTkSuQmCC"
            text : "Check Connection"
            anchors.right : parent.center
            onClicked: {
                deviceList = []
                deviceRepeater.model = deviceList
                
                const xhr = new XMLHttpRequest()
                xhr.open("GET", `http://${bridgeServerIP.text}:${bridgeServerPort.text}/bulbs`, true)
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            try {
                                let res = JSON.parse(xhr.responseText)
                                if (res.bulbs && res.bulbs.length > 0) {
                                    deviceList = res.bulbs.map(bulb => ({
                                        deviceId: bulb.id,
                                        name: bulb.model || 'Yeelight Bulb',
                                        id: bulb.id,
                                        ip: bulb.address
                                    }))
                                    deviceRepeater.model = deviceList
                                    
                                    // Auto-reconnect if we have devices and none are currently connected
                                    if (deviceList.length > 0 && lastConnectedDevices.length === 0) {
                                        try {
                                            discovery.connect(deviceList)
                                            lastConnectedDevices = deviceList.slice()
                                        } catch (error) {
                                            console.log("Yeelight Bridge: Error auto-connecting devices:", error)
                                        }
                                    }
                                }
                            } catch (error) {
                                console.log("Yeelight Bridge: Error parsing server response:", error)
                            }
                        } else {
                            console.log("Yeelight Bridge: Server returned error status:", xhr.status)
                        }
                    }
                }
                xhr.onerror = function() {
                    console.log("Yeelight Bridge: Failed to connect to server")
                }
                xhr.send()
            }
}
}
}
Column {
    width : 200
    spacing : 5
    topPadding : 10
    
    Text {
        id: test
        color : theme.primarytextcolor
        text : "Add Yeelight Device"
        font.pixelSize : 16
        font.family : "Poppins"
        font.bold : false
        bottomPadding : 10
        width : 400
        wrapMode : Text.WordWrap
    }
    
    // Device Input Form
    Rectangle {
        width : 400
        height : 120
        color : "#212d3a"
        radius : 2
        border.color : "#444444"
        border.width : 1
        
        Column {
            anchors.fill: parent
            anchors.margins: 10
            spacing: 5
            
            Row {
                spacing: 10
                width: parent.width
                
                Rectangle {
                    width: 200
                    height: 30
                    color: "#141414"
                    radius: 2
                    border.color: "#444444"
                    border.width: 1
                    
                    TextField {
                        id: deviceIP
                        anchors.fill: parent
                        anchors.margins: 2
                        color: theme.primarytextcolor
                        font.family: "Poppins"
                        font.pixelSize: 14
                        placeholderText: "Device IP (e.g., 192.168.1.100)"
                        validator: RegularExpressionValidator {
                            regularExpression: /^((?:[0-1]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.){0,3}(?:[0-1]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])$/
                        }
                        background: Item {}
                    }
                }
                
                Rectangle {
                    width: 150
                    height: 30
                    color: "#141414"
                    radius: 2
                    border.color: "#444444"
                    border.width: 1
                    
                    TextField {
                        id: deviceToken
                        anchors.fill: parent
                        anchors.margins: 2
                        color: theme.primarytextcolor
                        font.family: "Poppins"
                        font.pixelSize: 14
                        placeholderText: "Device Token"
                        echoMode: TextInput.Password
                        background: Item {}
                    }
                }
            }
            
            Row {
                spacing: 10
                width: parent.width
                
                Rectangle {
                    width: 200
                    height: 30
                    color: "#141414"
                    radius: 2
                    border.color: "#444444"
                    border.width: 1
                    
                    TextField {
                        id: deviceName
                        anchors.fill: parent
                        anchors.margins: 2
                        color: theme.primarytextcolor
                        font.family: "Poppins"
                        font.pixelSize: 14
                        placeholderText: "Device Name (optional)"
                        background: Item {}
                    }
                }
                
                Rectangle {
                    width: 150
                    height: 30
                    color: "#141414"
                    radius: 2
                    border.color: "#444444"
                    border.width: 1
                    
                    ComboBox {
                        id: deviceModel
                        anchors.fill: parent
                        anchors.margins: 2
                        model: ["Color Bulb", "Color Strip", "Desk Lamp", "Ceiling Light", "Other"]
                        background: Item {}
                    }
                }
            }
            
            Rectangle {
                width: 100
                height: 30
                color: "#009000"
                radius: 2
                
                Text {
                    anchors.centerIn: parent
                    color: "white"
                    text: "Add Device"
                    font.family: "Poppins"
                    font.pixelSize: 14
                    font.bold: true
                }
                
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        if (deviceIP.text && deviceToken.text) {
                            addYeelightDevice();
                        }
                    }
                }
            }
        }
    }
    
    Text {
        color : theme.primarytextcolor
        text : "Available devices from server:"
        font.pixelSize : 16
        font.family : "Poppins"
        font.bold : false
        bottomPadding : 10
        topPadding : 10
        width : 400
        wrapMode : Text.WordWrap
    }
    
    Item {
        width : 150
        height : 30
        Rectangle {
            width : 150
            height : 30
            color : "#0066cc"
            radius : 2
        }
        ToolButton {
            id: connectDevicesButton
            height : 30
            width : 150
            anchors.verticalCenter : parent.verticalCenter
            font.family : "Poppins"
            font.bold : true
            text : "Connect All Devices"
            anchors.centerIn : parent
            onClicked: {
                if (deviceList.length > 0) {
                    try {
                        discovery.connect(deviceList)
                        lastConnectedDevices = deviceList.slice()
                    } catch (error) {
                        console.log("Yeelight Bridge: Error connecting devices:", error)
                    }
                }
            }
        }
    }
    Repeater {
        id : deviceRepeater
        model : deviceList
        Rectangle {
            width : 400
            height : 30
            color : "#212d3a"
            radius : 2
            
            Text {
                anchors.left: parent.left
                anchors.leftMargin: 10
                anchors.verticalCenter: parent.verticalCenter
                rightPadding: 60
                color : "white"
                text : modelData.name
                font.pixelSize : 16
                font.family : "Poppins"
                font.bold : true
                width : parent.width - 70
                elide : Text.ElideRight
            }
            
            Rectangle {
                width: 50
                height: 20
                anchors.right: parent.right
                anchors.rightMargin: 5
                anchors.verticalCenter: parent.verticalCenter
                color: "#ff0000"
                radius: 2
                
                Text {
                    anchors.centerIn: parent
                    text: "Delete"
                    color: "#ffffff"
                    font.family: "Poppins"
                    font.pixelSize: 10
                    font.bold: true
                }
                
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        deleteDevice(modelData.deviceId)
                    }
                }
            }
        }
    }
}
}
}
}