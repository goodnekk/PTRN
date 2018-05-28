var uuid = require('uuid/v4');
var nJwt = require('njwt');
var config = require("./config.json");

var secretKey = uuid();

function generate(username, permissions){
    var claims = {
      sub: username,
      iss: config.mail.domain,
      permissions: permissions
  };
    var jwt = nJwt.create(claims,secretKey);
    jwt.setExpiration(new Date().getTime() + (60*60*1000*12)); //twelve hours in the future
    return jwt.compact();
}

function verify(token, callback){
    nJwt.verify(token,secretKey,function(err, t){
        if(err) {
            callback({success: false});
        } else {
            callback({
                success: true,
                node: t.body.sub,
                role: t.body.permissions
            });
        }
    });
}

module.exports = {
    generate: generate,
    verify: verify
};
