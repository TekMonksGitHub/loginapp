/**
 * Main entry point for the post-login page.
 * (C) 2023 Tekmonks
 */

import {i18n} from "/framework/js/i18n.mjs";
import {loginmanager} from "./loginmanager.mjs";
import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";

let mainmod;

async function main(data, mainModule) {
    mainmod = mainModule;
    const logindata = session.get(LOGINAPP_CONSTANTS.LOGIN_RESPONSE), totpQRCodeData = await mainmod.getTOTPQRCode(logindata.totpsec);
    data.maincontent = await router.loadHTML(`${LOGINAPP_CONSTANTS.PAGES_PATH}/showeditprofile.html`, {...data,
        ...loginmanager.getSessionUser(), totpQRCodeData});
}

async function updateprofile() {
    let validationOK = true; for (const elementToValidate of ["input#name", "password-box#pass1", "password-box#pass2"]) {
        const elementThis = document.querySelector(elementToValidate), prototypeThis = Object.getPrototypeOf(elementThis);
        if (elementThis) if ((typeof prototypeThis.checkValidity === "function") && (!elementThis.checkValidity())) {
            elementThis.reportValidity(); validationOK = false; }
    }
    if (!validationOK) return;

    const name = document.querySelector("input#name").value, newpassword1 = document.querySelector("#pass1").value, 
        newpassword2  = document.querySelector("#pass2").value;
    if (newpassword1 != newpassword2) {mainmod.showMessage(await i18n.get("RegisterErrorPasswordMismatch")); return;}

    const updateresult = await mainmod.updateProfile(name, (newpassword1||"").trim()!=""?newpassword1:undefined);
    if (!updateresult.result) mainmod.showMessage(updateresult.error); else {
        await mainmod.showMessage(await i18n.get("UpdateSuccess")); 
        router.reload();
    }
}

export const loginappframework = {main, updateprofile};