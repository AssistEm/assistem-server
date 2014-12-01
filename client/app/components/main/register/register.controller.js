angular.module('caretakerApp')
	.controller('RegisterCtrl', function($scope) {
		$scope.form = {};

		$scope.submit = function(form) {
			console.log(form);
		};
	});
