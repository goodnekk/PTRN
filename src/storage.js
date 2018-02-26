var sqlite3 = require('sqlite3').verbose();
var uuid = require('uuid/v1');

var config = require('./config.json');
var db = new sqlite3.Database(config.storage);

db.serialize(function() {
	//keeps track of transactions and dates
	db.run("CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");

	//keeps track of individual nodes
	db.run("CREATE TABLE IF NOT EXISTS nodes (tid INTEGER, id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT)");

	//keeps track of historical values
	db.run("CREATE TABLE IF NOT EXISTS nodevalues (tid INTEGER PRIMARY KEY, id INTEGER, value TEXT, del INTEGER)");
	db.run("CREATE TABLE IF NOT EXISTS relations (tid INTEGER, aid INTEGER, bid INTEGER, del INTEGER)");

	//keeps track of users
	db.run("CREATE TABLE IF NOT EXISTS users (name TEXT, pass TEXT, node INTEGER, role INTEGER)");
});


function transact(callback){
	db.run("INSERT INTO transactions DEFAULT VALUES", function(err){
		if(err) console.log(err);
		callback(this.lastID);
	});
}

function create(type, value, callback){
	transact(function(tid){
		db.run("INSERT INTO nodes (tid, type) VALUES(?, ?)", [tid, type], function(err){
			var id = this.lastID;
			db.run("INSERT INTO nodevalues (tid, id, value) VALUES(?, ?, ?)", [tid, id, value], function(err){
				if(err) console.log(err);
				console.log(tid+"| CREATE "+id+" "+type+":"+value);
				get(id, callback);
			});
		});
	});
}

function findorcreate(type, value, callback){
	transact(function(tid){
		db.get("SELECT * FROM nodes INNER JOIN (SELECT id, MAX(tid) tid, value FROM nodevalues GROUP BY id) nv ON nodes.id = nv.id WHERE nodes.type=? AND nv.value=?", [type, value], function(err, resp){
			if(resp) {
				callback(resp);
			} else {
				create(type, value, callback);
			}

		});
	});
}

function update(id, value, callback){
	transact(function(tid){
		db.run("INSERT INTO nodevalues (tid, id, value) VALUES(?, ?, ?)", [tid, id, value], function(err){
			if(err) console.log(err);
			console.log(tid+"| UPDATE "+id+" "+":"+value);
			get(id, callback);
		});
	});
}

function drop(id, callback){
	transact(function(tid){
		db.run("INSERT INTO nodevalues (tid, id, del) VALUES(?, ?, ?)", [tid, id, 1], function(err){
			if(err) console.log(err);
			console.log(tid+"| DROP "+id+" "+":"+id);
			callback(id);
		});
	});
}

function relate(aid, bid, callback){
	transact(function(tid){
		db.run("INSERT INTO relations (tid, aid, bid) VALUES(?, ?, ?)", [tid, aid, bid], function(err){
			if(err) console.log(err);
			console.log(tid+"| RELATE "+aid+" <-> "+bid);
			callback({
				tid: tid,
				aid: aid,
				bid: bid
			});
		});
	});
}

function unrelate(aid, bid, callback){
	transact(function(tid){
		db.run("UPDATE relations SET del=? WHERE tid IN (SELECT tid FROM relations WHERE (aid=? AND bid=?) OR (aid=? AND bid=?) ORDER BY tid DESC LIMIT 1)", [tid, aid, bid, bid, aid], function(err){
			if(err) console.log(err);
			console.log(tid+"| UNRELATE "+aid+" <-> "+bid);
			callback({
				tid: tid,
				aid: aid,
				bid: bid
			});
		});
	});
}


function get(id, callback){
	db.get("SELECT * FROM nodes INNER JOIN (SELECT id, MAX(tid) tid, value FROM nodevalues GROUP BY id) nv ON nodes.id = nv.id WHERE nodes.id=?", [id], function(err, row){
		if(row){
			//relation(id, function(relations){
			//	row.collection = relations;
				callback(row);
			//});
		} else {
			callback({});
		}

	});
}

function select(type, callback){
	db.all("SELECT nv.tid, relations.tid rid, relations.bid, nodes.id, nodes.type, nv.value FROM nodes INNER JOIN (SELECT id, MAX(tid) tid, value FROM nodevalues GROUP BY id) nv ON nodes.id = nv.id INNER JOIN relations on nodes.id = relations.aid WHERE nodes.type=?", [type], function(err, rows){
		var results = {};
		for(var i in rows){
			var row = rows[i];
			if(!results[row.id]){
				results[row.id] = {
					tid: row.tid,
					id: row.id,
					value: row.value,
					type: row.type,
					collection: [
						{
							aid: row.id,
							bid: row.bid,
							tid: row.rid
						}
					]
				};
			} else {
				results[row.id].collection.push({
					aid: row.id,
					bid: row.bid,
					tid: row.rid
				});
			}
		}

		var arr = [];
		for(var j in results){
			arr.push(results[j]);
		}

		if(err) console.log(err);
		console.log("   | SELECT "+type+" "+rows.length);
		callback(arr);
	});
}

function relation(id, callback){
	db.all("SELECT relations.tid rid, childvalues.tid, child.id, child.type, childvalues.value FROM nodes INNER JOIN relations ON nodes.id = relations.aid OR nodes.id = relations.bid INNER JOIN nodes child ON relations.bid = child.id INNER JOIN (SELECT id, MAX(tid) tid, value FROM nodevalues GROUP BY id) childvalues ON child.id=childvalues.id WHERE nodes.id=?", [id], function(err, rows){
		if(err) console.log(err);
		callback(rows);
	});
}


function dump(callback){
	//nodes
	db.all("SELECT * FROM nodes INNER JOIN (SELECT id, MAX(tid) tid, value, del FROM nodevalues GROUP BY id) nv ON nodes.id = nv.id AND nv.del IS NULL", function(err, nodes){
		if(err) console.log(err);
		db.all("SELECT * FROM relations WHERE del IS NULL", function(err, relations){
			if(err) console.log(err);
			callback({
				nodes: nodes,
				relations: relations
			});
		});
	});
}

function dumpafter(age, callback){
	//nodes
	db.all("SELECT * FROM nodes INNER JOIN (SELECT id, MAX(tid) AS tid, value, del FROM nodevalues WHERE tid > ? GROUP BY id) nv ON nodes.id = nv.id", [age],function(err, nodes){
		if(err) console.log(err);
		db.all("SELECT * FROM relations WHERE tid > ? OR del > ?", [age, age], function(err, relations){
			if(err) console.log(err);
			callback({
				nodes: nodes,
				relations: relations
			});
		});
	});
}

function age(callback){
	//nodes
	db.get("SELECT MAX(id) id, timestamp FROM transactions", function(err, transaction){
		if(err) console.log(err);
		callback({
			transaction: transaction.id,
			timestamp: transaction.timestamp
		});
	});
}


function addUser(nodeid, callback){
	var pass = uuid();
	db.run("INSERT INTO users (pass, node, role) VALUES(?,?,?)", [pass, nodeid, -1], function(err){
		if(err) console.log(err);
		console.log("   | NEW USER ");
		callback({
			id: nodeid
		});
	});
}


function dropUser(nodeid, callback){
	var pass = uuid();
	db.run("DELETE FROM users WHERE node = ?", [nodeid], function(err){
		if(err) console.log(err);
		console.log("   | DROP USER ");
		callback({
			id: nodeid
		});
	});
}

function updateUser(nodeid, name, role, callback){
	var pass = uuid();
	db.run("UPDATE users SET name=?, role=? WHERE node=?", [name, role, nodeid], function(err){
		if(err) console.log(err);
		console.log("   | SET USER ");
		callback({
			name: name
		});
	});
}

function hashUser(name, callback){
	var pass = uuid(); // -> '6c84fb90-12c4-11e1-840d-7b25c5ee775a'
	db.get("SELECT name FROM users WHERE name=?", [name], function(err, result){
		if(err) console.log(err);
		if(result !== undefined){
			db.run("UPDATE users SET pass=? WHERE name=?", [pass, name], function(err){
				if(err) console.log(err);
				console.log("   | HASH USER ");
				callback({
					name: name,
					pass: pass
				});
			});
		} else {
			callback();
		}
	});

}

function checkUser(name, pass, callback){
	db.get("SELECT name, node, role FROM users WHERE name=? AND pass=?", [name, pass], function(err, result){
		if(err) console.log(err);
		var succes = false;
		if(result !== undefined){
			succes = true;
		} else {
			result = {node: false, result: false};
		}
		console.log("   | CHECK USER "+succes);
		callback({succes: succes, node: result.node, role: result.role});
	});
}

function checkUserAccess(pass, callback){
	db.get("SELECT role FROM users WHERE pass=?", [pass], function(err, result){
		if(err) console.log(err);
		var succes = false;
		if(result !== undefined){
			succes = true;
		} else {
			result = {role: false};
		}
		callback({succes: succes, role: result.role});
	});
}

function getUsers(callback){
	var pass = uuid();
	db.all("SELECT name, node, role FROM users", function(err, result){
		if(err) console.log(err);
		console.log("   | GET USERS ");
		callback(result);
	});
}


module.exports = {
	create: create,
	findorcreate: findorcreate,
	update: update,
	drop: drop,

	relate: relate,
	unrelate: unrelate,

	get: get,
	select: select,
	relation: relation,

	dump: dump,
	dumpafter: dumpafter,
	age: age,

	addUser: addUser,
	dropUser: dropUser,
	updateUser: updateUser,
	hashUser: hashUser,
	checkUser: checkUser,
	checkUserAccess: checkUserAccess,
	getUsers: getUsers
};
