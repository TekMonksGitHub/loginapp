/** 
 * Returns true or false depending on whether we should
 * enable remote logging.
 * (C) 2020 TekMonks. All rights reserved.
 */

exports.doService = async _jsonReq => {return {result: true, remote_log: APP_CONSTANTS.CONF.remote_log};}