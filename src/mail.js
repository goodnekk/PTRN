var config = require('./config.json');
//var mailgun = require('mailgun-js')({apiKey: config.mail.apiKey, domain: config.mail.domain});
//
//module.exports = {
//	password: function(adress, pass, callback){
//		var message = {
//			from: config.mail.from,
//			to: adress,
//			subject: 'Uw tijdelijke wachtwoord',
//			text: 'Planlab login \n\n Uw tijdelijke wachtwoord is: '+pass,
//			html: '<h1>Planlab login</h1> <p>Uw tijdelijke wachtwoord is:</p> <p style="padding: 20px; background:#ECF0F1;">'+pass+'</p><p>kopieer en plak het bovenstaande wachtwoord, of klik op deze <a href="'+config.mail.origin+'/#!/magic/?'+adress+'?'+pass+'">magische link</a></p>'
//		};
//
//		mailgun.messages().send(message, function (error, body) {
//			if(error) {console.log(error);}
//			callback(body);
//		});
//	}
//};
//


var elastic = require("elastic-email");

var client = elastic.createClient({
    apiKey: config.mail.apiKey,
    // include the following if you want to override the default base path (https://api.elasticemail.com/v2)
    //host: "https://your.ownimplementation.com"
});

module.exports = {
	password: function(adress, pass, callback){
		var message = {
			from: config.mail.from,
			to: adress,
			subject: 'Uw tijdelijke wachtwoord',
			bodyText: 'Planlab login \n\n Uw tijdelijke wachtwoord is: '+pass,
			bodyHtml: '<h1>Planlab login</h1> <p>Uw tijdelijke wachtwoord is:</p> <p style="padding: 20px; background:#ECF0F1;">'+pass+'</p><p>kopieer en plak het bovenstaande wachtwoord, of klik op deze <a href="'+config.mail.origin+'/#!/magic/?'+adress+'?'+pass+'">magische link</a></p>'
		};

		client.email.send(message, function(error, body){
			if(error) {console.log(error);}
			callback(body);
		});
	}
};
