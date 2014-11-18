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

for (var j in cities){
    //assembling  IDs to form the url for API call
    id_list = id_list + ',' + cities[j].id;
    //timing scrapping for a second

    setTimeout(function() {
        scrap('https://www.google.ca/search?q='+ cities[j].name+'+canada+weather', j);
    }, 1000);

}

id_list = id_list.substring(1, id_list.length);

//scrapping helper function
function scrap(url, i){
    request(url, function(err, res, html) {
        // build the "DOM" object, representing the structure of the HTML page just fetched
        var $ = cheerio.load(html);
        console.log(html);
        //console.log("in a lop");
        var text = $(".wob_t").eq(0).text();
        console.log(text);
        cities[i].scraptemp = text.substring(0, text.length-2);
    });
}

//sorting function for scrapping array
function compareScrap(a,b) {
    if (a.scraptemp < b.scraptemp)
        return -1;
    if (a.scraptemp > b.scraptemp)
        return 1;
    return 0;
}


//sorting function for respond array from weather API
function compareAPI(a,b) {
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
    doc.sort(compareAPI);
    var result10 = doc.slice(0, 10);
    for (var k in result10) {
        result.push({id: result10[k].id, name: result10[k].name, lat: result10[k].coord.lat, lon: result10[k].coord.lon, temp: result10[k].main.temp});
    }
});

app.get('/weather', function (req, resp) {
    resp.json(result);
});

cities.sort(compareScrap);
var result10scrap = cities.slice(0, 10);

app.get('/weatherscrap', function (req, resp) {
    resp.json(result10scrap);
});

//-----SCRAPPING---

// fetch the whole HTML of the page
/*request('https://www.google.ca/search?q=waterloo+canada+weather', function(err, res, html) {
    // build the "DOM" object, representing the structure of the HTML page just fetched
    var $ = cheerio.load(html);
    console.log($(".wob_t").eq(0).text());
});*/





app.listen(3000);

