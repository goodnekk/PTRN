var config = require('./config.json');
var mailgun = require('mailgun-js')({apiKey: config.mail.apiKey, domain: config.mail.domain});

module.exports = {
	password: function(adress, pass, callback){
		var message = {
		  from: 'postmaster@sandboxe58ae34e8c6248e4bd483de7ae0a60de.mailgun.org',
		  to: adress,
		  subject: 'Uw tijdelijke wachtwoord',
		  text: 'Planlab login \n\n Uw tijdelijke wachtwoord is: '+pass,
		  html: '<h1>Planlab login</h1> <p>Uw tijdelijke wachtwoord is:</p> <p style="padding: 20px; background:#ECF0F1;">'+pass+'</p><p>kopieer en plak het bovenstaande wachtwoord</p>'
		};

		mailgun.messages().send(message, function (error, body) {
			if(error) {console.log(error);}
			callback(body);
		});
	}
};
