angular.module('caretakerApp')

.config(function($stateProvider) {
	$stateProvider
		.state('home', {
			url: '/',
			templateUrl: '/app/components/main/home/home.html'
		})
		.state('register', {
			url: '/register',
			templateUrl: '/app/components/main/register/register.html',
			controller: 'RegisterCtrl'
		})
		.state('login', {
			url: '/login',
			templateUrl: '/app/components/main/login/login.html'
		});
});
