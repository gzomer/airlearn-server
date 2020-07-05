const DB = require('../db.js')
const crypto = require('crypto')


class Publish {

	async publish(data) {
		let hasCreated = false
		let school = null;

		let existingDomain =  await DB.models.School.findOne({
			domain: data.domain
		})

		if (typeof data.apiKey != 'undefined' && data.apiKey != null && data.apiKey != '') {
			school = await DB.models.School.findOne({
				apiKey: data.apiKey
			})

			if (existingDomain && existingDomain.id != school.id) {
				return {
					success: false,
					message: 'This domain is already in use.'
				}
			}

			if (school == null) {
				return {
					success: false,
					message: 'Invalid school'
				}
			}
		} else {
			if (existingDomain) {
				return {
					success: false,
					message: 'This domain is already in use.'
				}
			}
			hasCreated = true
			school = await this.createEmptySchool()
		}


		school.name = data.name
		school.description = data.description
		// school.logo = data.logo
		school.theme = data.theme
		school.domain = data.domain
		school.airtable = data.airtable
		school.fieldsMapping  = data.fieldsMapping
		school.data = data.data

		school.markModified('data');
		school.markModified('fieldsMapping');
		school.markModified('airtable');

		await school.save()

		if (hasCreated) {
			return {
				success: true,
				apiKey: school.apiKey
			}
		}
		return {
			success: true
		}
	}

	async createEmptySchool() {

		const apiKey = crypto.randomBytes(32).toString('hex');

		let school = await DB.models.School.create({
			apiKey: apiKey
		})

		return school
	}
}


module.exports = Publish