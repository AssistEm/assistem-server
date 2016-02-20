angular.module('caretakerApp')
	.controller('HomeCtrl',
		['$scope', '$http', '$window',
		function($scope, $http, $window) {
		$scope.message = '';
		$scope.submit = function() {
			console.log($scope.user);
			$http
			.post('api/user',{
				user: $scope.user,
				community: {
					name: $scope.community,
					privacy: false
				}
			})
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
