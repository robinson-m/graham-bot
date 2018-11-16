/*
 *  axl.js
 */
let crypto = require('../crypto/crypto.js');
let soap = require('strong-soap').soap;
let fs = require('fs');
let https = require("https");

const wsdl_path = __dirname + '/wsdl/' + process.env.cucm_version;
const wsdl_uri = wsdl_path + '/AXLAPI.wsdl';
const auth = process.env.cucm_user + ":" + crypto.decrypt(process.env.cucm_password);

// Set Headers for every AXL Request
const axl_headers = {
  'Authorization': 'Basic ' + new Buffer(auth).toString('base64'),
  'Content-Type': 'text/xml; charset=utf-8',
  'SOAPAction': '"CUCM:DB ver=' + process.env.cucm_version + '"',
  'Cache-Control': 'no-cache'
}

// Set CUCM Properties
var options = {
  host: process.env.cucm_host,     // IP Address of the Communications Manager Server
  port: process.env.cucm_port,     // CUCM AXL Port
  path: '/axl/',                   // URL for accessing AXL on the server
  method: 'POST',                  // AXL Requires POST messages
  headers: axl_headers,            // AXL headers with Basic Authorization
  rejectUnauthorized: false        // Required to accept self-signed certificate
};

// Options for every AXL Request
const axl_options = {
  // URL for accessing AXL on the server
  endpoint: 'https://' +  process.env.cucm_host + ':' + process.env.cucm_port + '/axl/'
};

/*
 *  -- AXL Calls Begin --
 */
/* -------------------------------------
 *  getCCMVersion
 *  Verify AXL is up and running
 * -------------------------------------*/
function getCCMVersion() {
  // Make sure the CUCM files exist
  if (!verifyWSDL()) {
    console.log('Exiting due to missing AXL Files!');
    process.exit(1);
  } 

  return new Promise(function(resolve, reject) {
  // Create the client
  soap.createClient(wsdl_uri, axl_options, function (err, client) {
    if (!err) {
      client.setSecurity(new soap.ClientSSLSecurity(undefined, undefined, {rejectUnauthorized: false}));
      client.getCCMVersion(null, function (err, result) {
        if (err) {
          console.log('getCCMVersion->soap api error is: ' + err);
          console.log('getCCMVersion->last request: ' + client.lastRequest);
          console.log('getCCMVersion->response is: ', result);
          reject(err);
        }
        console.log('getCCMVersion->result is ', JSON.stringify(result));

        var s = JSON.stringify(result);
        var j = JSON.parse(s);
        console.log('getCCMVersion->' + j['return']['componentVersion']['version']);
        resolve(j['return']['componentVersion']['version']);
      }, null, axl_headers); // getCCMVersion
    }
    else {
      console.log('getCCMVersion->Error in createClient: ', err);
    }
});
  });
} // getCCMVersion

/* -------------------------------------
 *  getNextPhone
 *  Get Next Available Phone
 * -------------------------------------*/
function getNextPhone2() {
  var soapBody = new Buffer('<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://www.cisco.com/AXL/API/' + process.env.cucm_version + '">' +
    '<soapenv:Header/>' +
    '<soapenv:Body>' +
	  '<ns:getCCMVersion sequence="1">' +
    '</ns:getCCMVersion>' +
    '</soapenv:Body>' +
    '</soapenv:Envelope>');

  return new Promise(function(resolve, reject) {
    var req = https.request(options, function(res) {
        console.log("getNextPhone->Status Code=" + res.statusCode);
        res.setEncoding('utf8');
        res.on('data', function(d) {
          console.log('Got Data: ' + d);
          var xml2js = require('xml2js').parseString;
          xml2js(d, function (err, result) {
            console.dir(result);
            var ver = result['soapenv:Envelope']['soapenv:Body'][0];  //['soapenv:http://schemas.xmlsoap.org/soap/envelope/'][0];
            console.log('VER ' + ver);
            resolve(result);
          });
        });
    });

    req.write(soapBody);
    req.end();
    req.on('error', function(e) {
      console.error(e);
      reject(err);
    });
  }); 
}

/* -------------------------------------
 *  getNextPhone
 *  Get next Phone for new users
 * -------------------------------------*/
function getNextPhone() {
  // Make sure the CUCM files exist
  if (!verifyWSDL()) {
    console.log('Exiting due to missing AXL Files!');
    process.exit(1);
  } 

  // Request Arguments
  var args = {
    sql: "SELECT device.name AS device_name, device.description as device_desc, typemodel.name AS model FROM device JOIN typemodel on device.tkmodel = typemodel.enum WHERE device.name LIKE 'SEP4A415300%' ORDER BY device.name"
  };

  return new Promise(function(resolve, reject) {
    // Create the client
    soap.createClient(wsdl_uri, axl_options, function (err, client) {
      if (!err) {
        client.setSecurity(new soap.ClientSSLSecurity(undefined, undefined, {rejectUnauthorized: false}));
        client.executeSQLQuery(args, function (err, result) {
          if (err) {
            console.log('getNextPhone->soap api error is: ' + err);
            console.log('getNextPhone->last request: ' + client.lastRequest);
            console.log('getNextPhone->response is: ', result);
            reject(err);
          }
          console.log('getNextPhone->result is ', JSON.stringify(result));

          var s = JSON.stringify(result);
          var j = JSON.parse(s);
          resolve(j);
        }, null, axl_headers); // getNextPhone
      }
      else {
        console.log('getNextPhone->Error in createClient: ', err);
      }
    });
  });
}  // getNextPhone

/* -------------------------------------
 *  getRoutePartition
 *  Get Route Partition based on its name
 * -------------------------------------*/
function getRoutePartition(pname) {
  // Make sure the CUCM files exist
  if (!verifyWSDL()) {
    console.log('Exiting due to missing AXL Files!');
    process.exit(1);
  } 

  var args = {
    name: pname,
    sequence: "1"
  };

  // Create the client
  soap.createClient(wsdl_uri, axl_options, function (err, client) {
    if (!err) {
      client.setSecurity(new soap.ClientSSLSecurity(undefined, undefined, {rejectUnauthorized: false}));
      client.getRoutePartition(args, function (err, result) {
        if (err) {
          console.log('getRoutePartition->soap api error is: ' + err);
          console.log('getRoutePartition->last request: ' + client.lastRequest);
          console.log('getRoutePartition->response is: ', result);
          process.exit(1);
        }
        console.log('getRoutePartition->result is ', JSON.stringify(result));

        var s = JSON.stringify(result);
        var j = JSON.parse(s);
        console.log('getRoutePartition->uuid: ' + j['return']['routePartition']['$attributes']['uuid']);
        console.log('getRoutePartition->name: ' + j['return']['routePartition']['name']);
        console.log('getRoutePartition->description: ' + j['return']['routePartition']['description']);
        console.log('getRoutePartition->timeZone: ' + j['return']['routePartition']['timeZone']);
        console.log('getRoutePartition->partitionUsage: ' + j['return']['routePartition']['partitionUsage']);
      }, null, axl_headers); // getRoutePartition
    }
    else {
      console.log('getRoutePartition->Error in createClient: ', err);
    }
  });
} // getRoutePartition

/* -------------------------------------
 *  getUser
 *  Get User based on user id
 * -------------------------------------*/
function getUser(user_id) {
  // Make sure the CUCM files exist
  if (!verifyWSDL()) {
    console.log('Exiting due to missing AXL Files!');
    process.exit(1);
  } 

  var args = {
    userid: user_id,
    sequence: "1"
  };

  // Create the client
  return new Promise(function(resolve, reject) {
    soap.createClient(wsdl_uri, axl_options, function (err, client) {
      if (!err) {
        client.setSecurity(new soap.ClientSSLSecurity(undefined, undefined, {rejectUnauthorized: false}));
        client.getUser(args, function (err, result) {
          if (err) {
            console.log('getUser->soap api error is: ' + err);
            console.log('getUser->last request: ' + client.lastRequest);
            console.log('getUser->response is: ', result);
            process.exit(1);
          }
          console.log('getUser->result is ', JSON.stringify(result));

          var s = JSON.stringify(result);
          var j = JSON.parse(s);
          console.log(j);
          resolve(j);
        }, null, axl_headers); // getUser
      }
      else {
        console.log('getUser->Error in createClient: ', err);
      }
    });
  });
} // getUser

/* -------------------------------------
 *  updatePhone
 *  Update Phone based on its MAC
 * -------------------------------------*/
function updatePhone(old_mac, new_mac, description) {
  // Make sure the CUCM files exist
  if (!verifyWSDL()) {
    console.log('Exiting due to missing AXL Files!');
    process.exit(1);
  } 

  // Request Arguments
  var args = {
    name: checkMAC(old_mac),
    newName: checkMAC(new_mac),
    description: description,
    sequence: "1"
  };

  console.log("updatePhone->old device is " + old_mac);
  console.log("updatePhone->new device is " + new_mac);
  console.log("updatePhone->description is " + description);

    // Create the client
    return new Promise(function(resolve, reject) {
      soap.createClient(wsdl_uri, axl_options, function (err, client) {
        if (!err) {
          client.setSecurity(new soap.ClientSSLSecurity(undefined, undefined, {rejectUnauthorized: false}));
          client.updatePhone(args, function (err, result) {
            if (err) {
              console.log('updatePhone->soap api error is: ' + err);
              console.log('updatePhone->last request: ' + client.lastRequest);
              console.log('updatePhone->response is: ', result);
              process.exit(1);
            }
            console.log('updatePhone->result is ', JSON.stringify(result));

            var s = JSON.stringify(result);
            var j = JSON.parse(s);
            resolve(j);
          }, null, axl_headers); // updatePhone
        }
        else {
          console.log('updatePhone->Error in createClient: ', err);
        }
      });
    });
}  // updatePhone

/* -------------------------------------
 *  updatePhoneOwner
 *  Update Phone Owner via device name
 * -------------------------------------*/
function updatePhoneOwner(device_name, user_id) {
  // Make sure the CUCM files exist
  if (!verifyWSDL()) {
    console.log('Exiting due to missing AXL Files!');
    process.exit(1);
  } 

  var sql = "update device " +
            "set fkenduser = (select pkid from enduser where userid = '" + user_id + "') " +
            "where name = '" + device_name + "';"

  // Request Arguments
  var args = {
    sql: sql,
    sequence: "1"
  };

    // Create the client
    return new Promise(function(resolve, reject) {
      soap.createClient(wsdl_uri, axl_options, function (err, client) {
        if (!err) {
          client.setSecurity(new soap.ClientSSLSecurity(undefined, undefined, {rejectUnauthorized: false}));
          client.executeSQLUpdate(args, function (err, result) {
            if (err) {
              console.log('updatePhoneOwner->soap api error is: ' + err);
              console.log('updatePhoneOwner->last request: ' + client.lastRequest);
              console.log('updatePhoneOwner->response is: ', result);
              process.exit(1);
            }
            console.log('updatePhoneOwner->result is ', JSON.stringify(result));

            var s = JSON.stringify(result);
            var j = JSON.parse(s);
            resolve(j);
          }, null, axl_headers); // updatePhoneOwner
        }
        else {
          console.log('updatePhoneOwner->Error in createClient: ', err);
        }
      });
    });
}  // updatePhoneOwner
/*
 *  -- AXL Calls End --
 */

/* -------------------------------------
 *  checkMAC
 *  Adds 'SEP' if missing from Device Name
 * -------------------------------------*/
function checkMAC(dname) {
   // Add SEP prefix if missing
   if (!dname.toUpperCase().startsWith("SEP")) {
     dname = "SEP" + dname;
   }
   return dname;
}

/* -------------------------------------
 *  verifyWSDL
 *  Check for 3 AXL Files
 * -------------------------------------*/
function verifyWSDL() {
  if (!fs.existsSync(wsdl_uri)) {
    let err = new Error('Failed to locate AXL WSDL file!');
    err.path = wsdl_uri;
    console.log(err);
    return false;
  }
  if (!fs.existsSync(wsdl_path + '/AXLEnums.xsd')) {
    let err = new Error('Failed to locate AXL Enums XSD file!');
    err.path = wsdl_path + '/AXLEnums.xsd';
    console.log(err);
    return false;
  }
  if (!fs.existsSync(wsdl_path + '/AXLSoap.xsd')) {
    let err = new Error('Failed to locate AXL SOAP XSD file!');
    err.path = wsdl_path + '/AXLSoap.xsd';
    console.log(err);
    return false;
  }
  return true;
}

module.exports = {
  getCCMVersion,
  getNextPhone, 
  getRoutePartition,
  getUser,
  updatePhone,
  updatePhoneOwner
};