angular.module('caretakerApp', ['ui.router', 'ngResource', 'lr.upload'])

.config(function($locationProvider, $urlRouterProvider, $httpProvider) {
	$urlRouterProvider.otherwise('/');
	$locationProvider.html5Mode(true);
	$httpProvider.interceptors.push('AuthInterceptor');
})

.factory('AuthInterceptor', function($window, $location, $q) {
	return {
		request: function(config) {
			config.headers = config.headers || {};
			if ($window.localStorage.getItem('token')) {
				config.headers.Authorization = 'Bearer ' + $window.localStorage.getItem('token');
			}
			return config;
		},
		responseError: function(response) {
			if (response.status === 401) {
				$location.path('/login');
				$localStorage.removeItem('token');
				return $q.reject(response);
			}
			return $q.reject(response);
		}
	};
});
