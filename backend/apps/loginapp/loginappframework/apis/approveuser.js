/**
 * Logs a user in. 
 * (C) 2015 TekMonks. All rights reserved.
 */
const mustache = require("mustache");
const userid = require(`${APP_CONSTANTS.LIB_DIR}/userid.js`);
const mailer = require(`${APP_CONSTANTS.LIB_DIR}/mailer.js`);
const template = require(`${APP_CONSTANTS.CONF_DIR}/email.json`);
const fs = require('fs');
const path = require('path');

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return CONSTANTS.FALSE_RESULT;}
	
	LOG.debug(`Got approve user request for ID ${jsonReq.id}`);

	const result = await userid.approve(jsonReq.id, jsonReq.org);
	
	if(jsonReq.approveOrg) addDomainToWhitelist(jsonReq.id);

	if (result.result) {
		LOG.info(`User ${jsonReq.name} with ID ${jsonReq.id} for org ${jsonReq.org} approved.`); 
		_informUserAccountApprovedViaEmail(jsonReq.org, jsonReq.name, jsonReq.id, jsonReq.lang||"en", jsonReq.bgc);
	} else LOG.error(`Unable to approve user with ID: ${jsonReq.id}.`);

	return result;
}

async function _informUserAccountApprovedViaEmail(org, name, id, lang, bgc) {
	const action_url = APP_CONSTANTS.CONF.base_url + Buffer.from(`${APP_CONSTANTS.CONF.login_url}${bgc?`?bgc=${encodeURIComponent(bgc)}`:""}`).toString("base64"),
		button_code_pre = mustache.render(template.button_code_pre, {action_url}), button_code_post = mustache.render(template.button_code_post, {action_url}),
		email_title = mustache.render(template[`${lang}_approvedaccountemail_title`], {name, org, id, action_url}),
		email_html = mustache.render(template[`${lang}_approvedaccountemail_html`], {name, org, id, button_code_pre, button_code_post}),
		email_text = mustache.render(template[`${lang}_approvedaccountemail_text`], {name, org, id, action_url});

	const emailResult = await mailer.email(id, email_title, email_html, email_text);
	if (!emailResult) LOG.error(`Unable to email approved account email for ${name}, ID: ${id}. The user's login URL is ${action_url}.`);
}

async function addDomainToWhitelist(id) {
    const domain = id.split('@')[1];
	const idblackwhitelistsPath = path.resolve(__dirname, '../conf/idblackwhitelists.json');
	
    if (!domain) { LOG.error(`Invalid email format: ${id}`); return;}

    try {
        const data = fs.readFileSync(idblackwhitelistsPath, 'utf8');
        const idblackwhitelists = JSON.parse(data);

        if (!idblackwhitelists.whitelist.includes(domain)) {
            idblackwhitelists.whitelist.push(domain);
            fs.writeFileSync(idblackwhitelistsPath, JSON.stringify(idblackwhitelists, null, 4));
            LOG.info(`Domain ${domain} added to whitelist.`);
        } else {
            LOG.info(`Domain ${domain} is already in the whitelist.`);
        }
    } catch (err) {
        LOG.error(`Error reading or writing to idblackwhitelists.json: ${err}`);
    }
}

const validateRequest = jsonReq => (jsonReq && jsonReq.id && jsonReq.org && jsonReq.name);
