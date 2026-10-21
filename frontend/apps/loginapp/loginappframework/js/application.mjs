/** 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed license.txt file.
 */

import {i18n} from "/framework/js/i18n.mjs";
import {util} from "/framework/js/util.mjs";
import {loadbalancer} from "/framework/js/loadbalancer.mjs";
import {LOGINAPP_CONSTANTS as AUTO_LOGINAPP_CONSTANTS} from "./constants.mjs";

const apiman = $$.libapimanager;

const init = async hostname => {
	window.monkshu_env.apps[AUTO_LOGINAPP_CONSTANTS.APP_NAME] = {};
	const mustache = await $$.librouter.getMustache();
	window.LOGINAPP_CONSTANTS = JSON.parse(mustache.render(JSON.stringify(AUTO_LOGINAPP_CONSTANTS), {hostname}));
	window.LOG = (await import ("/framework/js/log.mjs")).LOG;
	
	await _addLoadbalancers();

	if (!$$.libsession.get($$.MONKSHU_CONSTANTS.LANG_ID)) $$.libsession.set($$.MONKSHU_CONSTANTS.LANG_ID, "en");
	
	// setup permissions and roles
	$$.libsecurityguard.setPermissionsMap(LOGINAPP_CONSTANTS.PERMISSIONS_MAP);
	$$.libsecurityguard.setCurrentRole($$.libsecurityguard.getCurrentRole() || LOGINAPP_CONSTANTS.GUEST_ROLE);

	// register backend API keys
	apiman.registerAPIKeys(LOGINAPP_CONSTANTS.API_KEYS, LOGINAPP_CONSTANTS.KEY_HEADER); 	
	const API_GETREMOTELOG = LOGINAPP_CONSTANTS.API_PATH+"/getremotelog", API_REMOTELOG = LOGINAPP_CONSTANTS.API_PATH+"/log";
	const remoteLogResponse = (await apiman.rest(API_GETREMOTELOG, "GET")), remoteLogFlag = remoteLogResponse?remoteLogResponse.remote_log:false;
	LOG.setRemote(remoteLogFlag, API_REMOTELOG);

	const embeddedAppName = LOGINAPP_CONSTANTS.EMBEDDED_APP_NAME?LOGINAPP_CONSTANTS.EMBEDDED_APP_NAME.trim():undefined;
    if (embeddedAppName) i18n.addPath(`${LOGINAPP_CONSTANTS.APP_PATH}/${embeddedAppName}`);
}

const main = async (desiredURL, desiredData) => {
	await _addPageLoadInterceptors(); await _readConfig(); await _registerComponents();
	const decodedURL = new URL(desiredURL || $$.librouter.decodeURL(window.location.href)), 
		justURL = util.baseURL(decodedURL), search = decodedURL.search, isSearchSpecified = search && (search.trim() != "") && (search.trim() != "?"),
		startingPage = isSearchSpecified?LOGINAPP_CONSTANTS.LOGIN_HTML:LOGINAPP_CONSTANTS.REGISTER_HTML;

	if (justURL == LOGINAPP_CONSTANTS.INDEX_HTML) $$.librouter.loadPage(startingPage+search);
	else if ($$.libsecurityguard.isAllowed(justURL)) {
		if ($$.librouter.getLastSessionURL() && (decodedURL.toString() == $$.librouter.getLastSessionURL().toString())) $$.librouter.reload();
		else $$.librouter.loadPage(decodedURL.href, desiredData);
	} else $$.librouter.loadPage(startingPage+search);
}

const interceptPageLoadData = _ => $$.librouter.addOnLoadPageData("*", async (data, _url) => {
	data.LOGINAPP_CONSTANTS = LOGINAPP_CONSTANTS; 
	data.headers = await $$.requireText(LOGINAPP_CONSTANTS.CONF_PATH+"/headers.html");
});

async function _readConfig() {
	const conf = await $$.requireJSON(`${LOGINAPP_CONSTANTS.CONF_PATH}/app.json`);
	for (const key of Object.keys(conf)) LOGINAPP_CONSTANTS[key] = conf[key];

	// merge embedded app's app.json overiding the loginapp's app.json if needed.
	let confEmbedded = {}; if (LOGINAPP_CONSTANTS.EMBEDDED_APP_NAME) try{ confEmbedded = await $$.requireJSON(
		`${LOGINAPP_CONSTANTS.APP_PATH}/${LOGINAPP_CONSTANTS.EMBEDDED_APP_NAME}/conf/app.json`) } catch(err) {
			LOG.warn(`Missing or unreadable app.json for the embedded app. The error is ${err}.`);
		};
	for (const [key, value] of Object.entries(confEmbedded)) 
		if (LOGINAPP_CONSTANTS[key] && Array.isArray(LOGINAPP_CONSTANTS[key])) LOGINAPP_CONSTANTS[key] = 
			[...LOGINAPP_CONSTANTS[key], ...(Array.isArray(value)?value:[value])]; 	// merge arrays
		else if ((typeof LOGINAPP_CONSTANTS[key] === "object") && (typeof value === "object")) 
			LOGINAPP_CONSTANTS[key]  = {...LOGINAPP_CONSTANTS[key], ...value};
		else LOGINAPP_CONSTANTS[key] = value;
}

const _registerComponents = async _ => { for (const component of LOGINAPP_CONSTANTS.COMPONENTS) 
	await import(`${LOGINAPP_CONSTANTS.APP_PATH}/${component}/${component.substring(component.lastIndexOf("/")+1)}.mjs`); }



async function _addPageLoadInterceptors() {
	const interceptors = await $$.requireJSON(`${LOGINAPP_CONSTANTS.CONF_PATH}/pageLoadInterceptors.json`);
	for (const interceptor of interceptors) {
		const modulePath = interceptor.module, functionName = interceptor.function;
		let module = await import(`${LOGINAPP_CONSTANTS.LOGINAPP_PATH}/${modulePath}`); module = module[Object.keys(module)[0]];
		(module[functionName])();
	}
}

async function _addLoadbalancers() {
	let lbConf; try {lbConf = await $$.requireJSON(`${LOGINAPP_CONSTANTS.CONF_PATH}/lb.json`)} catch (err) {};
	if (!lbConf) return;	// no LBs configured

	for (const lbconfKey of Object.keys(lbConf)) {
		if (lbconfKey == "backends") lbConf[lbconfKey].roothost = new URL(LOGINAPP_CONSTANTS.BACKEND).hostname;
		else if (lbconfKey == "frontends") lbConf[lbconfKey].roothost = new URL(LOGINAPP_CONSTANTS.FRONTEND).hostname;
		else continue;	// not a known LB configuration
		
		const lbThis = loadbalancer.createLoadbalancer(lbConf[lbconfKey]);
		if (lbThis) {$$.librouter.addLoadbalancer(lbThis); LOG.info(`Added load balancer for policy ${lbconfKey}`);}
		else LOG.error(`Bad load balancer policy ${lbconfKey}.`);
	}
}

export const application = {init, main, interceptPageLoadData};