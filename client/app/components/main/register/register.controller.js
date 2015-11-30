angular.module('caretakerApp')
	.controller('RegisterCtrl', ['$scope', '$resource', '$state', function($scope, $resource, $state) {
		// TODO: Refactor as a service, since more controllers will need to consume API
		var User = $resource('/api/user/:id');

		$scope.submit = function(form) {
			var user = new User(form);
			console.log(user);
			user.$save(function() {
				$state.go('home');
			});
		};
	}]);
