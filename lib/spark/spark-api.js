const Spark = require('node-sparky');

// Create a new Spark Room
const createRoom = (ticketNumber) => {
    let spark = new Spark({ token: process.env.webex_access_token });
    console.log('Creating Room with access token ' + process.env.webex_access_token);
    return spark.roomAdd(ticketNumber);
}

// Add a user to a Webex Teams Room
const addMemberToRoom = (roomId, userEmail, isModerator) => {
    let spark = new Spark({ token: process.env.webex_access_token });
    console.log('Adding ' + userEmail + ' to Room with access token ' + process.env.webex_access_token);
    const membershipObj = {
        roomId: roomId,
        personEmail: userEmail,
        isModerator: isModerator
    };
    return spark.membershipAdd(membershipObj);
}

// Delete a Webex Teams Room
const deleteRoom = (roomId) => {
    let spark = new Spark({ token: process.env.webex_access_token });
    return spark.roomRemove(roomId);
}

// Get Webex Team Room Messages
const getMessages = (roomId) => {
    let spark = new Spark({ token: process.env.ryan_access_token });
    const messagesObj = {
        roomId: roomId
    };
    return spark.messagesGet(messagesObj);
}

// Get a Webex Teams Room
const getRoom = (roomId) => {
    let spark = new Spark({ token: process.env.webex_access_token });
    return spark.roomGet(roomId);
}

// Get all 1:1 Webex Teams Rooms that access token is a member of
const getRooms = () => {
    let spark = new Spark({ token: process.env.webex_access_token });
    const roomObj = {
        type: 'direct'
    };
    return spark.roomsGet(roomObj);
}

// Send a Spark Message to a Room
const sendMessage = (roomId, message) => {
    let spark = new Spark({ token: process.env.webex_access_token });
    const newMessage = {
        roomId: roomId,
        markdown: message
    }
    return spark.messageSend(newMessage);
}

module.exports = {
	addMemberToRoom: addMemberToRoom,
    createRoom: createRoom,
    deleteRoom: deleteRoom,
    getMessages: getMessages,
    getRoom: getRoom,
    getRooms: getRooms,
    sendMessage: sendMessage
}