/**
 * Approve domain
 * (C) 2022 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */

import {i18n} from "/framework/js/i18n.mjs";
import {router} from "/framework/js/router.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

const interceptPageData = _ => router.addOnLoadPageData(APP_CONSTANTS.APPROVE_HTML, async (data, url) => {   // approve email
    const urlParsed = new URL(url), e = urlParsed.searchParams.get("e"), t = urlParsed.searchParams.get("t"),
        approveResult = (e && t) ? await apiman.rest(APP_CONSTANTS.API_APPROVE_EMAIL, "POST", {e, t}) : {result: false};
        
    if (approveResult && approveResult.result) {
        data.emailApproveMsg = await i18n.get("EmailApproved"); 
        data.emailApproved = true; 
    } else data.emailApproveMsg = await i18n.get("EmailNotApproved");
});

export const verify = {interceptPageData};