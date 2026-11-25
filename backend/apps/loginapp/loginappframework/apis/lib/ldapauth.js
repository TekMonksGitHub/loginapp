/**
 * Checks a user ID and password against any LDAP directory over LDAPS. A service account finds the user's entry, then the
 * directory checks the password by signing in as that entry. ${id} in userFilter (e.g. (uid=${id}) or (sAMAccountName=${id}))
 * is the typed ID, ${dn} in groupFilter (e.g. (member=${dn})) is the user's entry. The user gets the role of the first
 * matching group in groupRoles and no match refuses. nameAttribute and orgAttribute are optional. servicePassword is stored
 * encrypted
 *
 * (C) 2026 TekMonks. All rights reserved.
 * See enclosed LICENSE file.
 */
const fs = require("fs");
const crypt = require(`${CONSTANTS.LIBDIR}/crypt.js`);
const {Client} = require("ldapts");
const LDAP_CONF = LOGINAPP_CONSTANTS.CONF.ldap, ID_PLACEHOLDER = "${id}", DN_PLACEHOLDER = "${dn}";

exports.isEnabled = _ => LDAP_CONF?.enabled === true;

exports.getPasswordMarker = _ => LDAP_CONF.passwordMarker;

/** Returns {role, name, org} if the directory accepts the password, null on any problem at all. */
exports.authenticate = async (id, pwph) => {
	const password = _passwordFromPwph(id, pwph);
	if (!_isConfValid()) {LOG.error("LDAP password check failed, the ldap settings in loginapp.json are incomplete or not LDAPS."); return null;}
	if (!password) {LOG.error(`LDAP password check failed for ID ${id}, the password is missing.`); return null;}

	let connection; try {
		const ca = await fs.promises.readFile(LDAP_CONF.caFile);
		connection = new Client({url: LDAP_CONF.url, timeout: LDAP_CONF.timeout, connectTimeout: LDAP_CONF.timeout, tlsOptions: {ca, rejectUnauthorized: true}});
		const user = await _findUser(connection, id);
		if (!user) {LOG.error(`LDAP password check failed for ID ${id}, it does not match exactly one directory entry.`); return null;}
		const role = await _findRole(connection, user.dn);	// the connection is still the service account here
		if (!role) {LOG.error(`LDAP password check failed for ID ${id}, it is in none of the groups in groupRoles.`); return null;}
		await connection.bind(user.dn, password);
		return {role, name: user.name, org: user.org};
	} catch (err) {
		LOG.error(`LDAP password check failed for ID ${id}, error is ${err}.`); return null;
	} finally {
		if (connection) try {await connection.unbind();} catch (_) {/* already closed */}
	}
}

/** Returns {dn, name, org} of the one entry matching the ID, or null if there is none or more than one. */
async function _findUser(connection, id) {
	try {await connection.bind(LDAP_CONF.serviceDN, crypt.decrypt(LDAP_CONF.servicePassword));}
	catch (err) {throw new Error(`the service account could not sign in, check serviceDN and servicePassword (${err.message})`);}
	const filter = LDAP_CONF.userFilter.replaceAll(ID_PLACEHOLDER, _ => _escapeFilterValue(id));	// typed ID can never change the filter
	const {searchEntries} = await connection.search(LDAP_CONF.baseDN, {scope: "sub", filter, attributes: ["dn", LDAP_CONF.nameAttribute, LDAP_CONF.orgAttribute].filter(Boolean), sizeLimit: 2});
	if (searchEntries.length != 1) return null;
	const entry = searchEntries[0];
	const valueOf = attribute => {	// the directory may return the attribute name in another case, and an attribute may hold several values
		const key = Object.keys(entry).find(name => name.toLowerCase() == attribute?.toLowerCase());
		return [entry[key]].flat().find(value => (typeof value == "string") && value.trim());
	};
	return {dn: entry.dn, name: valueOf(LDAP_CONF.nameAttribute), org: valueOf(LDAP_CONF.orgAttribute)};
}

/** Returns the role of the first groupRoles entry the user is a member of, or undefined. */
async function _findRole(connection, userDN) {
	const filter = LDAP_CONF.groupFilter.replaceAll(DN_PLACEHOLDER, _ => _escapeFilterValue(userDN));
	const {searchEntries} = await connection.search(LDAP_CONF.baseDN, {scope: "sub", filter, attributes: ["dn"]});
	const userGroups = searchEntries.map(entry => entry.dn.toLowerCase());	// directories differ in the case they return
	return LDAP_CONF.groupRoles.find(entry => userGroups.includes(entry.group.toLowerCase()))?.role;
}

const _escapeFilterValue = value => value.replace(/[\\*()\0]/g, char => `\\${char.charCodeAt(0).toString(16).padStart(2, "0")}`);

// the pages send the password as `${id} ${password}`
const _passwordFromPwph = (id, pwph) => ((typeof id == "string") && (typeof pwph == "string") && pwph.toLowerCase().startsWith(`${id.toLowerCase()} `)) ?
	pwph.substring(id.length+1) : null;

function _isConfValid() {
	if (!LDAP_CONF) return false;
	const requiredText = ["url", "caFile", "baseDN", "userFilter", "serviceDN", "servicePassword", "passwordMarker", "groupFilter"];
	const isText = value => (typeof value == "string") && value.trim();
	if (!requiredText.every(setting => isText(LDAP_CONF[setting]))) return false;

	if (!LDAP_CONF.url.toLowerCase().startsWith("ldaps://")) return false;
	if (!LDAP_CONF.userFilter.includes(ID_PLACEHOLDER)) return false;
	if (!LDAP_CONF.groupFilter.includes(DN_PLACEHOLDER)) return false;
	if (!(LDAP_CONF.timeout > 0)) return false;

	const {groupRoles, nameAttribute, orgAttribute} = LDAP_CONF;
	if (!Array.isArray(groupRoles) || !groupRoles.length) return false;
	if (!groupRoles.every(entry => isText(entry?.group) && isText(entry?.role))) return false;
	return [nameAttribute, orgAttribute].every(attribute => (attribute === undefined) || isText(attribute));
}
