/**
 * Returns a JWT transfer token.
 * 
 * The input is
 * 	onetimekey - This is the app's one time key
 * 	appname - This is the app's name
 * 	transfer_token_timeout - This is the interval post which the token 
 * 							 will expire. If not supplied a default of
 * 							 3 minutes is used.
 * 
 * The JWT claims encodes the following. Any JWT decoder can be used to 
 * decode JWT.
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
 * The token will auto-expire, typically, in 3 minutes, unless configured
 * to last longer in the transfer_token_timeout property of the 
 * <loginappframework>/conf/loginapp.json file.
 * 
 * (C) 2022 TekMonks. All rights reserved.
 */

const login = require(`${LOGINAPP_CONSTANTS.API_DIR}/login.js`);
const userid = require(`${LOGINAPP_CONSTANTS.LIB_DIR}/userid.js`);

const DEFAULT_TRANSFER_TOKEN_TIMEOUT = 180000, DEFAULT_ISS = "login.tekmonks.com";

exports.doService = async (jsonReq, _servObject, headers, _url, _apiconf) => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}

    const id = login.getID(headers);
	LOG.info(`Got JWT transfer request for ID ${id}`);

	const userdetails = await userid.lookupid(id);

	if (userdetails) LOG.info(`Sending transfer for ID ${id}.`); 
	else {LOG.error(`Unable to locate user for ID ${id}, DB error.`); return CONSTANTS.FALSE_RESULT;}

    const jwtTokenManager = APIREGISTRY.getExtension("jwtTokenManager"), tokenExpiryDelay = 
		jsonReq.transfer_token_timeout||LOGINAPP_CONSTANTS.CONF.transfer_token_timeout||DEFAULT_TRANSFER_TOKEN_TIMEOUT;
	const token = jwtTokenManager.createSignedJWTToken({id: userdetails.id, name: userdetails.name, org: userdetails.org,
        suborg: userdetails.suborg, role: userdetails.role, approved: userdetails.approved == 1, 
		verified: userdetails.verified == 1, onetimekey: jsonReq.onetimekey, appname: jsonReq.appname, 
		expiryInterval: tokenExpiryDelay, iss: LOGINAPP_CONSTANTS.CONF.jwt_iss||DEFAULT_ISS});
    
    return {jwt: token, ...CONSTANTS.TRUE_RESULT};
}

const validateRequest = jsonReq => jsonReq && jsonReq.onetimekey && jsonReq.appname;