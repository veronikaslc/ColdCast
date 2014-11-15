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

request('http://api.openweathermap.org/data/2.5/weather?id='+toronto_code+'&APPID='+API_key, function(error, resp, body) {
   doc = body;
    console.log(body);
});

app.get('/getweather', function (req, resp) {
    resp.json(doc);
});

app.listen(3000);