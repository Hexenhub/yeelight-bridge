export function Name() { return "Yeelight Bridge"; }
export function Version() { return "1.1.0"; }
export function Type() { return "network"; }
export function Publisher() { return "Yeelight Bridge"; }
export function Size() { return [1, 1]; }
export function DefaultPosition() { return [0, 70]; }
export function DefaultScale() { return 1.0; }
export function ControllableParameters() {
	return [
		{ "property": "shutdownColor", "group": "lighting", "label": "Shutdown Color", "min": "0", "max": "360", "type": "color", "default": "#009bde" },
		{ "property": "LightingMode", "group": "lighting", "label": "Lighting Mode", "type": "combobox", "values": ["Canvas", "Forced"], "default": "Canvas" },
		{ "property": "forcedColor", "group": "lighting", "label": "Forced Color", "min": "0", "max": "360", "type": "color", "default": "#009bde" }
	];
}

const COLOR_THRESHOLD = 10;

export function Initialize() {
	device.setName(controller.name);
	device.setSize([1, 1]);
	device.setControllableLeds(["LED 1"], [[0, 0]]);
	device.setImageFromUrl('https://cdn.worldvectorlogo.com/logos/yeelight-1.svg');
	controller.lastColor = null;
}

export function Render() {
	try {
		let color = [];
		if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(0, 0);
		}

		if (hasColorChanged(color)) {
			setColors(color[0], color[1], color[2]);
			controller.lastColor = color.slice();
		}
		device.pause(100);
	} catch (error) {
		console.log("Yeelight Bridge: Error in Render function:", error);
		device.pause(100);
	}
}

export function Shutdown() {
	device.pause(250);
	let color = hexToRgb(shutdownColor);
	setColors(color[0], color[1], color[2]);
	controller.lastColor = null;
}


export function DiscoveryService() {
    this.IconUrl = "https://cdn.worldvectorlogo.com/logos/yeelight-1.svg";

	this.connect = function (devices) {
		try {
			for (let i = 0; i < devices.length; i++) {
				this.AddDevice(devices[i]);
			}
		} catch (error) {
			console.log("Yeelight Bridge: Error connecting devices:", error);
		}
	};

	this.removedDevices = function (deviceId) {
		let controller = service.getController(deviceId);
		if (controller !== undefined) {
			service.removeController(controller);
			service.suppressController(controller);
		}
	}

	this.AddDevice = function (deviceData) {
		try {
			const yeelightDevice = new YeelightDevice(deviceData);
			service.addController(yeelightDevice);
		} catch (error) {
			console.log("Yeelight Bridge: Error adding device:", error);
		}
	};

	this.Update = function () {
		return;
	};
}

class YeelightDevice {
	constructor(deviceData) {
		try {
			this.id = deviceData.deviceId || deviceData.id;
			this.name = deviceData.name;
			this.setServiceSettings();
			this.update();
		} catch (error) {
			console.log("Yeelight Bridge: Error initializing device:", error);
		}
	}

	setServiceSettings() {
	    this.serverHost = service.getSetting("General", "BridgeServerIP") || '127.0.0.1';
    	this.serverPort = service.getSetting("General", "BridgeServerPort") || '8888';
	}

	update() {
		try {
			const controller = service.getController(this.id)
			if (controller === undefined) {
				service.addController(this);
				service.announceController(this);
			} else {
				service.removeController(controller);
				service.suppressController(controller);
				service.addController(this);
				service.announceController(this);
			}
		} catch (error) {
			console.log("Yeelight Bridge: Error updating device:", error);
		}
	};
}

function hasColorChanged(newColor) {
	if (!controller.lastColor) {
		return true;
	}

	const rDiff = Math.abs(newColor[0] - controller.lastColor[0]);
	const gDiff = Math.abs(newColor[1] - controller.lastColor[1]);
	const bDiff = Math.abs(newColor[2] - controller.lastColor[2]);
	
	const totalDiff = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
	
	return totalDiff >= COLOR_THRESHOLD;
}

function setColors(r, g, b) {
	const host = controller.serverHost;
	const port = controller.serverPort;
	
	const xhr = new XMLHttpRequest();
	xhr.open("POST", `http://${host}:${port}/setColor`, true);
	xhr.setRequestHeader("Content-Type", "application/json");
	
	xhr.onerror = function() {
		console.log("Yeelight Bridge: Failed to send color update to server");
	};
	
	xhr.onload = function() {
		if (xhr.status !== 200) {
			console.log("Yeelight Bridge: Server returned error status:", xhr.status);
		}
	};
	
	try {
		xhr.send(JSON.stringify({
			r: r,
			g: g,
			b: b,
			brightness: 100,
			bulbs: [controller.id]
		}));
	} catch (error) {
		console.log("Yeelight Bridge: Error sending color update:", error);
	}
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);
	return colors;
}
