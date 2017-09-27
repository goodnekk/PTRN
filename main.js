var restify = require('restify');
var corsMiddleware = require('restify-cors-middleware');
var storage = require('./storage.js');


var server = restify.createServer({
    mapParams: true
});

//CORS
var cors = corsMiddleware({
  preflightMaxAge: 5, //Optional
  origins: ['*'],
});
server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.bodyParser());

//routes
server.post('/create', function respond(req, res, next) {
	storage.create(req.body.type, req.body.value, function(value){
		res.send(value);
		next();
	});
});

server.post('/findorcreate', function respond(req, res, next) {
	storage.findorcreate(req.body.type, req.body.value, function(value){
		res.send(value);
		next();
	});
});

server.post('/update/:id', function respond(req, res, next) {
	storage.update(req.params.id, req.body.value, function(value){
  	  res.send(value);
  	  next();
    });
});

//server.post('/drop/:id', function respond(req, res, next) {
//	storage.update(req.params.id, "ham", function(value){
//  	  res.send({tid: value});
//  	  next();
//    });
//});

server.post('/relate', function respond(req, res, next) {
	storage.relate(req.body.aid, req.body.bid, function(value){
  		res.send(value);
  		next();
    });
});

server.get('/get/:id', function respond(req, res, next) {
	storage.get(req.params.id, function(value){
		res.send(value);
	});
  next();
});

server.get('/select/:query', function respond(req, res, next) {
	storage.select(req.params.query, function(value){
  		res.send(value);
  		next();
    });
});

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


server.listen(9000, function() {
  console.log('%s listening at %s', server.name, server.url);
});
