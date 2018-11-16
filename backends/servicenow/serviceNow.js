let axios = require('../../node_modules/axios')
let crypto = require('../../lib/crypto/crypto.js')

let auth = `Basic ${Buffer.from(process.env.sn_user + ":" + crypto.decrypt(process.env.sn_password)).toString('base64')}`;

const config = {
	headers: { 
		"Content-Type": "application/json",
		"Authorization": auth
	}
};

const sn_host = process.env.sn_host;

// Close a Ticket in ServiceNow
const closeTicket = (ticketID, callerId, resolution_code, resolution_notes) => {
    let route = sn_host + `/api/now/v1/table/incident/${ticketID}?sysparm_exclude_ref_link=true`;
    let updateTicket = {
		//caller_id: callerId,
		state: '7',
		close_code: resolution_code,
		close_notes: resolution_notes
	}
    return axios.put(route, updateTicket, config)
}

// Create a new ServiceNow ticket
// This is the one from Hackfest
// ** To Do:  utilize same createTicket for Spark/Teams
const createTicket = (dialogData, callerId, assignTo) => {
	let route = sn_host + "/api/now/v1/table/incident?sysparm_suppress_auto_sys_field=true";
	let ticket = {
		caller_id: callerId,
		assigned_to: assignTo,
		short_description: dialogData.short_description,
		urgency: dialogData.urgency,
		state: "New",
		sys_created_by: dialogData.caller,
		sys_created_on: Date.now(),
		sys_updated_by: dialogData.caller,
		sys_updated_on: Date.now()
	}
	console.log("short_description is " + ticket.short_description);
	return axios.post(route, ticket, config)
}

// Create a new ServiceNow ticket from Cisco Spark
const createTicketSpark = (dialogData, callerId, assignTo) => {
	let route = sn_host + "/api/now/table/incident";
	let ticket = {
		caller_id: callerId,
		assigned_to: assignTo,
		short_description: dialogData.short_description,
		urgency: dialogData.urgency,
		impact: dialogData.urgency,
		work_notes: dialogData.notes
		//sys_created_by: 'mrmeeseeks',
		//sys_created_on: Date.now(),
		//sys_updated_by: 'mrmeeseeks',
		//sys_updated_on: Date.now()
	}
	return axios.post(route, ticket, config);
}

// Gets Ticket Information from ServiceNow by ticket number
const getTicketByNumber = async (ticketNumber) => {
    let route = sn_host + `/api/now/v1/table/incident?sysparm_query=number%3D${ticketNumber}`;
    return axios.get(route,config);
}

// Get the User Record from ServiceNow by URL
// Inputs: Full API URL
const getUserByLink = async (link) => {
	return axios.get(link,config);
}

// Get the User Record from ServiceNow
// Inputs: First Name, Last Name
const getUserRecord = async (firstName, lastName) => {
	let route = sn_host + `/api/now/v1/table/sys_user?sysparm_query=first_name%3D${firstName}%5Elast_name%3D${lastName}`;
	return axios.get(route,config);
}

// List tickets in ServiceNow by Caller
const listTickets = async (callerId) => {
	let route = sn_host + `/api/now/table/incident?sysparm_query=caller_id%3D${callerId}`;
	return axios.get(route, config)
}

// Re-Open a ServiceNow Ticket
const reOpenTicket = (ticket) => {
	let route = "";
	return axios.post(route, ticket, config)
}

// Query the ServiceNow KB based on Short Description
const searchKb = (searchQuery) => {
	console.log("Searching " + searchQuery);
    let route = sn_host + `/api/now/v1/table/kb_knowledge?sysparm_query=short_descriptionLIKE${searchQuery}&sysparm_fields=wiki&sysparm_limit=10`;
	console.log("route " + route);
	return axios.get(route, config);
}

// Updates the ServiceNow ticket notes
// ** ToDo:  create 1 update function that can update any item on a ticket
const updateTicket = (ticketID, notes, userId) => {
    let route = sn_host + `/api/now/v1/table/task/${ticketID}?sysparm_exclude_ref_link=true`;
    let updateTicket = {
        caller_id: userId,
		/* short_description: ticket.short_description, */
		work_notes: notes
        /* urgency: ticket.urgency,
        state: ticket.state,
        sys_updated_by: userId,
        sys_updated_on: Date.now() */
	}
	
    return axios.put(route, updateTicket, config)
}

// Update the Ticket State in ServiceNow
// ** ToDo:  create 1 update function that can update any item on a ticket
const updateTicketState = (ticketID, new_state, userId) => {
    let route = sn_host + `/api/now/v1/table/task/${ticketID}?sysparm_exclude_ref_link=true`;
    let updateTicket = {
		caller_id: userId,
		state: new_state
		/* short_description: ticket.short_description, */
        /* urgency: ticket.urgency,
        sys_updated_by: userId,
        sys_updated_on: Date.now() */
	}
    return axios.put(route, updateTicket, config)
}

module.exports = {
	closeTicket: closeTicket,
	createTicket: createTicket,
	createTicketSpark: createTicketSpark,
	getUserByLink: getUserByLink,
	getUserRecord: getUserRecord,
	getTicketByNumber: getTicketByNumber,
	listTickets: listTickets,
	reOpenTicket: reOpenTicket,
	searchKb: searchKb,
	updateTicket: updateTicket,
	updateTicketState: updateTicketState
}