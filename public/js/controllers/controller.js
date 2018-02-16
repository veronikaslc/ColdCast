/**
 * Created by vikoltun on 15/11/2014.
 */
'use strict';
var myApp = angular.module('myApp',[]);

myApp.controller('MainController', ['$scope', '$http', function($scope, $http) {

    var nIntervId;
    var map;
    var markers =[];
    var vi;

    //Google maps initialization
    function initialize() {

        var mapOptions = {
            center: { lat: 60.614841, lng: -101.776904},
            zoom: 4
        };
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

        var infowindow = new google.maps.InfoWindow();

        for (var j=0; j< $scope.cities.length; j++) {
             markers[j] = new google.maps.Marker({
                position: new google.maps.LatLng($scope.cities[j].lat, $scope.cities[j].lon) ,
                map: map,
                title: 'City: ' + $scope.cities[j].name + ' Temp: ' + $scope.cities[j].temp
            });
        }

        for (var i=0; i< $scope.cities.length; i++) {
            (function(i) {
                markers[i].addListener('click', function () {
                    infowindow.setContent($scope.cities[i].name + ' Temp: ' + $scope.cities[i].temp);
                    infowindow.open(map, this);
                });
            }(i))
        }

    }

    //Do not send requests more then 1 time per 10 minutes from one device. Normally the weather is not changing so frequently
    function repeatCalls() {
        nIntervId = window.setInterval(onGetList, 10*60*1000);
    }

    function renderServicesgetAPI(response) {
        $scope.dataAPI = JSON.stringify(response);
        $scope.cities = response;
        initialize();
    }

    function renderServicesgetScrap(response) {
        $scope.dataScrap = JSON.stringify(response.data);
    }

    $scope.getListAPI = function() {
        $http.get('/weather')
            .success(renderServicesgetAPI);
    };

    $scope.getListAPIrefresh = function() {
        $http.get('/weather/refresh')
            .success(renderServicesgetAPI);
    };

    $scope.getListScrapRefresh = function(){
        $http.get('/weatherscrap/refresh')
            .success(renderServicesgetAPI);
    };

    function onGetList() {
        $scope.getListAPI();
    }

    onGetList();

    repeatCalls();

}]);


