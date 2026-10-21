/** 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed license.txt file.
 */
import {i18n} from "/framework/js/i18n.mjs";
import {loginmanager} from "./loginmanager.mjs"
import {router} from "/framework/js/router.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

const dialog = _ => monkshu_env.components['dialog-box'], gohomeListeners = [];

function toggleMenu() {
    const imgElement = document.querySelector("span#menubutton > img"), menuIsOpen = imgElement.src.indexOf("menu.svg") != -1;
    const menuDiv = document.querySelector("div#menu");

    if (menuIsOpen) {    
        menuDiv.classList.add("visible"); menuDiv.style.maxHeight = menuDiv.scrollHeight+"px"; 
        imgElement.src = "./img/menu_close.svg";
    } else {
        menuDiv.classList.remove("visible"); menuDiv.style.maxHeight = 0; 
        imgElement.src = "./img/menu.svg";
    }
}

async function updateProfile(name, newpassword) {
    const sessionUser = loginmanager.getSessionUser();
    const updateResult = await loginmanager.registerOrUpdate(sessionUser.id, name, sessionUser.id, newpassword, sessionUser.org);
    if (updateResult != loginmanager.ID_OK) {
        let errorKey = "Internal"; switch (updateResult)
        {
            case loginmanager.ID_FAILED_EXISTS: errorKey = "Exists"; break;
            case loginmanager.ID_FAILED_OTP: errorKey = "OTP"; break;
            case loginmanager.ID_INTERNAL_ERROR: errorKey = "Internal"; break;
            case loginmanager.ID_DB_ERROR: errorKey = "Internal"; break;
            case loginmanager.ID_SECURITY_ERROR: errorKey = "SecurityError"; break;
            case loginmanager.ID_DOMAIN_ERROR: errorKey = "DomainError"; break;
            default: errorKey = "Internal"; break;
        }
        const errorMessage = await i18n.get(`ProfileChangedFailed${errorKey}`);
        return {result: false, error: errorMessage};
    } else return {result: true};
}

function showLoginMessages() {
    const data = router.getCurrentPageData();
    if (data.showDialog) { showMessage(data.showDialog.message); delete data.showDialog; router.setCurrentPageData(data); }
}

const logoutClicked = _ => loginmanager.logout();

const interceptPageData = _ => router.addOnLoadPageData(LOGINAPP_CONSTANTS.MAIN_HTML, async data => {   // set admin role if applicable
    if (securityguard.getCurrentRole()==LOGINAPP_CONSTANTS.ADMIN_ROLE) data.admin = true; 
    
    const embeddedAppName = LOGINAPP_CONSTANTS.EMBEDDED_APP_NAME?LOGINAPP_CONSTANTS.EMBEDDED_APP_NAME.trim():undefined;
    if (embeddedAppName) try { 
        const embeddedappMainMJS = await import(`${LOGINAPP_CONSTANTS.APP_PATH}/${embeddedAppName}/js/${embeddedAppName}.mjs`); 
        data = await embeddedappMainMJS[embeddedAppName].main(data, main); 
    } catch (err) { LOG.error(`Error in initializing embeded app ${embeddedAppName}, error is ${err}.`); }
});

async function gohome() {
    for (const listener of gohomeListeners) await listener();
    router.navigate(LOGINAPP_CONSTANTS.MAIN_HTML);
}

const addGoHomeListener = listener => gohomeListeners.push(listener);

async function getTOTPQRCode(key) {
	const title = await i18n.get("Title");
	await $$.require(`${LOGINAPP_CONSTANTS.COMPONENTS_PATH}/register-box/3p/qrcode.min.js`);
	return new Promise(resolve => QRCode.toDataURL(
	    `otpauth://totp/${title}?secret=${key}&issuer=TekMonks&algorithm=sha1&digits=6&period=30`, (_, data_url) => resolve(data_url)));
}

async function showLongTermToken(_element) {
    const jwtTransferResult = await apiman.rest(LOGINAPP_CONSTANTS.API_GETTRANSFERJWT, "GET", 
        {appname: LOGINAPP_CONSTANTS.APP_NAME, onetimekey: Date.now()+Math.random().toString().split(".")[1], 
            transfer_token_timeout: LOGINAPP_CONSTANTS.LONG_TERM_JWT_EXPIRY}, true); 
    if (!jwtTransferResult || !jwtTransferResult.result) {
        _doErrorLogout("JWT transfer token call failed, unified login not possible."); return; }
    
    dialog().showDialog(`${LOGINAPP_CONSTANTS.DIALOGS_PATH}/showjwt.html`, await i18n.get("Copy"), await i18n.get("Close"), 
        {jwt: jwtTransferResult.jwt}, "dialog");
}

const showMessage = message => new Promise(resolve => dialog().showMessage(message, "dialog", _=>resolve()));

export const main = {toggleMenu, showLoginMessages, updateProfile, logoutClicked, interceptPageData, gohome, 
    addGoHomeListener, showMessage, getTOTPQRCode, showLongTermToken}