/**
 * Approve domain
 * (C) 2022 TekMonks. All rights reserved.
 * License: See enclosed license file.
 */

import {i18n} from "/framework/js/i18n.mjs";
import {router} from "/framework/js/router.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";

const interceptPageData = _ => router.addOnLoadPageData(APP_CONSTANTS.APPROVE_HTML, async (data, url) => {   // approve email
    const urlParsed = new URL(url), id = urlParsed.searchParams.get("id"), org = urlParsed.searchParams.get("org"), approveOrg = urlParsed.searchParams.get("approveOrg"), 
        name = urlParsed.searchParams.get("name"), lang = urlParsed.searchParams.get("lang"), bgc = urlParsed.searchParams.get("bgc");
        
    const approveResult = (id && org) ? await apiman.rest(APP_CONSTANTS.API_APPROVE_USER, "GET", {id, name, org, approveOrg, bgc}, true) : {result: false};
        
    if (approveResult && approveResult.result) {
        data.emailApproveMsg = await i18n.get("EmailApproved"); 
        data.emailApproved = true; 
    } else data.emailApproveMsg = await i18n.get("EmailNotApproved");
});

export const verify = {interceptPageData};