module.exports = function(controller) {

        // CREATE Conversation - Create a ServiceNow Ticket
        controller.hears(['^create ticket$'], 'direct_mention, direct_message', function(bot, message) {
            const regex1 = /^[^.]+/;
            const regex2 = /^[^@]+/;
            let dialogData = {};
            let roomId = '';
            let ticketNumber = '';
            let modelNumber = '';
            var userEmail = message.user;
            var userFirstName = '';
            var callerId = userEmail.match(regex2)[0];
  
            // Check if Demo user Michael Scott or Ryan Howard
            if (userEmail.toLowerCase() === 'mscott1677@gmail.com') {
              userFirstName = 'Michael';
            }
            else if (userEmail.toLowerCase() === 'rhoward1677@gmail.com') {
              userFirstName = 'Ryan';
            }
            else {
              userFirstName = userEmail.match(regex1)[0];
            }
  
              bot.createConversation(message, function(err, convo) {
                // Create Error Thread
                convo.addMessage({
                  text: 'I have encountered an error - sorry about that!  {{vars.error}}'
                }, 'error');
    
                convo.addMessage({
                  text: "Sorry, I didn't understand, please enter 'yes' or 'no'",
                  action: 'default',
                }, 'bad_yesno');
  
                convo.addMessage({
                  text: "Sorry, I didn't understand, please enter '1 or high', '2 or medium', '3 or low'",
                  action: 'default',
                }, 'bad_urgency');
  
                convo.addMessage({
                  text: "Ok, I'll Create a new ServiceNow Ticket " + userFirstName + '!',
                }, 'default');
  
                convo.addQuestion({text: 'Can you give me a description of the problem?'}, function(res, convo) {
                  convo.gotoThread('got_it');
                },{key: 'short_description'}, 'default');
  
                convo.addMessage({
                  text: 'Got it! Please wait while I search my knowledge base for a resolution.',
                  action: 'search_kb'
                }, 'got_it');
  
                convo.addMessage({
                  text: 'I was unable to find a match.',
                  action: 'get_urgency'
                }, 'search_kb');
  
                convo.addMessage({
                  text: 'I found this based on your description:\n\n {{vars.kb_notes}}',
                  action: 'check_solved'
                }, 'found_kb');
  
                convo.beforeThread('search_kb', function(convo, next) {
                  // Search ServiceNow KB
                  var serviceNow = require("../backends/servicenow/serviceNow.js");
                  serviceNow.searchKb(convo.extractResponse('short_description')).then (function(response) {
                    if (response.status == '200') {
                      console.log('Successfully queried KB');
                      console.log(response);
                      if (response.data.result.length > 0) {
                        if (response.data.result[0].wiki) {
                          console.log('Wiki Text ' + response.data.result[0].wiki);
                          convo.setVar('kb_notes', response.data.result[0].wiki);
                          convo.gotoThread('found_kb');
                        }
                      }
                      next();
                    }
                    else {
                      console.log("ServiceNow returned status " + response.status)
                      next();
                    }
                                
                  }).catch(function(err) {
                      //convo.setVar('error', err);
                      //convo.gotoThread('error');
                      console.log("error " + err)
                      next();
                  });
                });  // before 'search_kb' thread
  
                convo.addQuestion('Did this resolve your issue? [yes, no]', [
                  {
                    pattern:  bot.utterances.yes,
                    callback:  function(response, convo) {
  
                        convo.gotoThread('great');
                    }, 
                  },
                  {
                    pattern:  bot.utterances.no,
                    callback:  function(response, convo) {
                      convo.gotoThread('get_urgency');
                    },
                  },
                  {
                    default:  true,
                    callback:  function(response, convo) {
                      convo.gotoThread('bad_yesno');
                    },
                  }
                ],{},'check_solved');
  
                convo.addMessage({
                  text: 'Great!  Glad I could help.  Goodbye.',
                }, 'great');
  
                convo.addQuestion({text: 'What is the level of urgency?\n\n 1. high\n 2. medium\n 3. low'}, function(res, convo) {
                  convo.gotoThread('add_notes');
                },{key: 'urgency'}, 'get_urgency');
    
                convo.addQuestion('Would you like to add any additional notes? [yes, no]', [
                  {
                    pattern:  bot.utterances.yes,
                    callback:  function(response, convo) {
                      convo.gotoThread('get_notes');
                    }, 
                  },
                  {
                    pattern:  bot.utterances.no,
                    callback:  function(response, convo) {
                      convo.gotoThread('completed');
                    },
                  },
                  {
                    default:  true,
                    callback:  function(response, convo) {
                      convo.gotoThread('bad_yesno');
                    },
                  }
                ],{},'add_notes');
  
                convo.addQuestion({text: 'What other notes should I add to the ticket?'}, function(res, convo) {
                  convo.gotoThread('completed');
                },{key: 'notes'}, 'get_notes');
  
                convo.addMessage({
                  text: 'Successfully created ticket with Incident Number {{vars.ticketnbr}}.',
                  action: 'add_room'
                }, 'completed');
  
                convo.beforeThread('completed', function(convo, next) {
                  dialogData.short_description = convo.extractResponse('short_description');
                  var urgency = convo.extractResponse('urgency');
                  switch(urgency.toLowerCase()) {
                    case 'high', '1':
                      dialogData.urgency = '1';
                      break;
                    case 'medium', '2':
                      dialogData.urgency = '2';
                      break;
                    default:
                      dialogData.urgency = '3';
                  }
                  dialogData.notes = convo.extractResponse('notes');
                  // Add ticket via ServiceNow API - Ryan Howard is the IT Support Rep
                  var serviceNow = require("../backends/servicenow/serviceNow.js");
                  serviceNow.createTicketSpark(dialogData, callerId, 'rhoward1677@gmail.com').then (function(response) {
                    console.log('Status ' + response.status);
                    if (response.status == '201') {
                      console.log('Ticket Number ' + response.data.result.number);
                      convo.setVar('ticketnbr', response.data.result.number);
                      ticketNumber = response.data.result.number;
                      next();
                    }
                    else {
                      convo.setVar('error', 'ServiceNow API returned status ' + response.status + '.');
                      convo.gotoThread('error');
                      next(err);
                    }
  
                  }).catch(function(err) {
                    convo.setVar('error', err);
                    convo.gotoThread('error');
                    next(err);
                  });
                });  // before 'completed' thread
  
                convo.addMessage({
                  text: 'Successfully created Webex Teams Room {{vars.ticketnbr}}.',
                  action: 'add_enduser'
                }, 'add_room');
  
                convo.beforeThread('add_room', function(convo, next) {
                  // Add Tech and End User to Webex Teams Room
                  var spark = require("../lib/spark-api.js");
                  console.log('Creating Webex Teams Room ' + ticketNumber);
                  spark.createRoom(ticketNumber).then (function(room) {
                    console.log('back from create room');
                    if (!room) {
                      console.log('oops');
                      convo.setVar('error', 'Unable to add Webex Teams Room.');
                      convo.gotoThread('error');
                      next(err);
                    }
                    else {
                      console.log('Created Room ' + room.id);
                      roomId = room.id;
                      next();
                    }
  
                  }).catch(function(err) {
                      convo.setVar('error', err);
                      convo.gotoThread('error');
                      next(err);
                  });
                });  // before 'add_room' thread
   
                convo.addMessage({
                  text: 'I have added you to Webex Teams Room {{vars.ticketnbr}}.',
                  action: 'add_tech'
                }, 'add_enduser');
  
                convo.beforeThread('add_enduser', function(convo, next) {
                  // Add End User to Webex Teams Room
                  var spark = require("../lib/spark-api.js");
                  console.log('Adding ' + userEmail + ' to Webex Teams Room ' + roomId);
                  spark.addMemberToRoom(roomId, userEmail, false).then (function(membership) {
                    if (!membership) {
                      convo.setVar('error', 'Unable to add End User to Webex Teams Room.');
                      convo.gotoThread('error');
                      next(err);
                    }
                    else {
                      console.log('Updated Room - added End User');
                      next();
                    }
                  }).catch(function(err) {
                      convo.setVar('error', err);
                      convo.gotoThread('error');
                      next(err);
                  });
                });  // before 'add_enduser' thread
  
                convo.addMessage({
                  text: 'I have added your support rep to Webex Teams Room {{vars.ticketnbr}}.',
                  action: 'goodbye'
                }, 'add_tech');
  
                convo.beforeThread('add_tech', function(convo, next) {
                  // Add Tech to Webex Teams Room
                  var spark = require("../lib/spark-api.js");
                  console.log('Adding rhoward1677@gmail.com to Webex Teams Room ' + roomId);
                  spark.addMemberToRoom(roomId, 'rhoward1677@gmail.com', false).then (function(membership) {
                    if (!membership) {
                      console.log('oops1');
                      convo.setVar('error', 'Unable to add Tech to Webex Teams room.');
                      convo.gotoThread('error');
                      next(err);
                    }
                    else {
                      console.log('Updated Room - added Tech');
                      next();
                    }
                  }).catch(function(err) {
                      convo.setVar('error', err);
                      convo.gotoThread('error');
                      next(err);
                  });
                });  // before 'add_tech' thread
  
                convo.addMessage({
                  text: 'You are all set!  Your support rep will contact you shortly in the Webex Teams Room.  Goodbye.',
                }, 'goodbye');
  
                convo.beforeThread('goodbye', function(convo, next) {
                  // Send ticket description to Webex Teams Room
                  var spark = require("../lib/spark-api.js");
                  var ticketDesc = dialogData.short_description + '\n\n' + dialogData.notes;
                  spark.sendMessage(roomId, 'Ticket Description:\n\n' + ticketDesc).then (function(message) {
                  
                    if (!message) {
                      convo.setVar('error', 'Unable to send description to Webex Teams Room.');
                      convo.gotoThread('error');
                      next(err);
                    }
                    else {
                      console.log('Sent description to Room');
                      next();
                    }
                  }).catch(function(err) {
                      convo.setVar('error', err);
                      convo.gotoThread('error');
                      next(err);
                  });
                });  // before 'goodbye' thread
  
                // Fire off this conversation
                convo.activate();
  
              });  // create conversation
          });  // hears 'create ticket'

            // HELLO Conversation - Display ServiceNow functionality
            controller.hears(['^hello$', '^hi$', '^hi graham$'], 'direct_mention, direct_message', function(bot, message) {
                var userFirstName = '';
                var userEmail = message.user;
                const regex1 = /^[^.]+/;

                // Check if Demo user Michael Scott or Ryan Howard
                if (userEmail.toLowerCase() === 'mscott1677@gmail.com') {
                    userFirstName = 'Michael';
                }
                else if (userEmail.toLowerCase() === 'rhoward1677@gmail.com') {
                    userFirstName = 'Ryan';
                }
                else {
                    userFirstName = userEmail.match(regex1)[0];
                }

                bot.reply(message,"Hello " + userFirstName + ", I am Graham!  What can I do for you?");
            });  // HELLO

            // HELP Conversation - Display Usage, direct message in 1:1 room
            controller.hears(['^help$'], 'direct_message', function(bot, message) {
                var helpstr = 'Hello there friend, I am **Graham**, the CUCM Phone Bot\n\n' 
                + 'You can use the following commands:\n' 
                + '* new phone  - request a new desk phone for an employee';
                bot.reply(message, helpstr);
            });  // HELP, 1:1 room
      
            // HELP Conversation - Display Usage, direct mention in group room
            controller.hears(['^help$'], 'direct_mention', function(bot, message) {
                var helpstr = 'Hello there friend, I am **Graham**, the CUCM Phone Bot\n\n' 
                + 'You can use the following commands:\n' 
                + '* update ticket - modify the ServiceNow ticket associated with this room\n'
                + '* close ticket  - close the ServiceNow ticket associated with this room\n'
                + '* assign phone  - provision the desk phone for an employee';
                bot.reply(message, helpstr);
            });  // HELP, group room

            // NEW PHONE Conversation - Ask to provision a new phone, direct message in 1:1 room
            controller.hears(['new phone'], 'direct_message', function(bot, message) {
                const regex1 = /^[^.]+/;
                const regex2 = /^[^@]+/;
                var userFirstName = '';
                var userEmail = message.user;
                var token;
                var callerId = userEmail.match(regex2)[0];
                let dialogData = {};
                let roomId = '';
                let ticketNumber = '';
                let modelNumber = '';
                let tempPhone = '';

                // Check if Demo user Michael Scott or Ryan Howard
                if (userEmail.toLowerCase() === 'mscott1677@gmail.com') {
                    userFirstName = 'Michael';
                }
                else if (userEmail.toLowerCase() === 'rhoward1677@gmail.com') {
                    userFirstName = 'Ryan';
                }
                else {
                    userFirstName = userEmail.match(regex1)[0];
                }

                bot.createConversation(message, function(err, convo) {
                    // Create Error Thread
                    convo.addMessage({
                      text: 'I have encountered an error - sorry about that!  {{vars.error}}'
                    }, 'error');

                    convo.addMessage({
                        text: 'Ok ' + userFirstName + ", you need a new desk phone, let's get started...",
                        action: 'get_next_phone'
                      }, 'default');

                    convo.addMessage({
                        text: 'Sorry, I was unable to locate an available phone - please call the help desk at x4357.',
                        action: 'goodbye'
                    }, 'no_phone');

                    convo.beforeThread('get_next_phone', function(convo, next) {
                        // Search CUCM for an available phone in new phone MAC range
                        var cucm = require("../lib/axl/axl.js");
                        var version = cucm.getNextPhone();
                        version.then(function(result) {
                          console.log('Phone->name: ' + result['return']['row'][0]['device_name']);
                          console.log('Phone->model: ' + result['return']['row'][0]['model']);
                          convo.setVar('next_phone', result['return']['row'][0]['device_name']);
                          convo.setVar('next_model', result['return']['row'][0]['model']);
                          convo.setVar('ext', result['return']['row'][0]['device_desc'].slice(-12));
                          tempPhone = result['return']['row'][0]['device_name'];
                          modelNumber = result['return']['row'][0]['model'];
                          convo.gotoThread('show_phone');
                        }, function(err) {
                          console.log('Error ' + err);
                        });
                    });  // before 'get_next_phone' thread

                    convo.addMessage({
                      text: 'Luckily, I have found an available **{{vars.next_model}}** in our inventory.\n\n However, before anything else, preparation is the key to success.',
                      action: 'get_user'
                    }, 'show_phone');

                    convo.addQuestion({text: 'Who is this new phone for?  Please provide their Microsoft ID.'}, function(res, convo) {
                      convo.gotoThread('completed');
                    },{key: 'user_id'}, 'get_user');

                    convo.addMessage({
                      text: 'Very well then.  Your ticket number is {{vars.ticketnbr}}.',
                      action: 'add_room'
                    }, 'completed');
      
                    convo.beforeThread('completed', function(convo, next) {
                      dialogData.short_description = 'New desk phone for ' + convo.extractResponse('user_id');
                      dialogData.urgency = '2';
                      dialogData.notes = 'Phone Model: ' + modelNumber;
                      // Add ticket via ServiceNow API - Ryan Howard is the IT Support Rep
                      var serviceNow = require("../backends/servicenow/serviceNow.js");
                      serviceNow.createTicketSpark(dialogData, callerId, 'rhoward1677@gmail.com').then (function(response) {
                        console.log('Status ' + response.status);
                        if (response.status == '201') {
                          console.log('Ticket Number ' + response.data.result.number);
                          convo.setVar('ticketnbr', response.data.result.number);
                          ticketNumber = response.data.result.number;
                          next();
                        }
                        else {
                          convo.setVar('error', 'ServiceNow API returned status ' + response.status + '.');
                          convo.gotoThread('error');
                          next(err);
                        }
      
                      }).catch(function(err) {
                        convo.setVar('error', err);
                        convo.gotoThread('error');
                        next(err);
                      });
                    });  // before 'completed' thread
 
                    convo.addMessage({
                      text: 'A support rep has been notified.',
                      action: 'add_tech'
                    }, 'add_room');
      
                    convo.beforeThread('add_room', function(convo, next) {
                      // Create a Webex Teams room
                      var spark = require("../lib/spark/spark-api.js");
                      console.log('Creating Spark Room ' + ticketNumber);
                      spark.createRoom(ticketNumber).then (function(room) {
                        console.log('back from create room');
                        if (!room) {
                          console.log('oops');
                          convo.setVar('error', 'Unable to add Spark Room.');
                          convo.gotoThread('error');
                          next(err);
                        }
                        else {
                          console.log('Created Room ' + room.id);
                          roomId = room.id;
                          next();
                        }
      
                      }).catch(function(err) {
                          convo.setVar('error', err);
                          convo.gotoThread('error');
                          next(err);
                      });
                    });  // before 'add_room' thread

                    convo.addMessage({
                        text: 'Thank you for your request.',
                        action: 'goodbye'
                      }, 'add_tech');

                      convo.beforeThread('add_tech', function(convo, next) {
                        // Add Tech to Webex Teams Room
                        var spark = require("../lib/spark/spark-api.js");
                        console.log('Adding rhoward1677@gmail.com to Webex Teams Room ' + roomId);
                        spark.addMemberToRoom(roomId, 'rhoward1677@gmail.com', false).then (function(membership) {
                          if (!membership) {
                            console.log('oops1');
                            convo.setVar('error', 'Unable to add Tech to Webex Teams room.');
                            convo.gotoThread('error');
                            next(err);
                          }
                          else {
                            console.log('Updated Room - added Tech');
                            next();
                          }
                        }).catch(function(err) {
                            convo.setVar('error', err);
                            convo.gotoThread('error');
                            next(err);
                        });
                      });  // before 'add_tech' thread

                      convo.addMessage({
                        text: 'Goodbye for now.',
                      }, 'goodbye');

                      convo.beforeThread('goodbye', function(convo, next) {
                        // Send ticket description to Webex Teams Room
                        var spark = require("../lib/spark/spark-api.js");
                        ticketDesc = 'I have a request for a new desk phone.'
                                     + '\n\nHere are the details:\n\n'
                                     + '**Device Name:** ' + tempPhone + '\n\n'
                                     + '**Extension:**      ' + convo.vars.ext + '\n\n'
                                     + '**Model:**            ' + modelNumber + '\n\n'
                                     + '**User:**              ' + convo.extractResponse('user_id') + '\n\n'
                                     + '**Requested By:** ' + userEmail;
                        spark.sendMessage(roomId, ticketDesc).then (function(message) {
                          if (!message) {
                            convo.setVar('error', 'Unable to send description to Webex Teams Room.');
                            convo.gotoThread('error');
                            next(err);
                          }
                          else {
                            console.log('Sent description to Room');
                            next();
                          }
                        }).catch(function(err) {
                            convo.setVar('error', err);
                            convo.gotoThread('error');
                            next(err);
                        });
                      });  // before 'goodbye' thread

                    // Fire off this conversation
                    convo.activate();
                });  // create conversation
            });  // NEW PHONE

            // ASSIGN PHONE Conversation - Ask to assign a new phone, direct mention in a room
            controller.hears(['assign phone'], 'direct_mention', function(bot, message) {
              const regex1 = /^[^.]+/;
              const regex2 = /^[^@]+/;
              var userFirstName = '';
              var userEmail = message.user;
              var token;
              var callerId = userEmail.match(regex2)[0];
              let dialogData = {};
              let roomId = message.channel;
              let roomName = '';
              let ticketNumber = '';
              let deviceName = '';
              let newDeviceName = '';
              let modelNumber = '';
              let user_id = '';
              let requested_by = '';

              // Check if Demo user Michael Scott or Ryan Howard
              if (userEmail.toLowerCase() === 'mscott1677@gmail.com') {
                userFirstName = 'Michael';
              }
              else if (userEmail.toLowerCase() === 'rhoward1677@gmail.com') {
                userFirstName = 'Ryan';
              }
              else {
                  userFirstName = userEmail.match(regex1)[0];
              }

              bot.createConversation(message, function(err, convo) {
                // Create Error Thread
                convo.addMessage({
                  text: 'I have encountered an error - sorry about that!  {{vars.error}}'
                }, 'error');

                convo.addMessage({
                  text: 'Ok ' + userFirstName + ", you need to assign this desk phone, let's get started...",
                  action: 'get_room'
                }, 'default');

                convo.addMessage({
                  text: 'Please wait while I retrieve the phone information...',
                  action: 'get_messages'
                }, 'get_room');

                convo.beforeThread('get_room', function(convo, next) {
                  // Get Webex Teams Room Name
                  var spark = require("../lib/spark/spark-api.js");
                  spark.getRoom(roomId).then (function(room) {
                    if (!room) {
                      convo.setVar('error', 'Unable to retrieve Webex Teams Room.');
                      convo.gotoThread('error');
                      next(err);
                    }
                    else {
                      console.log('Got Room ' + room.title);
                      convo.setVar('roomname', room.title);
                      roomName = room.title;
                      next();
                    }
                  }).catch(function(err) {
                      convo.setVar('error', err);
                      convo.gotoThread('error');
                      next(err);
                  });
                });  // before 'get_room' thread

                convo.addQuestion({text: "All set.\n\nPlease scan the MAC address on a **{{ vars.model }}** for **{{ vars.user_id }}**"}, function(res, convo) {
                  console.log("you said " + res.text);
                  deviceName = res.text;
                  convo.setVar('device_name', 'SEP' + res.text.toUpperCase());
                  newDeviceName = 'SEP' + res.text.toUpperCase();
                  convo.gotoThread('completed');
                },{}, 'get_messages');

                convo.addMessage({
                  text: 'Got It.  The Phone Name is {{ vars.device_name }}.',
                  action: 'update_phone'
                }, 'completed');

                convo.beforeThread('completed', function(convo, next) {
                  // Get the user first name and last name from CUCM via user id
                  var cucm = require("../lib/axl/axl.js");
                  var version = cucm.getUser(user_id);
                  version.then(function(result) {
                    console.log('getUser Success');
                    console.log(result['return']['user']['firstName']);
                    convo.setVar('phone_desc', result['return']['user']['firstName'] + ' ' + result['return']['user']['lastName']);
                    next();
                  }, function(err) {
                    console.log('Error ' + err);
                  });
                });  // before 'completed' thread

                convo.beforeThread('get_messages', function(convo, next) {
                  // Get Webex Teams Room Name
                  var spark = require("../lib/spark/spark-api.js");
                  spark.getMessages(roomId).then (function(messages) {
                    if (!messages) {
                      convo.setVar('error', 'Unable to retrieve Webex Teams Room Messages.');
                      convo.gotoThread('error');
                      next(err);
                    }
                    else {
                      messages.forEach(function(element) {
                        if (element.text.indexOf('Device Name:') > -1) {
                          device_name = element.text.substring(element.text.indexOf('Device Name:') + 13, element.text.indexOf('Extension:') - 1);
                          convo.setVar('old_device', device_name);
                          console.log("Device Name: '" + device_name + "'");
                        }
                        if (element.text.indexOf('Extension:') > -1) {
                          ext = element.text.substring(element.text.indexOf('Extension:') + 11, element.text.indexOf('Model:') - 1);
                          convo.setVar('ext', ext);
                          console.log("Extension: '" + ext + "'");
                        }
                        if (element.text.indexOf('Model:') > -1) {
                          modelNumber = element.text.substring(element.text.indexOf('Model:') + 7, element.text.indexOf('User:') - 1);
                          convo.setVar('model', modelNumber);
                          console.log("Model: '" + modelNumber + "'");
                        }
                        if (element.text.indexOf('User:') > -1) {
                          user_id = element.text.substring(element.text.indexOf('User:') + 6, element.text.indexOf('Requested By:') - 1);
                          convo.setVar('user_id', user_id);
                          console.log("User Id: '" + user_id + "'");
                        }
                        if (element.text.indexOf('Requested By:') > -1) {
                          requested_by = element.text.substring(element.text.indexOf('Requested By:') + 14);
                          convo.setVar('requested_by', requested_by);
                          console.log("Requested By: '" + requested_by + "'");
                        }
                      });
                      next();
                    }
                  }).catch(function(err) {
                      convo.setVar('error', err);
                      convo.gotoThread('error');
                      next(err);
                  });
                });  // before 'get_messages' thread

                // Update Phone MAC Address
                convo.addMessage({
                  text: 'I am now updating the phone owner.',
                  action: 'update_phone_owner'
                }, 'update_phone');

                convo.beforeThread('update_phone', function(convo, next) {
                  // Change the MAC address to newly scanned phone
                  var cucm = require("../lib/axl/axl.js");
                  var update_phone = cucm.updatePhone(device_name, newDeviceName, convo.vars.phone_desc + ' ' + convo.vars.ext);
                  update_phone.then(function(result) {
                    console.log('Update Phone Success');
                    console.log(result['return']);
                    next();
                  }, function(err) {
                    console.log('Error ' + err);
                  });
                });  // before 'update_phone' thread

                // Update Phone Owner
                convo.addMessage({
                  text: 'The phone has been successfully assigned.',
                  action: 'goodbye'
                }, 'update_phone_owner');

                convo.beforeThread('update_phone_owner', function(convo, next) {
                  // Update the phone owner with the LDAP user id
                  var cucm = require("../lib/axl/axl.js");
                  var update_owner = cucm.updatePhoneOwner(newDeviceName, user_id);
                  update_owner.then(function(result) {
                    console.log('Update Phone Owner Success');
                    console.log(result['return']);
                    next();
                  }, function(err) {
                    console.log('Error ' + err);
                  });
                });  // before 'update_phone_owner' thread

                // Goodbye
                convo.addMessage({
                  text: 'Goodbye for now.'
                }, 'goodbye');

                // Fire off this conversation
                convo.activate();
              });  // create conversation

            });  // ASSIGN PHONE

        // CLOSE Ticket Conversation - Close a ServiceNow ticket, delete room
        controller.hears(['^close ticket$'], 'direct_mention', function(bot, message) {
          const regex = /^[^@]+/;
          var userEmail = message.user;
          var callerId = userEmail.match(regex)[0];
          let roomName = '';
          var roomId = message.channel;
          let dialogData = {};
          bot.createConversation(message, function(err, convo) {
            // Create Error Thread
              convo.addMessage({
              text: 'I have encountered an error - sorry about that!  {{vars.error}}'
            }, 'error');
            
            convo.addMessage({
              text: "Sorry, I didn't understand, please enter 'yes' or 'no'",
              action: 'default',
            }, 'bad_yesno');

            convo.addMessage({
              text: 'Close the ServiceNow Ticket?',
              action: 'get_messages'
            }, 'default');

            convo.addMessage({
              text: 'Alright then!',
              action: 'get_room'
            }, 'get_messages');

            convo.beforeThread('get_messages', function(convo, next) {
              // Get Webex Teams Room phone info
              var spark = require("../lib/spark/spark-api.js");
              spark.getMessages(roomId).then (function(messages) {
                if (!messages) {
                  convo.setVar('error', 'Unable to retrieve Webex Teams Room Messages.');
                  convo.gotoThread('error');
                  next(err);
                }
                else {
                  messages.forEach(function(element) {
                    if (element.text.indexOf('Extension:') > -1) {
                      ext = element.text.substring(element.text.indexOf('Extension:') + 11, element.text.indexOf('Model:') - 1);
                      convo.setVar('ext', ext);
                      console.log("Extension: '" + ext + "'");
                    }
                    if (element.text.indexOf('User:') > -1) {
                      user_id = element.text.substring(element.text.indexOf('User:') + 6, element.text.indexOf('Requested By:') - 1);
                      convo.setVar('user_id', user_id);
                      console.log("User Id: '" + user_id + "'");
                    }
                  });
                  next();
                }
              }).catch(function(err) {
                  convo.setVar('error', err);
                  convo.gotoThread('error');
                  next(err);
              });
            });  // before 'get_messages' thread

            convo.addMessage({
              text: 'I am closing ServiceNow ticket {{vars.roomname}}.',
              action: 'get_ticket_id'
            }, 'get_room');

            convo.beforeThread('get_room', function(convo, next) {
              // Get Webex Teams Room Name
              var spark = require("../lib/spark/spark-api.js");
              spark.getRoom(roomId).then (function(room) {
                if (!room) {
                  convo.setVar('error', 'Unable to retrieve Webex Teams Room.');
                  convo.gotoThread('error');
                  next(err);
                }
                else {
                  console.log('Got Room ' + room.title);
                  convo.setVar('roomname', room.title);
                  roomName = room.title;
                  next();
                }
              }).catch(function(err) {
                  convo.setVar('error', err);
                  convo.gotoThread('error');
                  next(err);
              });
            });  // before 'get_room' thread

            convo.addMessage({
              text: 'One Moment Please.',
              action: 'close_ticket'
            }, 'get_ticket_id');

            // Thread to look up the ticket number
            // Sets the Ticket Id in the dialog variable to be used
            // by the Put to ServiceNow
            convo.beforeThread('get_ticket_id', function(convo, next) {
              // Get ticket via ServiceNow API
              var serviceNow = require("../backends/servicenow/serviceNow.js");
              serviceNow.getTicketByNumber(roomName).then (function(response) {
                if (response.status == '200') {
                  console.log(response);
                  console.log('Ticket Sys Id ' + response.data.result[0].sys_id);
                  console.log('Caller ' + response.data.result[0].caller_id.link);
                  convo.setVar('ticketnbr', convo.extractResponse('ticketnbr').toUpperCase());
                  convo.setVar('user_link', response.data.result[0].caller_id.link);
                  // Collect the Ticket Id and current state
                  dialogData.ticketId = response.data.result[0].sys_id;
                  next();
                }
                else {
                  convo.setVar('error', 'ServiceNow API returned status ' + response.status + '.');
                  convo.gotoThread('error');
                  next(err);
                }
              
              }).catch(function(err) {
                convo.setVar('error', err);
                convo.gotoThread('error');
                next(err);
              });
            });  // before 'get_ticket_id' thread

            convo.addMessage({
              text: 'Successfully closed ServiceNow ticket {{vars.roomname}}.',
              action: 'get_requestor_name'
            }, 'close_ticket');

            convo.beforeThread('close_ticket', function(convo, next) {
              // Close ServiceNow ticket
              var serviceNow = require("../backends/servicenow/serviceNow.js");
              console.log("Updating ticket state to closed for ticket " + roomName);
              serviceNow.closeTicket(dialogData.ticketId, callerId, 'Solved (Permanently)', 'Provisioned new phone with extension ' + convo.vars.ext).then (function(response) {
                if (response.status == '200') {
                  console.log('Successfully updated ticket state');
                  next();
                }
                else {
                  convo.setVar('error', 'ServiceNow API returned status ' + response.status + '.');
                  convo.gotoThread('error');
                  next(err);
                }
                            
              }).catch(function(err) {
                  convo.setVar('error', err);
                  convo.gotoThread('error');
                  next(err);
              });
            });  // before 'close_ticket' thread

                // Lookup User to find caller name from ServiceNow
                convo.addMessage({
                  text: 'Please wait while I prepare to notify the phone requestor.',
                  action: 'get_user_room'
                }, 'get_requestor_name');

                // Thread to look up the ticket creator in SN
                convo.beforeThread('get_requestor_name', function(convo, next) {
                  // Get ticket via ServiceNow API
                  var serviceNow = require("../backends/servicenow/serviceNow.js");
                  serviceNow.getUserByLink(convo.vars.user_link).then (function(response) {
                    if (response.status == '200') {
                      console.log('Requestor ' + response.data.result.name);
                      convo.setVar('requestor_name', response.data.result.name);
                      next();
                    }
                    else {
                      convo.setVar('error', 'ServiceNow API returned status ' + response.status + '.');
                      convo.gotoThread('error');
                      next(err);
                    }
                  
                  }).catch(function(err) {
                    convo.setVar('error', err);
                    convo.gotoThread('error');
                    next(err);
                  });
                });  // before 'patience' thread

                // Lookup User
                convo.addMessage({
                  text: 'Thank you for your patience.',
                  action: 'notify_user'
                }, 'get_user_room');

                convo.beforeThread('get_user_room', function(convo, next) {
                  // Get 1:1 Webex Teams room id of requestor to let them know the phone is ready
                  var spark = require("../lib/spark/spark-api.js");
                  spark.getRooms().then (function(rooms) {
                    if (!rooms) {
                      convo.setVar('error', 'Unable to collect Webex Teams 1:1 Rooms.');
                      convo.gotoThread('error');
                      next(err);
                    }
                    else {
                      console.log('Got Rooms');
                      rooms.forEach(function(room) {
                        if (room.title.toUpperCase() == convo.vars.requestor_name.toUpperCase()) {
                          requestor_roomId = room.id;
                          console.log("Requestor Room Id: '" + requestor_roomId + "'");
                          convo.setVar('requestor_roomId', requestor_roomId);
                        }
                      });
                      next();
                    }
                  }).catch(function(err) {
                      convo.setVar('error', err);
                      convo.gotoThread('error');
                      next(err);
                  });
                });  // before 'notify_user' thread

                // Notify User
                convo.addMessage({
                  text: '{{ vars.requestor_name }} has been notified.',
                  action: 'ask_delete'
                }, 'notify_user');

                convo.beforeThread('notify_user', function(convo, next) {
                  // Notify user phone is ready
                  var spark = require("../lib/spark/spark-api.js");
                  var message_text = 'Hello, the phone for **' + convo.vars.user_id + '** is all set!\n\n' + 
                                     'The extension is **' + convo.vars.ext + '**\n\n' +
                                     'I hope I have been of great service to you.\n\nGoodbye.';
                  spark.sendMessage(convo.vars.requestor_roomId, message_text).then (function(message) {
                    if (!message) {
                      convo.setVar('error', 'Unable to send notification message to Webex Teams Room.');
                      convo.gotoThread('error');
                      next(err);
                    }
                    else {
                      console.log('Sent notification to Room');
                      next();
                    }
                  }).catch(function(err) {
                      convo.setVar('error', err);
                      convo.gotoThread('error');
                      next(err);
                  });
                });  // before 'notify_user' thread

            convo.addQuestion('Would you like to delete this room? [yes, no]', [
              {
                pattern:  bot.utterances.yes,
                callback:  function(response, convo) {
                  convo.gotoThread('before_delete_room');
                }, 
              },
              {
                pattern:  bot.utterances.no,
                callback:  function(response, convo) {
                  convo.gotoThread('goodbye');
                },
              },
              {
                default:  true,
                callback:  function(response, convo) {
                  convo.gotoThread('bad_yesno');
                },
              }
            ],{},'ask_delete');

            convo.addMessage({
              text: 'I will now delete this room.',
              action: 'delete_room'
            }, 'before_delete_room');

            convo.addMessage({
              text: 'Goodbye.',
            }, 'delete_room');

            convo.addMessage({
              text: 'Very well then.  Goodbye.',
            }, 'goodbye');

            convo.beforeThread('delete_room', function(convo, next) {
              // Delete Spark Room
              var spark = require("../lib/spark/spark-api.js");
              spark.deleteRoom(roomId);
              next();
            });  // before 'delete_room' thread

            // Fire off this conversation
            convo.activate();

          });  // create conversation
        });  // hears 'close ticket'

        // UPDATE Conversation - Update a ServiceNow Ticket from a 1:1 room
        controller.hears(['^update ticket$'], 'direct_message', function(bot, message) {
            const regex = /^[^@]+/;
            var userEmail = message.user;
            var callerId = userEmail.match(regex)[0];
            let dialogData = {};
            bot.createConversation(message, function(err, convo) {
              // Update Error Threads
              convo.addMessage({
                text: 'I was unable to find your ticket - sorry about that!  {{vars.error}}'
              }, 'error_find');
              convo.addMessage({
                text: 'I was unable to update your ticket - sorry about that!  {{vars.error}}'
              }, 'error_update');
  
              convo.addMessage({
                text: "Sorry, I didn't understand, please enter 'work notes' or 'state'",
                action: 'default',
              }, 'bad_field');
  
              convo.addQuestion({text: "What is the number of the ticket you'd like to update?"}, function(res, convo) {
                convo.gotoThread('lemme_fetch');
              },{key: 'ticketnbr'}, 'default');
  
              convo.addMessage({
                text: "Let me fetch that ticket for you.",
                action: 'get_field'
              }, 'lemme_fetch');
  
              convo.addMessage({
                text: 'Successfully updated the notes on Incident Number {{vars.ticketnbr}}.  Goodbye.',
              }, 'completed_notes');
  
              convo.addMessage({
                text: 'Successfully updated the state on Incident Number {{vars.ticketnbr}}.  Goodbye.',
              }, 'completed_state');
  
              // Currently, the bot can only update Notes or State
              convo.addQuestion("What field would you like to modify? [work notes, state]", [
                {
                  pattern:  'work notes',
                  callback:  function(response, convo) {
                    convo.gotoThread('get_notes');
                  }, 
                },
                {
                  pattern:  'state',
                  callback:  function(response, convo) {
                    convo.gotoThread('get_state');
                  },
                },
                {
                  default:  true,
                  callback:  function(response, convo) {
                    convo.gotoThread('bad_field');
                  },
                }
              ],{},'get_field');
  
              // Collect the Notes
              convo.addQuestion({text: 'Please enter the notes you wish to add:'}, function(res, convo) {
                convo.gotoThread('completed_notes');
              },{key: 'notes'}, 'get_notes');
  
              // Collect the new State
              // ** ToDo:  Get the current state from SN and verify they don't change to the same state - add error message if so
              convo.addQuestion({text: 'What shall I change the state to?\n 1. new\n 2. in progress\n 3. on hold\n 4. resolved\n 5. closed'}, function(res, convo) {
                convo.gotoThread('completed_state');
              },{key: 'new_state'}, 'get_state');
  
              // Thread to look up the ticket number
              // Sets the Ticket Id in the dialog variable to be used
              // by the Put to ServiceNow
              convo.beforeThread('get_field', function(convo, next) {
                // Get ticket via ServiceNow API
                var serviceNow = require("../backends/servicenow/serviceNow.js");
                serviceNow.getTicketByNumber(convo.extractResponse('ticketnbr')).then (function(response) {
                  if (response.status == '200') {
                    console.log(response);
                    console.log('Ticket Sys Id ' + response.data.result[0].sys_id);
                    convo.setVar('ticketnbr', convo.extractResponse('ticketnbr').toUpperCase());
                    // Collect the Ticket Id and current state
                    dialogData.ticketId = response.data.result[0].sys_id;
                    //dialogData.current_state = response.data.result[0].state;
                    next();
                  }
                  else {
                    convo.setVar('error', 'ServiceNow API returned status ' + response.status + '.');
                    convo.gotoThread('error_find');
                    next(err);
                  }
                
                }).catch(function(err) {
                  convo.setVar('error', err);
                  convo.gotoThread('error_find');
                  next(err);
                });
              });  // before 'get_field' thread
  
              // Thread to update the ServiceNow ticket with a new note 
              convo.beforeThread('completed_notes', function(convo, next) {
                // Update ticket via ServiceNow API
                var serviceNow = require("../backends/servicenow/serviceNow.js");
                serviceNow.updateTicket(dialogData.ticketId, convo.extractResponse('notes'), callerId).then (function(response) {
                  if (response.status == '200') {
                    console.log('Successfully updated ticket notes');
                    next();
                  }
                  else {
                    convo.setVar('error', 'ServiceNow API returned status ' + response.status + '.');
                    convo.gotoThread('error_update');
                    next(err);
                  }
                              
                  }).catch(function(err) {
                    convo.setVar('error', err);
                    convo.gotoThread('error_update');
                    next(err);
                  });
              });  // before 'completed_notes' thread
  
              // Thread to update the ServiceNow ticket state
              // ** ToDo: collect the caller's ServiceNow User Id either via email address from Webex Teams message or prompt for it
              // ** Currently hard-coded to 'mrobinson'
              convo.beforeThread('completed_state', function(convo, next) {
                // Update ticket via ServiceNow API
                var state = convo.extractResponse('new_state');
                var new_state = '';
                switch(state.toLowerCase()) {
                  case 'in progress', '2':
                    new_state = '2';
                    break;
                  case 'on hold', '3':
                    new_state = '3';
                    break;
                  case 'resolved', '4':
                    new_state = '4';
                    break;
                  case 'closed', '5':
                    new_state = '7';
                    break;
                  default:
                    new_state = '1';
                }
                var serviceNow = require("../backends/servicenow/serviceNow.js");
                serviceNow.updateTicketState(dialogData.ticketId, new_state, callerId).then (function(response) {
                  if (response.status == '200') {
                    console.log('Successfully updated ticket state');
                    next();
                  }
                  else {
                    convo.setVar('error', 'ServiceNow API returned status ' + response.status + '.');
                    convo.gotoThread('error_update');
                    next(err);
                  }
                              
                  }).catch(function(err) {
                    convo.setVar('error', err);
                    convo.gotoThread('error_update');
                    next(err);
                  });
              });  // before 'completed_state' thread
  
              // Fire off this conversation
              convo.activate();
              
              // Fired at end of conversation - displays prior to final message, so removed for now
              //convo.on('end', function(convo) {
              //  if (convo.successful()) {
              //    bot.reply(message, 'Goodbye.');
              //  }
              //});
            });  // create conversation
          });  // UPDATE TICKET, 1:1 room
}