export function Name() { return "Yeelight Bridge"; }
export function Version() { return "1.1.0"; }
export function Type() { return "network"; }
export function Publisher() { return "Yeelight Bridge"; }
export function Size() { return [8, 5]; }
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
const BRIGHTNESS_CHANGE_THRESHOLD = 3; // Prozentpunkte

export function Initialize() {
	device.setName(controller.name);
	// Größe vom exportierten Size() verwenden, nicht hartkodiert
	device.setSize(Size());
	// Ein Einzel-LED-Gerät (Bulb) — Position bleibt [0,0], wir mitteln aber die ganze Fläche im Render
	device.setControllableLeds(["LED 1"], [[0, 0]]);
	device.setImageFromUrl('https://cdn.worldvectorlogo.com/logos/yeelight-1.svg');
	controller.lastColor = null;
	controller.lastPowerState = undefined;
}

export function Render() {
	try {
		let color = [];
		if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			// Averaging über die gesamte logische Device-Größe
			color = averageDeviceColor();
		}

		const brightness = getPerceivedBrightness(color[0], color[1], color[2]);

		const newState = [color[0], color[1], color[2], brightness];

		if (hasColorChanged(newState)) {
			setColors(newState[0], newState[1], newState[2], newState[3]);
			controller.lastColor = newState.slice();
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
	const brightness = getPerceivedBrightness(color[0], color[1], color[2]);
	if (brightness <= 1) {
		// komplett ausschalten
		sendPower(false);
	} else {
		setColors(color[0], color[1], color[2], brightness);
	}
	controller.lastColor = null;
	controller.lastPowerState = undefined;
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

function hasColorChanged(newState) {
	if (!controller.lastColor) {
		return true;
	}

	const rDiff = Math.abs(newState[0] - controller.lastColor[0]);
	const gDiff = Math.abs(newState[1] - controller.lastColor[1]);
	const bDiff = Math.abs(newState[2] - controller.lastColor[2]);
	const totalDiff = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);

	const brightnessDiff = Math.abs(newState[3] - (controller.lastColor[3] || 0));

	return totalDiff >= COLOR_THRESHOLD || brightnessDiff >= BRIGHTNESS_CHANGE_THRESHOLD;
}

function setColors(r, g, b, brightness) {
	const host = controller.serverHost;
	const port = controller.serverPort;

	// Wenn komplett schwarz: ausschalten
	if (brightness <= 1) {
		sendPower(false);
		controller.lastPowerState = false;
		return;
	}

	// Stelle sicher, dass Lampe an ist
	if (controller.lastPowerState === false || controller.lastPowerState === undefined) {
		sendPower(true);
		controller.lastPowerState = true;
	}

	// 1) Setze Farbe (Server unterstützt brightness im Body)
	sendSetColor(r, g, b, brightness);

	// 2) Für Nicht-MIOT-Geräte wird zusätzlich /setBrightness aufgerufen, damit Helligkeit immer angewendet wird
	sendSetBrightness(brightness);
}

function sendSetColor(r, g, b, brightness) {
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
			console.log("Yeelight Bridge: Server returned error status for setColor:", xhr.status);
		}
	};

	try {
		xhr.send(JSON.stringify({
			r: r,
			g: g,
			b: b,
			brightness: brightness,
			bulbs: [controller.id]
		}));
	} catch (error) {
		console.log("Yeelight Bridge: Error sending color update:", error);
	}
}

function sendSetBrightness(brightness) {
	const host = controller.serverHost;
	const port = controller.serverPort;

	const xhr = new XMLHttpRequest();
	xhr.open("POST", `http://${host}:${port}/setBrightness`, true);
	xhr.setRequestHeader("Content-Type", "application/json");

	xhr.onerror = function() {
		console.log("Yeelight Bridge: Failed to send brightness update to server");
	};

	xhr.onload = function() {
		if (xhr.status !== 200) {
			console.log("Yeelight Bridge: Server returned error status for setBrightness:", xhr.status);
		}
	};

	try {
		xhr.send(JSON.stringify({
			brightness: brightness,
			bulbs: [controller.id]
		}));
	} catch (error) {
		console.log("Yeelight Bridge: Error sending brightness update:", error);
	}
}

function sendPower(power) {
	const host = controller.serverHost;
	const port = controller.serverPort;

	const xhr = new XMLHttpRequest();
	xhr.open("POST", `http://${host}:${port}/power`, true);
	xhr.setRequestHeader("Content-Type", "application/json");

	xhr.onerror = function() {
		console.log("Yeelight Bridge: Failed to send power update to server");
	};

	xhr.onload = function() {
		if (xhr.status !== 200) {
			console.log("Yeelight Bridge: Server returned error status for power:", xhr.status);
		}
	};

	try {
		xhr.send(JSON.stringify({
			power: power,
			bulbs: [controller.id]
		}));
	} catch (error) {
		console.log("Yeelight Bridge: Error sending power update:", error);
	}
}

function getPerceivedBrightness(r, g, b) {
	// Perceived luminance (ITSRGB) scaled to 0-100
	const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return Math.max(0, Math.min(100, Math.round((y / 255) * 100)));
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);
	return colors;
}

// Helfer: mittelt alle Farben aus dem logischen Device-Grid (Size)
function averageDeviceColor() {
	const sz = Size();
	const width = Math.max(1, parseInt(sz[0], 10) || 1);
	const height = Math.max(1, parseInt(sz[1], 10) || 1);

	let totalR = 0, totalG = 0, totalB = 0;
	let count = 0;

	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) {
			try {
				const c = device.color(x, y);
				if (!c || c.length < 3) continue;
				totalR += c[0];
				totalG += c[1];
				totalB += c[2];
				count++;
			} catch (err) {
				// some device implementations may throw — ignore those cells
			}
		}
	}

	if (count === 0) {
		// Fallback: obere linke Zelle
		const fallback = device.color(0, 0) || [0, 0, 0];
		return [fallback[0], fallback[1], fallback[2]];
	}

	return [
		Math.round(totalR / count),
		Math.round(totalG / count),
		Math.round(totalB / count)
	];
}
