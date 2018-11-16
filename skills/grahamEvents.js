module.exports = function(controller) {
    
        controller.on('bot_space_join', function(bot,message) {
          bot.reply(message, 'Hello, ' + message.original_message.data.personDisplayName + ', I am **Graham**, the CUCM Phone Bot!');
        });

        controller.on('user_space_join', function(bot,message) {
          bot.reply(message, 'Hello, ' + message.raw_message.data.personDisplayName + ', I am **Graham**, the CUCM Phone Bot!');
        });

        controller.on('user_space_leave', function(bot,message) {
          bot.reply(message, 'Goodbye ' + message.raw_message.data.personDisplayName + '!');
        });

        controller.on('ambient', function(bot,message) {
          bot.say({text: 'hey hey my friend', channel: message.channel})
        });
    }