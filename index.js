const serialNumber = require('serial-number');
const execFile = require("child_process").execFile;
const os = require("os");

serialNumber.preferUUID = true;

let Service, Characteristic, serialNumber;

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
		this.manufacturer = 'Unknown Manufacturer';
		this.model = 'Unknown Apple';
		this.serial = 'Undefined serial'
		this.units = 'C';

		this.informationService = new Service.AccessoryInformation();
		this.informationService
				.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
				.setCharacteristic(Characteristic.Model, this.model)
				.setCharacteristic(Characteristic.SerialNumber, this.serial);

		this.service = new Service.TemperatureSensor(this.config.name);
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

	getServices () => [informationService, service];
}

class AmbientLightAccessory {

	constructor (log, config) {
		this.config = config;
		this.manufacturer = 'Unknown Manufacturer';
		this.model = 'Unknown Apple';
		this.serial = 'Undefined serial';

		this.informationService = new Service.AccessoryInformation();
		this.informationService
				.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
				.setCharacteristic(Characteristic.Model, this.model)
				.setCharacteristic(Characteristic.SerialNumber, this.serial);

		this.service = new Service.LightSensor(this.config.name);
		this.service
				.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
				.on('get', this.getState.bind(this));
	}

	getState (callback) {
		execFile("room", ["-l"], (error, stdout, stderr) => {
			if (!error) {
				// Convert from percentage to 
				const value = ((Number(stdout)/100)*(2^26))/(2^26);

				this.service
					.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
					.updateValue(value, null);

				callback(null, value);

			} else {
				callback(error, null);
			}
		});
	}

	getServices () => [this.informationService, this.service]
}