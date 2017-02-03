/* dorado theme */
var gulp		= require('gulp');
var uglify		= require('gulp-uglify');
var rename		= require('gulp-rename');
var rigger		= require('gulp-rigger');
var del			= require('del');
var newer		= require('gulp-newer');
var prefix		= require('gulp-autoprefixer');
var less		= require('gulp-less');
var cleanCSS	= require('gulp-clean-css');

gulp.task('clean', function(){ return del(['dist/*']); });

gulp.task('js', function() {
	return gulp.src('src/mk-slidemenu.js')
		//.pipe(newer('dist/jquery.mk-slidemenu.min.js'))
		.pipe(rigger())
		.pipe(gulp.dest('dist/'))
		.pipe(uglify())
		.pipe(rename('mk-slidemenu.min.js'))
		.pipe(gulp.dest('dist/'));
});
gulp.task('styles', function() {
	return gulp.src(
			'src/mk-slidemenu.less'
		//	,{since:gulp.lastRun('styles')}
		)
		//.pipe(newer('dist/mk-slidemenu.css'))
		.pipe(less())
		.pipe(prefix())
		.pipe(gulp.dest('dist/'))
		.pipe(cleanCSS())
		.pipe(rename('mk-slidemenu.min.css'))
		.pipe(gulp.dest('dist/'));
});

gulp.task('watch', function () {
	gulp.watch(['src/*.js','src/js/*.js',],gulp.parallel( 'js' ));
	gulp.watch(['src/*.less','src/less/*.less'],gulp.parallel( 'styles' ));
});

gulp.task('build', gulp.parallel( 'js','styles' ));
gulp.task('clean_build', gulp.series('clean','build'));