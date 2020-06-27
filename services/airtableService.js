const Airtable = require('airtable');

class Base {

	constructor(apiKey, baseId) {
		this.apiKey = apiKey;
		this.baseId = baseId;
		this.base = new Airtable({apiKey: this.apiKey}).base(this.baseId);
	}

	getRecordByField(table, field, value) {

	}

	createRecord(table, fields) {
		return new Promise(function(resolve, reject){
			this.base(table).create([
			  {
			    "fields": fields
			  }
			], function(err, records) {
			  if (err) {
			    reject(err)
			    return;
			  }

			  resolve(records)
			});
		}.bind(this))
	}
}

class AirtableService {

	sendData(data, config) {
		let base = new Base(config.apiKey, config.base);

		let tableId = config.fieldsMappings[data.table].table

		let mappings = config.fieldsMappings
		let fields = {}

		// Convert to airtable IDS
		for (var key in data.fields) {
			fields[mappings[data.table].fields[key]] = data.fields[key]
		}

		return base.createRecord(tableId, fields);
	}
}


module.exports = AirtableService