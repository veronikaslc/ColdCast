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
    function initialize() {

        var mapOptions = {
            center: { lat: 61.614841, lng: -101.776904},
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
            vi = i;
            markers[i].addListener('click', function () {
                infowindow.setContent($scope.cities[vi].name + ' Current Temp: ' + $scope.cities[vi].temp);
                infowindow.open(map, this);
            });
        }

    }

    //google.maps.event.addDomListener(window, 'load', initialize);

    //Do not send requests more then 1 time per 10 minutes from one device. Normally the weather is not changing so frequently
    function repeatCalls() {
        nIntervId = window.setInterval(onGetList, 10*60*1000);
    }

    function renderServicesgetAPI(response) {
        $scope.dataAPI = JSON.stringify(response.data);
        $scope.cities = response.data;
        initialize();
    }

    function renderServicesgetScrap(response) {
        $scope.dataScrap = JSON.stringify(response.data);
        $scope.citiesScrap = response.data;
    }

    $scope.getListAPI = function() {
        $http.get('/weather')
            .success(renderServicesgetAPI);
    };

    $scope.getListScrap = function(){
        $http.get('/weatherscrap')
            .success(renderServicesgetScrap);
    };

    function onGetList() {
        $scope.getListAPI();
        $scope.getListScrap();
    }

    onGetList();

    repeatCalls();
   // [{"id":5964304,"name":"Grande Cache","lat":53.88,"lon":-119.14,"temp":-30.77},{"id":5947708,"name":"Elkford","lat":50.05,"lon":-114.89,"temp":-23.77},{"id":5962582,"name":"Golden","lat":51.3,"lon":-116.97,"temp":-20},{"id":5946820,"name":"Edson","lat":53.58,"lon":-116.44,"temp":-19},{"id":6050066,"name":"La Ronge","lat":55.1,"lon":-105.28,"temp":-18.67},{"id":6111529,"name":"Portage la Prairie","lat":49.97,"lon":-98.29,"temp":-16.52},{"id":6078447,"name":"Morden","lat":49.19,"lon":-98.1,"temp":-15.61},{"id":6053154,"name":"Lethbridge","lat":49.7,"lon":-112.82,"temp":-15},{"id":5887916,"name":"Athabasca","lat":54.72,"lon":-113.29,"temp":-15}]
}]);


