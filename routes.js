const ensureLogin = require('connect-ensure-login')
const router = require('express').Router()
const Publish = require('./services/publish')
const LMS = require('./services/lms')
const publish = new Publish()

router.use(function(req, res, next) {
	if (req.subdomains && req.subdomains.length) {
		req.schoolDomain = req.subdomains[0]
	}
	next()
})

router.get('/courses',
	ensureLogin.ensureLoggedIn(),
	wrapAsync(async (req, res) => {
		let lms = await new LMS(req.schoolDomain).init()
		let data = lms.getCoursesByUser(req.user)

		res.render('pagelist', {
			school: lms.school,
			page: {
				title: 'Welcome, ' + req.user.name,
				description: 'Here are your courses'
			},
			breadcrumbs: [
			],
			items: data.map(item=>{
				return {
					url : '/courses/' + item.Slug,
					name: item.Name,
					//description: item.Description
				}
			})
		})
	}))

router.get('/courses/:course',
	ensureLogin.ensureLoggedIn(),
	wrapAsync(async (req, res) => {
		let school = 'domain'

		let lms = await new LMS(req.schoolDomain).init()
		let lessons = lms.getCourseLessons(req.params.course, req.user)
		let course = lms.getCoursesBySlug(req.params.course)

		res.render('pagelist', {
			school: lms.school,
			page: {
				title: course.Name,
				description: course.Description
			},
			breadcrumbs: [
				{
					name: 'Home',
					url :'/courses'
				},
				{
					name : course.Name
				}
			],
			items: lessons.map(item=>{
				return {
					url : '/courses/' + course.Slug + '/' + item.Slug ,
					name: item.Name,
					description: item.Description
				}
			})
		})
	}))

router.get('/courses/:course/:lesson',
	ensureLogin.ensureLoggedIn(),
	wrapAsync(async (req, res) => {
		let lms = await new LMS(req.schoolDomain).init()
		let lesson = lms.getLesson(req.params.course, req.params.lesson, req.user)
		let course = lms.getCoursesBySlug(req.params.course)
		let submittedAssignment = lms.getSubmittedAssignment(lesson, req.user)

		let attachments = lesson.Attachments

		function getYoutubeId(url) {
		    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
		    const match = url.match(regExp);

		    return (match && match[2].length === 11)
		      ? match[2]
		      : null;
		}

		if (lesson.VideoURL ) {
			if (lesson.VideoURL.indexOf('youtube') != -1) {
				let youtubeId = getYoutubeId(lesson.VideoURL);
				lesson.VideoURL = 'https://www.youtube.com/embed/' + youtubeId
			}
		}

		res.render('lesson', {
			school: lms.school,
			page: {
				title: lesson.Name,
				description: lesson.Description
			},
			uploadUrl : '/upload/' + course.Slug + '/' + lesson.Slug,
			submittedAssignment: submittedAssignment,
			breadcrumbs: [
				{
					name: 'Home',
					url :'/courses'
				},
				{
					name : course.Name,
					url : '/courses/' + course.Slug
				},
				{
					name : lesson.Name
				}
			],
			lesson: lesson,
		})
	}))


router.post('/upload/:course/:lesson', wrapAsync(async function(req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.redirect(`/courses/${req.params.course}/${req.params.lesson}`)
  }

  let lms = await new LMS(req.schoolDomain).init()
  let lesson = lms.getLesson(req.params.course, req.params.lesson, req.user)
  let student = lms.getStudentByEmail(req.user.username)

  let sampleFile = req.files.assignment;

  let extension = req.files.assignment.name.split('.').reverse()[0]

  fileName = `${lesson.ID}-${student.ID}.${extension}`

  sampleFile.mv(`./public/uploads/lessons/${fileName}`, async function(err) {
    if (err) {
      return res.status(500).send(err);
    }

    let publicURL = `https://www.airlearn.me/public/uploads/lessons/${fileName}`;

  	try {
  		await lms.sendAssignment(publicURL, student, lesson)
  	} catch (e) {
  		return res.status(500).send(err);
  	}
    res.redirect(`/courses/${req.params.course}/${req.params.lesson}`)
  });
}));


router.post('/publish', wrapAsync(async (req, res) => {
	let data = await publish.publish(req.body)
	res.json(data)
}))

router.post('/create-school', wrapAsync(async(req, res) => {
	const data = await publish.createEmptySchool()
	res.json(data)
}))

function wrapAsync(fn) {
  return function(req, res, next) {
    // Make sure to `.catch()` any errors and pass them along to the `next()`
    // middleware in the chain, in this case the error handler.
    fn(req, res, next).catch(next);
  };
}

module.exports = router