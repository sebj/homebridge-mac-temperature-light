const serialNumber = require('serial-number');
const Light = require('./build/Release/Light.node');
const Temperature = require('./build/Release/Temperature.node');

serialNumber.preferUUID = true;

let Service, Characteristic;

module.exports = homebridge => {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory('homebridge-mac-temperature-light', 'MacTemperature', TemperatureAccessory);
	homebridge.registerAccessory('homebridge-mac-temperature-light', 'MacAmbientLight', AmbientLightAccessory);
}

class TemperatureAccessory {

	constructor (log, config) {
		this.config = config;
		this.name = this.config.name || 'macOS Temperature';

		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Manufacturer, 'Unknown')
			.setCharacteristic(Characteristic.Model, 'Unknown Apple')
			.setCharacteristic(Characteristic.SerialNumber, 'Unknown');

		serialNumber((err, serial) => {
			if (!err && serial)
				this.informationService.setCharacteristic(Characteristic.SerialNumber, serial);
		});

		this.service = new Service.TemperatureSensor(this.name);
		this.service
				.getCharacteristic(Characteristic.CurrentTemperature)
				.on('get', this.getState.bind(this));

		this.value = null;

		this.updateState();

		// Update state every 4 minutes
		const intervalTime = 1000 * 60 * 4;
		setInterval(this.updateState, intervalTime);
	}

	updateState() {
		const rawTempValues = Temperature.getTemperatureSensorValues();
		if (rawTempValues && rawTempValues.length > 0) {
			const minTemp = Math.min(...rawTempValues);

			const count = rawTempValues.length;
			const avgTemp = rawTempValues.reduce((acc, val) => acc + (val / count), 0);

			// Extremely rough correction value based on personal testing
			// Could definitely make config setting in future
			const correctionValue = -7.25;
			const correctedMinTemp = minTemp + correctionValue;

			const weightedTempMean = (correctedMinTemp * 0.8) + ((avgTemp / 2) * 0.2);

			this.value = weightedTempMean;

			this.service
					.getCharacteristic(Characteristic.CurrentTemperature)
					.updateValue(this.value, null);
		}
	}

	getState (callback) {
		callback(null, this.value);
		return null;
	}

	getServices () {
		return [this.informationService, this.service]
	}
}

class AmbientLightAccessory {

	constructor (log, config) {
		this.log = log;
		this.config = config;
		this.name = this.config.name || 'macOS Ambient Light';

		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Manufacturer, 'Unknown')
			.setCharacteristic(Characteristic.Model, 'Unknown Apple')
			.setCharacteristic(Characteristic.SerialNumber, 'Unknown');

		serialNumber((err, serial) => {
			if (!err && serial)
				this.informationService.setCharacteristic(Characteristic.SerialNumber, serial);
		});

		this.service = new Service.LightSensor(this.name);
		this.service
				.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
				.on('get', this.getState.bind(this));

		this.value = null;

		this.updateState();

		// Update state every 4 minutes
		const intervalTime = 1000 * 60 * 4;
		setInterval(this.updateState, intervalTime);
	}

	updateState() {
		const rawLightValues = Light.getAmbientLightValues();
		if (rawLightValues) {

			// Take the average of the light values.
			// Older Macs have 2 ambient light sensors, modern Macbooks have 1 and so produce identical values.
			let rawValue = (rawLightValues[0] + rawLightValues[1])/2;

			if (isFinite(rawValue)) {
				// Via https://www.snip2code.com/Snippet/232340/Read-lux-measurement-using-MBP-ambient-l
				// -3*(10^-27)*x^4+2.6*(10^-19)*x^3-3.4*(10^-12)*x^2+3.9*(10^-5)*x-0.19;
				const lux = (-3 * Math.pow(10, -27)) * Math.pow(rawValue, 4) + (2.6 * Math.pow(10, -19)) * Math.pow(rawValue, 3) - (3.4 * Math.pow(10,-12)) * Math.pow(rawValue, 2) + (3.9 * Math.pow(10, -5)) * rawValue - 0.19;
				// Enforce minimum (0.0001) and maximum (100,000) lux values, and round lux.
				const value = Math.max(Math.min(100000, Math.round(lux)), 0.0001);

				this.value = value;

				this.service
					.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
					.updateValue(this.value, null);
			}
		}
	}

	getState (callback) {
		callback(null, this.value);
		return null;
	}

	getServices () {
		return [this.informationService, this.service]
	}
}