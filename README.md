ColdCast
========

A web-based weather application that displays the 10 coldest cities in Canada along with current temperatures.
Website link (deployed to EC2): [demo](http://ec2-54-194-35-254.eu-west-1.compute.amazonaws.com/).

ColdCast is a traditional MEAN web application, built using [MongoDB](http://docs.mongodb.org/), [Express](http://expressjs.com/), [AngularJS](http://angularjs.org/), and [Node.js](http://nodejs.org/). The current weather data aggregates to the database from two sources on the back-end: a) via API calls to [OpenWeatherMap](openweathermap.org); b)via scraping google search result pages.
Calls for weather API and scraping are send once every 10 minutes. Normally the weather is not changing so frequently, and also the excessive API calls are not free, as well as a frequent requests to google search for scraping will produce suspicious activity and can result in blocking.
To overcome the blocking risk, scraping is delayed to one scraping request to google search every 3 seconds. So once the application is starting first time, the weather data from API call is delivered immediately, but there will me some delay in delivering scraping data as the scrapin will be executed for 10 cities.

The weather API calls return current data with temperature for all Canadian cities, so the 10 coldest are selected.
Every result from scraping and API calls is stored in the database in two separate collections. Front-end is displaying data automatically in the real-time regime every 10 minutes by sending GETs to the back-end.  
Back-end routs those requests to the database, so the application can scale with number of clients as there will be no additional API or scraping call and no danger for blocking or reaching the API calls limit. Database query looks for the most receint record and returs to the client. If no such, the API call or scraping is forced.

For interactive purpose in the header of the application page there are two button to force server refresh data with API call or scraping.

The most receint data from weather API calls is displayed on the right side in a table. Thus, when the application is starting, the list of cities from API calls differs from the cities from scraping (those are selected randomly). All next scrapings are done for the list of the last 10 coldest cities from the last API call - just in order to compare temperatures.

The 10 coldest cities from the weather API calls are displayed as markers on the google maps in the center of the page.

Note: due to the dynamic unrealiable scraping process (the possibility of being blocked by google) the server can fail due to the parsing error and has to be restarted.

To start a server
---------------
Install dependencies:

    npm install

Database:

Install [MongoDB](http://docs.mongodb.org/manual/installation/)

You should start database with 

    mongod --dbpath=/home/[db path]/data --port 27017

Application start:

    sudo node index.js

Application runs on a default port :80. 

Logs: 

For debug purposes check the debug.log.
    
Testing: 
---------------
Check the version of Node.js you have by running 

    node --version. 
    
It should be greater than v0.10.0.

Protractor:

[Protractor](http://angular.github.io/protractor) is an end-to-end test framework for AngularJS applications. Protractor runs tests against your application running in a real browser, interacting with it as a user would.

Try running protractor 

     --version 

to make sure it's working.

The webdriver-manager is a helper tool to easily get an instance of a Selenium Server running. Use it to download the necessary binaries with:

    webdriver-manager update

Now start up a server with: 

    webdriver-manager start

This will start up a Selenium Server and will output a bunch of info logs. Your Protractor test will send requests to this server  to control a local browser. Leave this server running throughout the tutorial. You can see information about the status of the server at http://localhost:4444/wd/hub.
 
To start protractor test: 

    protractor protractor.conf.js

Karma [under development]:

Unit testing for AgularJS, installation http://karma-runner.github.io/0.12/intro/installation.html

Start test: 

    karma start karma.config.js
