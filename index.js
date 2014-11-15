/**
 * Created by vikoltun on 14/11/2014.
 */

var express = require('express');

app = express();

app.use(express.static(__dirname+'/public'));

var request = require('request');

var toronto_code = 6167865;

var API_key = '7efdf026c7705a541d3bdd32bb344712';

var doc;

var cities_file  = 'city_list.txt';
var cities = [];

var fs = require('fs');
var array = fs.readFileSync(cities_file).toString().split("\n");
for(i in array) {
    var str = array[i].split("\t");
    if (str[4] == 'CA') {
        cities.push({id: str[0], name: str[1], lat: str[2], lon: str[3]});
    }
}

console.log(cities.length);
//var test_url = 'http://api.openweathermap.org/data/2.5/weather?id='+toronto_code+'&APPID='+API_key;

var id_list='';

for (j in cities){
    id_list = id_list + ',' + cities[j].id;
}

id_list = id_list.substring(1, id_list.length);
//console.log(id_list);

var real_url ='http://api.openweathermap.org/data/2.5/group?id=' + id_list +'&units=metric&APPID='+API_key;

request(real_url, function(error, resp, body) {
   doc = body;
    console.log(body);
});

app.get('/getweather', function (req, resp) {
    resp.json(doc);
});




app.listen(3000);