import { util } from "/framework/js/util.mjs";
import { router } from "/framework/js/router.mjs";
import { session } from "/framework/js/session.mjs";
import { loginmanager } from "../../js/loginmanager.mjs";
import { securityguard } from "/framework/js/securityguard.mjs";
import { monkshu_component } from "/framework/js/monkshu_component.mjs";

const COMPONENT_PATH = util.getModulePath(import.meta);

function setData(host, data) {
    Object.entries(data).forEach(([key, value]) => {
        host.innerHTML = host.innerHTML.replaceAll(`{{{${key}}}}`, value);
    });
}

async function elementConnected(host) {
    const data = { COMPONENT_PATH };
    setData(host, data);

    // Define global callback for Google auto-render
    window.onGoogleSignIn = async response => {
        if (!response || !response.credential) return;

        const fakeGoogleUser = {
            getAuthResponse: () => ({ id_token: response.credential })
        };

        const loginResult = await loginmanager.signinWithGoogle(fakeGoogleUser);
        _handleLoginResult(loginResult, null, host);
    };

    // Load Google script if needed
    if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }
}

async function _handleLoginResult(result, _, hostElement) {
    const routeOnSuccess = hostElement.getAttribute("routeOnSuccess") || "./main.html";
    const routeOnNotApproved = hostElement.getAttribute("routeOnNotApproved") || "./notapproved.html";

    const commonUserData = {
        name: session.get(APP_CONSTANTS.USERNAME),
        id: session.get(APP_CONSTANTS.USERID),
        org: session.get(APP_CONSTANTS.USERORG),
        role: securityguard.getCurrentRole()
    };

    let data;

    switch (result) {
        case loginmanager.ID_OK:
            data = JSON.parse(await router.expandPageData(
                hostElement.getAttribute("dataOnSuccess") || "{}",
                undefined,
                { ...commonUserData, needs_verification: false }
            ));
            router.loadPage(routeOnSuccess, data);
            break;

        case loginmanager.ID_OK_NOT_YET_VERIFIED:
            data = JSON.parse(await router.expandPageData(
                hostElement.getAttribute("dataOnSuccessNotVerified") || "{}",
                undefined,
                { ...commonUserData, needs_verification: true }
            ));
            router.loadPage(routeOnSuccess, data);
            break;

        case loginmanager.ID_OK_NOT_YET_APPROVED:
            router.loadPage(routeOnNotApproved, {});
            break;

        default:
            alert("Google login failed.");
            break;
    }
}

function getShadowRootByID(id) {
    const elem = document.getElementById(id);
    return elem?.shadowRoot || null;
}

function getShadowRootByContainedElement(el) {
    return el.getRootNode() instanceof ShadowRoot ? el.getRootNode() : null;
}

const trueWebComponentMode = false;
export const google_sso_box = {
    setData,
    elementConnected,
    getShadowRootByContainedElement,
    getShadowRootByID,
    trueWebComponentMode
};

monkshu_component.register("google-sso-box", `${COMPONENT_PATH}/google-sso-box.html`, google_sso_box);
