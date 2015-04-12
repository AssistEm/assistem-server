angular.module('caretakerApp')
	.controller('HomeCtrl',
		['$scope', '$http', '$window',
		function($scope, $http, $window) {
		$scope.message = '';
		$scope.submit = function() {
			$http
			.post('api/user', $scope.user)
			.success(function(data, status, headers, config) {
				console.log(data);
				$window.sessionStorage.token = data.token;
				$scope.message = 'Welcome';
			})
			.error(function(data, status, headers, config) {
				console.log(data);
				delete $window.sessionStorage.token;
				$scope.message = 'Error: Invalid user or password';
			});
		};
	}]);
