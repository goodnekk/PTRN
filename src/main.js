var restify = require('restify');
var corsMiddleware = require('restify-cors-middleware');
var storage = require('./storage.js');
var ptrn = require('./ptrn.js');
var mail = require('./mail.js');
var tokens = require('./tokens.js');
var config = require('./config.json');

var server = restify.createServer({
    mapParams: true
});

//CORS
var cors = corsMiddleware({
	preflightMaxAge: 5, //Optional
	origins: ['*'],
	allowHeaders: ['x-access-token'],
});

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.authorizationParser());

server.use(function authenticate(req, res, next) {
	//console.log(req.authorization.basic.password);
	req.access = -1;
    var token = req.headers['x-access-token'];

	tokens.verify(token, function(value){
        if(value.success){
            req.access = value.role+1;
        }
        return next();
    });
});

server.get('/', function respond(req, res, next) {
	res.send({
		"version": "0.0.1",
		"transactions": ptrn.getage(),
	});
	next();
});

//routes
server.post('/transact', function respond(req, res, next) {
    if(req.access>0){
        res.send(ptrn.consume(req.body));
        ptrn.writetodisc();
        next();
    } else {
        next();
    }
	//if(req.access>=0){
	//	storage.create(req.body.type, req.body.value, function(value){
	//		res.send(value);
	//		next();
	//	});
	//} else {
	//	next();
	//}
});



server.get('/dump', function respond(req, res, next) {
    if(req.access>0){
        res.send(ptrn.dump());
        next();
    } else {
        next();
    }
});

//server.get('/dump/:age', function respond(req, res, next) {
//	storage.dumpafter(req.params.age,function(value){
//  		res.send(value);
//  		next();
//    });
//});


server.post('/user/add', function respond(req, res, next) {
	if(req.access>0){
		storage.addUser(req.body.id,function(value){
			res.send(value);
			next();
		});
	} else {
		next();
	}
});

server.post('/user/drop', function respond(req, res, next) {
	if(req.access>0){
		storage.dropUser(req.body.id,function(value){
			res.send(value);
			next();
		});
	} else {
		next();
	}
});


server.post('/user/set', function respond(req, res, next) {
	if(req.access>0){
		storage.updateUser(req.body.id, req.body.name, req.body.role,function(value){
			res.send(value);
			next();
		});
	} else {
		next();
	}
});

server.post('/user/hash', function respond(req, res, next) {
	storage.hashUser(req.body.name,function(value){
		if(value){
			mail.password(value.name, value.pass, function(e){
				res.send({succes: true});
				next();
			});
		} else {
			res.send({succes: false});
			next();
		}
	});
});

server.post('/user/login', function respond(req, res, next) {
    if(req.body && req.body.name && req.body.pass){
        storage.checkUser(req.body.name,req.body.pass,function(value){

            if(value.succes){
                var token = tokens.generate(value.node, value.role);
                value.token = token;
            }

    		res.send(value);
    		next();
    	});
    }
});

server.post('/user/check', function respond(req, res, next) {
    if(req.body && req.body.token){
    	tokens.verify(req.body.token,function(value){
    		res.send(value);
    		next();
    	});
    }
});

server.get('/users/', function respond(req, res, next) {
	if(req.access>0){
		storage.getUsers(function(value){
			res.send(value);
			next();
		});
    } else {
    	next();
    }
});


server.listen(config.port, "0.0.0.0",function() {
  console.log('%s listening at %s', server.name, server.url);
});
