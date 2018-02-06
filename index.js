const serialNumber = require('serial-number');
const execFile = require("child_process").execFile;
const os = require("os");
const Light = require('./build/Release/Light');

serialNumber.preferUUID = true;

let Service, Characteristic, serial;

serialNumber((err, value) => {
	if (!err)
		this.serial = value;
});

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
				.setCharacteristic(Characteristic.Manufacturer, 'Unknown Manufacturer')
				.setCharacteristic(Characteristic.Model, 'Unknown Apple')
				.setCharacteristic(Characteristic.SerialNumber, serial || 'Undefined serial');

		this.service = new Service.TemperatureSensor(this.name);
		this.service
				.getCharacteristic(Characteristic.CurrentTemperature)
				.on('get', this.getState.bind(this));
	}

	getState (callback) {
		execFile("room", ["-t"], (error, stdout, stderr) => {
			if (!error && stdout) {
				const value = Number(stdout);

				if (isFinite(value)) {
					this.service
					.getCharacteristic(Characteristic.CurrentTemperature)
					.updateValue(value, null);
					
					callback(null, value);

					return value;
				}
			}

			callback(error, null);
			return error;
		});
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
				.setCharacteristic(Characteristic.Manufacturer, 'Unknown Manufacturer')
				.setCharacteristic(Characteristic.Model, 'Unknown Apple')
				.setCharacteristic(Characteristic.SerialNumber, serial || 'Undefined serial');

		this.service = new Service.LightSensor(this.name);
		this.service
				.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
				.on('get', this.getState.bind(this));
	}

	getState (callback) {
		const rawLightValues = Light.getAmbientLightValues();
		if (rawLightValues) {

			let rawValue;
			if (rawLightValues[0] == rawLightValues[1]) {
				rawValue = rawLightValues[0];
			} else {
				rawValue = (rawLightValues[0] + rawLightValues[1])/2;
			}

			if (isFinite(rawValue)) {
				const scaledValue = (rawValue/67092480)*100000;
				let value = Math.round(scaledValue/48);

				// Enforce minimum value
				if (value <= 0.0001)
					value = 0.0001;

				this.service
					.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
					.updateValue(value, null);

				callback(null, value);
				return value;
			}
		}

		callback(null, null);
		return null;
	}

	getServices () {
		return [this.informationService, this.service]
	}
}