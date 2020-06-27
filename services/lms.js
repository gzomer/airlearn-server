const DB = require('../db.js')
const fs = require('fs')
const AirtableService = require('./airtableService.js')

class LMS {

	constructor(schoolDomain) {
		this.schoolDomain = schoolDomain
	}

	async init() {
		this.school = await DB.models.School.findOne({
			domain: this.schoolDomain
		})

		if (this.school == null) {
			throw new Error('Invalid school')
		}
		return this
	}

	getStudentByEmail(email) {
		if (email == null) {
			return null
		}

		let students = this.school.data.Students.filter(item => item.Email == email)
		if (students == null || students.length == 0) {
			return null
		}

		return students[0]
	}

	getCoursesByIds(ids) {
		return this.school.data.Courses.filter(item => ids.indexOf(item.ID) != -1)
	}

	getLessonsByIds(ids) {
		return this.school.data.Lessons.filter(item => ids.indexOf(item.ID) != -1)
	}

	getCoursesBySlug(slug) {
		let courses = this.school.data.Courses.filter(item => slug == item.Slug)
		if (!courses || !courses.length) {
			return null
		}
		return courses[0]
	}

	getLessonBySlug(course, lessonSlug) {
		let lessons = this.getLessonsByIds(course.Lessons.map(item => item.id))
						  .filter(item => item.Slug == lessonSlug)

		if (!lessons || !lessons.length) {
			return null
		}
		return lessons[0]
	}

	isEnrolled(course, user) {
		return true;
	}

	getLesson(courseSlug, lessonSlug, user) {
		let course = this.getCoursesBySlug(courseSlug)

		if (!this.isEnrolled(course, user)) {
			return null
		}

		if (course == null) {
			return null
		}

		return this.getLessonBySlug(course, lessonSlug)
	}

	getCourseLessons(slug, user) {
		let course = this.getCoursesBySlug(slug)
		if (course == null) {
			return []
		}
		if (!this.isEnrolled(course, user)) {
			return null
		}
		return this.getLessonsByIds(course.Lessons.map(item => item.id))
	}

	getCoursesByUser(user) {
		let student = this.getStudentByEmail(user.username)

		if (student == null) {
			return []
		}

		return this.getCoursesByIds(student.Courses.map(item => item.id))
	}


	getSubmittedAssignment(lesson, user) {
		let student = this.getStudentByEmail(user.username)

		let fileName = `${lesson.ID}-${student.ID}`

		let assignments = fs.readdirSync('./public/uploads/lessons/').filter(file => file.indexOf(fileName) != -1)

		if (assignments.length > 0 ) {
			return '/uploads/lessons/' + assignments[0]
		}
		return null
	}

	sendAssignment(assignmentURL, student, lesson) {
		let airtableService = new AirtableService()

		return airtableService.sendData({
			'table': 'Assignments',
			'fields' : {
				'Student' : [student.ID],
				'Lesson' : [lesson.ID],
				'Attachments' : [
					{
            			"url": "https://dl.airtable.com/.attachments/76c53bae4374ce702a13f7a61c04f9b2/f8f3e226/Improving_L2_researchers_writingfluency.pdf"
          			}
        		],
			}
		}, this.school.airtable)
	}
}

module.exports = LMS