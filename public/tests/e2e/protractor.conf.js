exports.config = {
    seleniumAddress: 'http://localhost:4444/wd/hub',
    baseURL: 'http://localhost:3000',
    specs: 'spec.js',
    multipleCapabilities: [{
        browserName: 'chrome'
        },{
        browserName: 'firefox'
        }]
};