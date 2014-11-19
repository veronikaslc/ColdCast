/**
 * Created by vikoltun on 14/11/2014.
 */

var express = require('express');
var request = require('request');
// import the modules necessary for scraping
var cheerio = require('cheerio');
//logging
var winston = require('winston');
//database
var mongojs= require('mongojs');

var db = mongojs('mydb');
db.dropDatabase();
db.on('ready',function() {
    console.log('database connected');
});

var weatherAPI = db.collection('weatherAPI');
var weatherScrap = db.collection('weatherScrap');

app = express();

app.use(express.static(__dirname+'/public'));

var API_key = '7efdf026c7705a541d3bdd32bb344712';

var result10API;
var result10scrapped;
var result = [];
var cities_file  = 'city_list.txt';
var cities = [];
var timer;

//logger setup
var logger = new (winston.Logger) ({
    transports: [
        new (winston.transports.Console),
        new (winston.transports.File) ({filename: 'debug.log'})
    ]
});

buildURL();
repeatCalls();

function repeatCalls() {
    timer = setInterval( getAIPdata, 10*60*1000);
}

// find everything
//weatherAPI.find(function(err, docs) {
    // docs is an array of all the documents in mycollection
//});


// ---ROUTONG---
app.get('/weather', function (req, resp) {
    weatherAPI.findOne({timestamp: {$gte: new Date( (new Date()) - 10*60*1000 )}},  function(err, doc){
        if (!doc) {
            var data = getAIPdata(function(doc){
                console.log('sending response json');
                resp.json(doc);
            });

        } else {
            console.log('found something');
            console.log(doc);
            resp.json(doc);
        }

    });
});

app.get('/weatherscrap', function (req, resp) {
    weatherScrap.findOne({timestamp: {$gte: new Date( (new Date()) - 10*60*1000 )}},  function(err, doc){
        if (!doc) {
            getScarappedData();
            resp.json(result10scrapped);
        } else {
            resp.json(doc);
        }

    });
});



//---HELPER FUNCTIONS---------------------------------


//---API based part---
function buildURL(){
    //reading canadian cities from the file of all cities
    var fs = require('fs');
    var array = fs.readFileSync(cities_file).toString().split("\n");
    for(var i in array) {
        var str = array[i].split("\t");
        if (str[4] == 'CA') {
            cities.push({id: str[0], name: str[1], lat: str[2], lon: str[3]});
        }
    }

//assembling  IDs to form the url for API call
    var id_list='';
    for (var j in cities) {
        id_list = id_list + ',' + cities[j].id;
    }
    id_list = id_list.substring(1, id_list.length);
//building URL
    real_url ='http://api.openweathermap.org/data/2.5/group?id=' + id_list +'&units=metric&APPID='+API_key;
//var test_url = 'http://api.openweathermap.org/data/2.5/group?id='+toronto_code+',1416034212&APPID='+API_key;
}

//sorting function for respond array from weather API
function compareAPI(a,b) {
    if (a.main.temp < b.main.temp)
        return -1;
    if (a.main.temp > b.main.temp)
        return 1;
    return 0;
}

function getAIPdata(callback){
    console.log('getting 10 cities');
    request(real_url, function(error, resp, body) {
        var doc = JSON.parse(body).list;
        doc.sort(compareAPI);
        var result10 = doc.slice(0, 10);

        for (var k in result10) {
            result.push({id: result10[k].id, name: result10[k].name, lat: result10[k].coord.lat, lon: result10[k].coord.lon, temp: result10[k].main.temp, timestamp: new Date()});
        }

        result10API = {timestamp: new Date(), data: result};
        console.log('got cities:');
        console.log(result10API);
//recording in database
        weatherAPI.insert(result10API, function(err, doc){
            if (err) {
                logger.info(err);
                if (callback) {
                    callback(null);
                }
            }
            else {
                logger.info('new database entry from API ' + doc);
                console.log(doc);
                if (callback) {
                    callback(doc);
                }
            }
        });

    });

}

//-----SCRAPPING part---

//scrapping helper function
function scrap(url, i){
    request(url, function(err, res, html) {
        // build the "DOM" object, representing the structure of the HTML page just fetched
        var $ = cheerio.load(html);
        //logger.log('info',html);
        var text = $(".wob_t").eq(0).text();
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

function getScarappedData(){
    for (var j in cities) {
        //timing scrapping for a second
        setTimeout(function () {
            scrap('https://www.google.ca/search?q=' + cities[j].name + '+canada+weather', j);
        }, 1000);
    }
    cities.sort(compareScrap);

    result10scrapped = {timestamp: new Date(), data: cities.slice(0, 10)};

    //recording in database
    weatherScrap.insert(result10scrapped, function(err, doc){
        if (err)
            logger.info(err);
        else
            logger.info('Database new entry scrapped ' + doc);
    });
}

// example of scrapping of single page:
/*request('https://www.google.ca/search?q=waterloo+canada+weather', function(err, res, html) {
    // build the "DOM" object, representing the structure of the HTML page just fetched
    var $ = cheerio.load(html);
    console.log($(".wob_t").eq(0).text());
});*/

app.listen(3000);

