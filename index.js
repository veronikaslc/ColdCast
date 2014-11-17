/**
 * Created by vikoltun on 14/11/2014.
 */

var express = require('express');
var request = require('request');
// import the modules necessary for scraping
var cheerio = require('cheerio');
//logging
var winston = require('winston');

app = express();

app.use(express.static(__dirname+'/public'));


var toronto_code = 6167865;

var API_key = '7efdf026c7705a541d3bdd32bb344712';

var result = [];
var cities_file  = 'city_list.txt';
var cities = [];

var logger = new (winston.Logger) ({
    transports: [
        new (winston.transports.Console),
        new (winston.transports.File) ({filename: 'debug.log'})
    ]
});

//---API based---

//reading canadian cities from the file of all cities
var fs = require('fs');
var array = fs.readFileSync(cities_file).toString().split("\n");
for(var i in array) {
    var str = array[i].split("\t");
    if (str[4] == 'CA') {
        cities.push({id: str[0], name: str[1], lat: str[2], lon: str[3]});
    }
}

var id_list='';
//concatination cities IDs to form the url
for (j in cities){
    id_list = id_list + ',' + cities[j].id;
}

id_list = id_list.substring(1, id_list.length);

//sorting function for respond array
function compare(a,b) {
    if (a.main.temp < b.main.temp)
        return -1;
    if (a.main.temp > b.main.temp)
        return 1;
    return 0;
}

//building URL
var real_url ='http://api.openweathermap.org/data/2.5/group?id=' + id_list +'&units=metric&APPID='+API_key;
//var test_url = 'http://api.openweathermap.org/data/2.5/group?id='+toronto_code+',1416034212&APPID='+API_key;

request(real_url, function(error, resp, body) {
    var doc = JSON.parse(body).list;
    doc.sort(compare);
    var result10 = doc.slice(0, 10);

    for (var k in result10) {
        result.push({id: result10[k].id, name: result10[k].name, lat: result10[k].coord.lat, lon: result10[k].coord.lon, temp: result10[k].main.temp});
    }

    logger.log('infoNEW',result);
});

app.get('/weather', function (req, resp) {
    resp.json(result);
});

//-----SCRAPPING---

// fetch the whole HTML of the page
request('http://www.weather.com/search/enhancedlocalsearch?where=Toronto%2C+Canada', function(err, res, html) {
    // build the "DOM" object, representing the structure of the HTML page just fetched
    var $ = cheerio.load(html);
    console.log($(".wx-temp").eq(0).text());
});

app.listen(3000);

