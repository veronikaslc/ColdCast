/**
 * Created by vikoltun on 15/11/2014.
 */
'use strict';
describe('Weather controller Test', function (){
    var $scope, $httpBackend, $rootScope, CreateController;

    // Load the module with MainController
        beforeEach(module('myApp'));

    beforeEach(inject(function($injector) {

        // Set up the mock http service responses
        $httpBackend = $injector.get('$httpBackend');
        // backend definition common for all tests

        $httpBackend.whenGET(/.*\/weather/).respond(200);


        // Get hold of a scope (i.e. the root scope)
        $rootScope = $injector.get('$rootScope');

        $scope = $rootScope.$new();

        // The $controller service is used to create instances of controllers
        var $controller = $injector.get('$controller');

        CreateController = function(name) {
            return $controller(name, {$rootScope: $rootScope, $scope: $scope });
        };
    }));

    it('should verify the length of the city list', function() {
        CreateController('MainController');
        $httpBackend.flush();
        expect($scope.cities.length).toBe(10);
    });

    });
