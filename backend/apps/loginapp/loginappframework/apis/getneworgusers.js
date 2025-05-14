/**
 * Returns the users whose organizations are not on the whitelist.
 * (C) 2021 TekMonks. All rights reserved.
 */
const fs = require("fs");
const path = require("path");
const userid = require(`${APP_CONSTANTS.LIB_DIR}/userid.js`);
const ID_BLACK_WHITE_LISTS = require(`${APP_CONSTANTS.CONF_DIR}/idblackwhitelists.json`);

exports.doService = async jsonReq => {

	LOG.info("Got get new org users request.");

	const whitelistedDomains = ID_BLACK_WHITE_LISTS.whitelist.map(domain => domain.toLowerCase());
	const newOrgUsers = await userid.getNewOrgUsers(whitelistedDomains);

	if (newOrgUsers.length) LOG.info(`Sending new org users list.`); else LOG.error(`No new org users found.`);

	return {result: true, users: newOrgUsers};
}
