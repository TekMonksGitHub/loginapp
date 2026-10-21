/**
 * Initializes the application.
 * (C) TekMonks. All rights reserved.
 */

const fs = require("fs");
const mustache = require("mustache");

exports.initSync = appName => {
    global.LOGINAPP_CONSTANTS = require(`${__dirname}/../loginappframework/apis/lib/loginappconstants.js`);
    global.LOGINAPP_CONSTANTS.CONF = JSON.parse( mustache.render(fs.readFileSync(
        `${LOGINAPP_CONSTANTS.CONF_DIR}/loginapp.json`, "utf-8"), {app: appName, hostname: CONSTANTS.HOSTNAME}) );

    require(`${LOGINAPP_CONSTANTS.LIB_DIR}/userid.js`).initDB();   // inits the DB, will throw an error on failure

    require(`${LOGINAPP_CONSTANTS.API_DIR}/login.js`).init();   // inits the login subsystem

    require(`${LOGINAPP_CONSTANTS.LIB_DIR}/loginappAPIKeyChecker.js`).initSync();   // inits the security checker
    
    require(`${LOGINAPP_CONSTANTS.LIB_DIR}/deleteunverifiedaccounts.js`).init();    // init expired accounts cleanup service

    for (const dirEntry of fs.readdirSync(__dirname, {withFileTypes: true}))   // init wrapped apps
        if (dirEntry.isFile() && dirEntry.name.toLowerCase().endsWith("_init.js")) 
            require(`${__dirname}/${dirEntry.name}`).initSync();
}