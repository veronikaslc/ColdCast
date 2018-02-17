/**
 * Created by vikoltun on 14/11/2014.
 */

var express = require('express');
var request = require('request');
// import the modules necessary for scraping
var cheerio = require('cheerio');
//logging
var winston = require('winston');
var async = require('async');

//database
// this part is for OpenShift deployment
var morgan  = require('morgan');
var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

//var mongojs= require('mongojs');
//var db = mongojs('mydb');
db.dropDatabase();
db.on('ready', function() {
    console.log('database connected');
});
var weatherAPI = db.collection('weatherAPI');
db.weatherAPI.createIndex( { "id": 1 }, { unique: true } );

app = express();
// express.static middleware in an Express app:
// Serve static content for the app from the “public” directory in the application directory
app.use(express.static(__dirname+'/public'));
// log all request in the Apache combined format to STDOUT
app.use(morgan('combined'));

var API_key = '2d37b577474d2e7f46d8f8f0f324239d';

var cities_file  = 'city.list.json';
var cities = [];
var lastAPIresult = [];
var scrapCitiesList;
var timerAPI, timerScrap;
var calls_number = 0;

//logger setup
var logger = new (winston.Logger) ({
    transports: [
        new (winston.transports.Console),
        new (winston.transports.File) ({filename: 'debug.log'})
    ]
});

//console.log(3+5+'a'+'b');

buildCitiesArray();
repeatCalls();

function repeatCalls() {
    timerAPI = setInterval( buildDBfromAPI, 10*600*1000);
}

// ---ROUTONG---
app.get('/weather', function (req, resp) {
	weatherAPI.find().sort({'temp':1}).limit(10).toArray(function(err, items) {
		if (err || !items) {
            logger.info(err);
        } else {
            logger.info('found something, sending response: ');
            logger.info(items);
			lastAPIresult = items;
            resp.json(items);
			
        }
	});
});

app.get('/weather/refresh', function (req, resp) {
    var data = buildDBfromAPI( function() {
        logger.info('weather API: sending response json');
        weatherAPI.find().sort({'temp':1}).limit(10).toArray(function(err, items) {
		if (err || !items) {
            logger.info(err);
        } else {
            logger.info('found something, sending response: ');
            logger.info(items);
			lastAPIresult = items;
            resp.json(items);
			
        }
	});
    });
});

app.get('/weatherscrap/refresh', function (req, resp) {
    getScarappedData(function(data) {
        logger.info('weather API: sending response json');
        resp.json(data);
	})
});

//---HELPER FUNCTIONS---------------------------------


//---API based part---
//var test_url = 'http://api.openweathermap.org/data/2.5/group?id=707860&units=metric&APPID='+API_key;
function buildCitiesArray(){
	var urls = [];
    //reading canadian cities from the file of all cities
	logger.info('reading canadian cities from the file of all cities');
    var fs = require('fs');

	fs.readFile('canada_cities.json', 'utf8', function readFileCallback(err, data){
		if (err){
			console.log(err);
			var array = JSON.parse(fs.readFileSync(cities_file, 'utf8'));
			for (var i in array) {
				var city = array[i];
				if (city.country == 'CA') {
					city.url ='http://api.openweathermap.org/data/2.5/group?id=' + city.id +'&units=metric&APPID='+API_key;
					cities.push(city);
				}
			}
			json = JSON.stringify(cities);
			fs.writeFile('canada_cities.json', json, 'utf8');
			logger.info('file with canadian cities created,total cities: ' + cities.length);
			buildDBfromAPI( function() {getScarappedData();});
		} else {
			cities = JSON.parse(data);
			logger.info('file with canadian cities exisit,total cities: ' + cities.length);
			buildDBfromAPI( function() {getScarappedData();});
		}
	});

    //assembling  IDs to form the url for API call
    logger.info('assembling  IDs to form the url for API call, total Canadian cities:' + cities.length); 
}

function buildDBfromAPI(callback) {
	logger.info('Building / updating DB for all canadian cities');
	//cities = cities.slice(0, 5);
	async.each( cities,
	            function(city, recordDoc) {
				    getAIPdata(city, recordDoc);
				},
				function(err) {
					// when all the elements in the array are processed, this is called
					if (err) logger.info(err);
					callback(); 
				}
	);
}

function getAIPdata(city, callback) {
    //logger.info('Getting API data for one cities');
	var url = city.url;
    request(url, function(error, resp, body) {
        if (error) {
			logger.info('ERROR getAIPdata response: for url: ' + url);
            logger.info(error);
        }
		//logger.info('getAIPdata response: for url: ' + url);
        try {
            result = JSON.parse(body).list;
            if (result && result[0]) {
                var doc = {id: result[0].id, name: result[0].name, lat: result[0].coord.lat, lon: result[0].coord.lon, temp: result[0].main.temp, timestamp: new Date()};
				if (result[0].main.temp && (result[0].main.temp < -50 || result[0].main.temp > 50)) {
					logger.info('UBNORMAL TEMP ' + JSON.stringify(doc.temp));
				}
				recordDoc(doc);
			}
        } catch(err) {
            logger.info('ERROR getAIPdata ' + err);
        }
    });
}

//recording single doc in database or update existing
function recordDoc(doc) {
	//logger.info('recording one DB record:' + JSON.stringify(doc) + ' to '+ JSON.stringify(weatherAPI));
    var myquery = { id: doc.id };
    var newvalues = { $set: doc };
	weatherAPI.update(myquery, newvalues, { upsert: true }, function(err, doc){
		if (err) {
			logger.info('ERROR recordDoc: ' + err);
		}
		else {
			if (doc.temp && (doc.temp < -50 || doc.temp > 50)) {
				logger.info('new database entry from API ' + JSON.stringify(doc.temp));
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
			recordDoc(scrapCitiesList[i]);
        }  catch(err) {
            logger.info(err);
            scrapCitiesList[i].scraptemp = null;
        }
    });
}

function getScarappedData(callback) {
    logger.info('scrapping: getting 10 coldest cities');

        if (lastAPIresult.length > 0) {
            scrapCitiesList = lastAPIresult;
        } else {
            scrapCitiesList = cities.slice(0, 10);
        }

        //timing scrapping for 10 seconds
        var j=0;
        var timer2 = setInterval(function () {
            if ( j == 10 ) {
                clearTimeout(timer2);
                logger.info('Scrapping done');
				callback && callback(scrapCitiesList);
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

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
