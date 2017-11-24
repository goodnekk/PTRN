var restify = require('restify');
var corsMiddleware = require('restify-cors-middleware');
var storage = require('./storage.js');
var mail = require('./mail.js');
var config = require('./config.json');

var server = restify.createServer({
    mapParams: true
});

//CORS
var cors = corsMiddleware({
	preflightMaxAge: 5, //Optional
	origins: ['*'],
	allowHeaders: ['Authorization'],
});

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.authorizationParser());

server.use(function authenticate(req, res, next) {
	//console.log(req.authorization.basic.password);
	req.access = -1;

	if(req.authorization && req.authorization.basic && req.authorization.basic.password !== null){
		storage.checkUserAccess(req.authorization.basic.password, function(resp){
			if(resp.succes){
				req.access = resp.role+1;
			}
			return next();
		});
	} else {
		return next();
	}


});

server.get('/', function respond(req, res, next) {
	storage.age(function(value){
		res.send({
			"version": "0.0.1",
			"transactions": value.transaction,
			"lastTransaction": value.timestamp
		});
		next();
    });
});

//routes
server.post('/create', function respond(req, res, next) {
	if(req.access>=0){
		storage.create(req.body.type, req.body.value, function(value){
			res.send(value);
			next();
		});
	} else {
		next();
	}
});

server.post('/findorcreate', function respond(req, res, next) {
	if(req.access>=0){
		storage.findorcreate(req.body.type, req.body.value, function(value){
			res.send(value);
			next();
		});
	} else {
		next();
	}
});

server.post('/update/:id', function respond(req, res, next) {
	if(req.access>=0){
		storage.update(req.params.id, req.body.value, function(value){
			res.send(value);
			next();
		});
	} else {
		next();
	}
});

server.post('/drop/:id', function respond(req, res, next) {
	storage.drop(req.params.id, function(value){
  	  res.send({tid: value});
  	  next();
    });
});

server.post('/relate', function respond(req, res, next) {
	if(req.access>=0){
		storage.relate(req.body.aid, req.body.bid, function(value){
			res.send(value);
			next();
		});
	} else {
		next();
	}
});

server.post('/createrelate', function respond(req, res, next) {
	if(req.access>=0){
		storage.create(req.body.type, req.body.value, function(value){
			storage.relate(req.body.bid, value.id, function(rel){
				res.send({
					node: value,
					relation: rel
				});
				next();
			});
		});
	} else {
		next();
	}
});

server.post('/unrelate', function respond(req, res, next) {
	if(req.access>=0){
		storage.unrelate(req.body.aid, req.body.bid, function(value){
			res.send(value);
			next();
		});
	} else {
		next();
	}
});

//server.get('/get/:id', function respond(req, res, next) {
//	storage.get(req.params.id, function(value){
//		res.send(value);
//	});
//	next();
//});

//not working
//server.get('/select/:query', function respond(req, res, next) {
//	storage.select(req.params.query, function(value){
//  		res.send(value);
//  		next();
//    });
//});

server.get('/relation/:id', function respond(req, res, next) {
	storage.relation(req.params.id, function(value){
  		res.send(value);
  		next();
    });
});

server.get('/dump', function respond(req, res, next) {
	storage.dump(function(value){
  		res.send(value);
  		next();
    });
});

server.get('/dump/:age', function respond(req, res, next) {
	storage.dumpafter(req.params.age,function(value){
  		res.send(value);
  		next();
    });
});


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

server.post('/user/check', function respond(req, res, next) {
	storage.checkUser(req.body.name,req.body.pass,function(value){
		res.send(value);
		next();
	});
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


server.listen(config.port, function() {
  console.log('%s listening at %s', server.name, server.url);
});
