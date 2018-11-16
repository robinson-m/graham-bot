/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a Cisco Webex Teams bot built with Botkit.

# RUN THE BOT:
  Follow the instructions here to set up your Cisco Spark bot:
    -> https://developer.webex.com/bots.html
  Run your bot from the command line:
    access_token=<MY BOT ACCESS TOKEN> public_address=<MY PUBLIC HTTPS URL> node bot.js



~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
var env = require('node-env-file');
env(__dirname + '/.env');

console.log(process.env.webex_access_token);
if (!process.env.webex_access_token) {
    console.log('Error: Specify a Cisco Webex Teams access_token in environment.');
    //usage_tips
    process.exit(1);
}

if (!process.env.webex_public_address) {
    console.log('Error: Specify an SSL-enabled URL as this bot\'s public_address in environment.');
    //usage_tip();
    process.exit(1);
}

var Botkit = require('botkit');
var debug = require('debug')('botkit:main');

// Create the Botkit controller, which controls all instances of the bot.
var controller = Botkit.sparkbot({
    debug: true,
    log: true,
    //limit_to_domain: 'cdw.com',
    // limit_to_org: 'my_cisco_org_id',
    public_address: process.env.webex_public_address,
    ciscospark_access_token: process.env.webex_access_token,
    studio_token: process.env.studio_token, // get one from studio.botkit.ai to enable content management, stats, message console and more
    secret: process.env.secret, // this is an RECOMMENDED but optional setting that enables validation of incoming webhooks
    webhook_name: process.env.webex_webhook_name
});

var bot = controller.spawn({});

controller.setupWebserver(process.env.bot_port || 3000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log("Cisco Webex Teams: Webhooks set up!");
    });
});

// Load events and skills
var normalizedPath = require("path").join(__dirname, "skills");
require("fs").readdirSync(normalizedPath).forEach(function(file) {
  require("./skills/" + file)(controller);
});
