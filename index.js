const serialNumber = require('serial-number');
const execFile = require("child_process").execFile;
const os = require("os");

serialNumber.preferUUID = true;

let Service, Characteristic, serial;

serialNumber((err, value) => {
	if (!err) {
		this.serial = value;
	}
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
		this.units = 'C';

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
			if (!error) {
				const value = Number(stdout);

				this.service
					.getCharacteristic(Characteristic.CurrentTemperature)
					.updateValue(value, null);
					
				callback(null, value);

				return value;

			} else {
				callback(error, null);
				return error;
			}
		});
	}

	getServices () {
		return [this.informationService, this.service]
	}
}

class AmbientLightAccessory {

	constructor (log, config) {
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
		execFile("room", ["-l"], (error, stdout, stderr) => {
			if (!error) {
				const rawValue = Number(stdout);
				const scaledValue = (rawValue/(2^26))*100000;
				const value = Math.round(scaledValue/15);

				this.service
					.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
					.updateValue(value, null);

				callback(null, value);

			} else {
				callback(error, null);
			}
		});
	}

	getServices () {
		return [this.informationService, this.service]
	}
}