const serialNumber = require('serial-number');
const execFile = require("child_process").execFile;
const os = require("os");

serialNumber.preferUUID = true;

let Service, Characteristic;

module.exports = homebridge => {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory('homebridge-mac-temperature-light', 'MacTemperatureAmbientLight', DeviceStateAccessory);
}

class DeviceStateAccessory {

	constructor (log, config) {
		this.log = log;
		this.config = config;
		this.manufacturer = 'Unknown Manufacturer';
		this.model = 'Unknown Apple';
		this.serial = 'Undefined serial'
		this.service = 'Switch';
		this.units = 'C';

		serialNumber((err, value) => {
			if (!err) {
				this.serial = value;
			}
		});
	}

	getState (callback) {
		execFile("room", ["-t"], (error, stdout, stderr) => {
			if (!error) {
				console.log(stdout);	
			}
		});

		const value = 21.0;

		if (value) {
			this.temperatureService
				.getCharacteristic(Characteristic.CurrentTemperature).updateValue(value, null);
				callback(null, value);
			return value;

		} else {
			callback(error, null);
			return error;
		}
	}

	getServices () {
		const informationService = new Service.AccessoryInformation();
		
		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial);

		const temperatureService = new Service.TemperatureSensor(this.config.name);

		temperatureService
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getState.bind(this));

		this.temperatureService = temperatureService;

		return [temperatureService];
	}
}