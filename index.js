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

var cities_file  = 'city_list.txt';
var cities = [];
var lastAPIresult = [];
var scrapCitiesList;
var timerAPI, timerScrap;

//logger setup
var logger = new (winston.Logger) ({
    transports: [
        new (winston.transports.Console),
        new (winston.transports.File) ({filename: 'debug.log'})
    ]
});

console.log(3+5+'a'+'b');

buildURL();
repeatCalls();

function repeatCalls() {
    timerAPI = setInterval( getAIPdata, 10*60*1000);
    timerScrap = setInterval( getScarappedData, 10*60*1000);
}

// ---ROUTONG---
app.get('/weather', function (req, resp) {
    weatherAPI.findOne({timestamp: {$gte: new Date( (new Date()) - 10*60*1000 )}},  function(err, doc){
        if (err) {
            logger.info(err);
            var data = getAIPdata(function(doc){
                logger.info('weather API: sending response json');
                resp.json(doc);
            });
        }
        if (!doc) {
            var data = getAIPdata(function(doc){
                logger.info('weather API: sending response json');
                resp.json(doc);
            });
        } else {
            logger.info('found something');
            logger.info(doc);
            resp.json(doc);
        }

    });
});

app.get('/weatherscrap', function (req, resp) {
    weatherScrap.findOne({timestamp: {$gte: new Date( (new Date()) - 10*60*1000 )}},  function(err, doc){
        if (err) {
            logger.info(err);
            var data = getScarappedData(function(doc){
                logger.info('Scrapping: sending response json');
                resp.json(doc);
            });
        }
        if (!doc) {
            var data = getScarappedData(function(doc){
                logger.info('Scrapping: sending response json');
                resp.json(doc);
            });
        } else {
            resp.json(doc);
        }

    });
});

app.get('/weather/refresh', function (req, resp) {
    var data = getAIPdata(function(doc){
        logger.info('weather API: sending response json');
        resp.json(doc);
    });
});

app.get('/weatherscrap/refresh', function (req, resp) {
    var data = getScarappedData(function(doc){
        logger.info('Scrapping: sending response json');
        resp.json(doc);
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
    logger.info('weather API: getting 10 coldest cities');
    request(real_url, function(error, resp, body) {
        if (error) {
            logger.info(error);
        }
        var doc;
        try {
             doc = JSON.parse(body).list;
            doc.sort(compareAPI);
            var result10 = doc.slice(0, 10);
            var result = [];
            for (var k in result10) {
                result.push({id: result10[k].id, name: result10[k].name, lat: result10[k].coord.lat, lon: result10[k].coord.lon, temp: result10[k].main.temp, timestamp: new Date()});
            }

            lastAPIresult = result;

            var result10API = {timestamp: new Date(), data: result};
            logger.info('weather API: got cities:');
            logger.info(result10API);
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
                    if (callback) {
                        callback(doc);
                    }
                }
            });
        } catch(err) {
            logger.info(err);
            if (callback) {
                callback(null);
            }
        }

    });

}

//-----SCRAPPING part---

//scrapping helper function
function scrap(url, i){
    request(url, function(err, res, html) {
        if (err) {
            logger.info(err);
        }
        try {
            // build the "DOM" object, representing the structure of the HTML page just fetched
            var $ = cheerio.load(html);
            var text = $(".wob_t").eq(0).text();
            scrapCitiesList[i].scraptemp = text.substring(0, text.length-2);
            logger.info('scrapping city: '+i+' '+scrapCitiesList[i].name +' '+scrapCitiesList[i].scraptemp);
        }  catch(err) {
            logger.info(err);
            scrapCitiesList[i].scraptemp = null;
        }
    });
}

//sorting function for scrapping array
function compareScrap(a,b) {
    if (parseInt(a.scraptemp) < parseInt(b.scraptemp))
        return -1;
    if (parseInt(a.scraptemp) > parseInt(b.scraptemp))
        return 1;
    return 0;
}

function getScarappedData(callback){
    logger.info('scrapping: getting 10 coldest cities');

        if (lastAPIresult.length >0) {
            scrapCitiesList = lastAPIresult;
        }else {
            scrapCitiesList = cities.slice(0, 10);
        }

        //timing scrapping for 10 seconds
        var j=0;
        var timer2 = setInterval(function () {

            if ( j == 10 ) {

                clearTimeout(timer2);

                scrapCitiesList.sort(compareScrap);

                var result10scrapped = {timestamp: new Date(), data: scrapCitiesList};
                logger.info('Scrapping: got cities:');
                logger.info(result10scrapped);
                //recording in database
                weatherScrap.insert(result10scrapped, function(err, doc){
                    if (err){
                        logger.info(err);
                        if (callback) {
                            callback(null);
                        }
                    }
                    else{
                        logger.info('new database entry from scrapping ' + doc);
                        if (callback) {
                            callback(doc);
                        }
                    }
                });
            }
            else {
                scrap('https://www.google.ca/search?q=' + scrapCitiesList[j].name + '+canada+weather', j);
                j++;
            }

        }, 3000);
}

// scrapping of single page:
/*request('https://www.google.ca/search?q=waterloo+canada+weather', function(err, res, html) {
    // build the "DOM" object, representing the structure of the HTML page just fetched
    var $ = cheerio.load(html);
    console.log($(".wob_t").eq(0).text());
});*/

app.listen(3000);

