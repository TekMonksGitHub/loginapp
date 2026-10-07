/**
 * Returns JWT transfer token status - result: true or false if
 * not valid.
 * 
 * Input should be {jwt: token to validate, noonce: false}
 * 
 * If noonce is true the token will still be valid till it expires,
 * else all tokens are one time use only - once checked as valid they
 * are immediately expired. This ensures replay attacks don't succeed.
 * 
 * Result is {jwt: token checked, result: true if valid else false}
 * 
 * (C) 2022 TekMonks. All rights reserved.
 */

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}

    const jwtTokenManager = APIREGISTRY.getExtension("jwtTokenManager");
	const result = await jwtTokenManager.checkToken(jsonReq.jwt);

    if (result && (!jsonReq.noonce)) jwtTokenManager.releaseToken(jsonReq.jwt); // release token once checked
    
    return {jwt: jsonReq.jwt, result};
}

const validateRequest = jsonReq => jsonReq && jsonReq.jwt;