/** 
 * Unified login re-router. Kicks in when login has been successful 
 * to re-route to the calling application.
 * 
 * Any application using Unified login must provide three
 * parameters - an, otk and rdr. These are described below
 *   an - The humand readable application name in UTF8 encoding
 *   otk - A random one time key, this is returned encoded in the 
 *         response
 *   rdr - The redirect URL. On successful login the user will be 
 *         sent here 
 * 
 * The rdr URL will receive a valid JWT token as the param jwt. It
 * can cross check this token by calling the checktoken API on the
 * unified login app (one time check only). This token should then 
 * probably be used to generate the app's own JWT or authentication
 * cookie etc. (whatever the calling app uses to track logins).
 * 
 * The JWT claims encodes the following, which are accurate if the JWT
 * verification returns true. Any JWT decoder can be used to decode JWT.
 *   id - This is user's ID (usually their email)
 *   name - The user's full name, as they typed during registration
 *   org - The user's parent org
 *   suborg - The user's sub org
 *   role - The user's role within their org (admin or user)
 *   approved - If true, the user has been approved by the org they 
 *              belong to
 *   verified - If true, the user has verified their email
 *   onetimekey - The value of the otk param which was passed by caller
 *   appname - The value of the an param which was passed by caller
 *   iat - The issue time as UNIX epoch seconds (UTC)
 *   exp - The time at which token will expire as UNIX epoch seconds (UTC)
 *   iatms - The issue time as UNIX epoch milliseconds (UTC)
 *   iss - Should be login.tekmonks.com or https://login.tekmonks.com
 * 
 * (C) 2023 TekMonks. All rights reserved.
 * License: See enclosed license.txt file.
 */

import {router} from "/framework/js/router.mjs";
import {loginmanager} from "./loginmanager.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

async function doroute(reroutelink_id, visible_class) {
    const urlParams = new URL(router.getCurrentURL()).searchParams, appname = urlParams.get(LOGINAPP_CONSTANTS.SEARCH_PARAM_APPNAME), 
        onetimekey = urlParams.get(LOGINAPP_CONSTANTS.SEARCH_PARAM_ONETIMEKEY), redirect = urlParams.get(LOGINAPP_CONSTANTS.SEARCH_PARAM_REDIRECT);

    const _doErrorLogout = msg => {LOG.error(msg); loginmanager.logout(); }

    let redirectURLValid = true; try {new URL(redirect)} catch (err) {LOG.error(`Redirect URL invalid. The error is ${err}.`); redirectURLValid = false;}
    if ((!appname) || (!onetimekey) || (!redirect) || (!redirectURLValid)) {
        _doErrorLogout("Bad login request from the requesting application."); return;}

    const jwtTransferResult = await apiman.rest(LOGINAPP_CONSTANTS.API_GETTRANSFERJWT, "GET", {appname, onetimekey}, true, false); 
    if (!jwtTransferResult || !jwtTransferResult.result) {_doErrorLogout("JWT transfer token call failed, unified login not possible."); return;}

    const sendToURL = new URL(redirect), hrefElement = document.querySelector(reroutelink_id);
    sendToURL.searchParams.set("jwt", jwtTransferResult.jwt); const sendtolocation = sendToURL.href;
    hrefElement.href = sendtolocation; if (visible_class) hrefElement.classList.add(visible_class); 
    setTimeout(_=>window.location.replace(sendtolocation), LOGINAPP_CONSTANTS.REDIRECT_AFTERLOGIN_TIMEOUT||5000);
}

export const reroute = {doroute};