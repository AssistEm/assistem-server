angular.module('caretakerApp')
	.controller('HomeCtrl',
		['$scope', '$http', '$window', 'fileReader',
		function($scope, $http, $window, fileReader) {

		$scope.message = '';
		$scope.submit = function() {
			console.log($scope.user);
			$http
			.post('api/user',{
				user: $scope.user,
				community: {
					name: $scope.community,
					privacy: false
				},
				profile_picture: $scope.profile_picture
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

		$scope.doUpload = function () {
		    upload({
		      url: '/upload',
		      method: 'POST',
		      data: {
		        anint: 123,
		        aBlob: Blob([1,2,3]), // Only works in newer browsers
		        aFile: $scope.myFile, // a jqLite type="file" element, upload() will extract all the files from the input and put them into the FormData object before sending.
		      }
		    }).then(
		      function (response) {
		        console.log(response.data); // will output whatever you choose to return from the server on a successful upload
		      },
		      function (response) {
		          console.error(response); //  Will return if status code is above 200 and lower than 300, same as $http
		      }
		    );
		 }

		 $scope.getFile = function () {
	        $scope.progress = 0;
	        fileReader.readAsDataUrl($scope.file, $scope)
	                      .then(function(result) {
	                      	  $scope.profile_picture = result;
	                          $scope.imageSrc = result;
	                      });
	    };
	 
	    $scope.$on("fileProgress", function(e, progress) {
	        $scope.progress = progress.loaded / progress.total;
	    });

	}])
	.directive("ngFileSelect",function(){

		return {
		    link: function($scope,el){
		      
		      el.bind("change", function(e){
		      
		        $scope.file = (e.srcElement || e.target).files[0];
		        $scope.getFile();
		      })
		      
		    }
    
		}
	});
  
  
