var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('test.sqlite');

db.serialize(function() {
	//keeps track of transactions and dates
	db.run("CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");

	//keeps track of individual nodes
	db.run("CREATE TABLE IF NOT EXISTS nodes (tid INTEGER, id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT)");

	//keeps track of historical values
	db.run("CREATE TABLE IF NOT EXISTS nodevalues (tid INTEGER PRIMARY KEY, id INTEGER, value TEXT)");
  	db.run("CREATE TABLE IF NOT EXISTS relations (tid INTEGER, aid INTEGER, bid INTEGER)");
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
	db.all("SELECT relations.tid rid, childvalues.tid, child.id, child.type, childvalues.value FROM nodes INNER JOIN relations ON nodes.id = relations.aid INNER JOIN nodes child ON relations.bid = child.id INNER JOIN (SELECT id, MAX(tid) tid, value FROM nodevalues GROUP BY id) childvalues ON child.id=childvalues.id WHERE nodes.id=?", [id], function(err, rows){
		if(err) console.log(err);
		callback(rows);
	});
}


function dump(callback){
	//nodes
	db.all("SELECT * FROM nodes INNER JOIN (SELECT id, MAX(tid) tid, value FROM nodevalues GROUP BY id) nv ON nodes.id = nv.id", function(err, nodes){
		if(err) console.log(err);
		db.all("SELECT * FROM relations", function(err, relations){
			if(err) console.log(err);
			callback({
				nodes: nodes,
				relations: relations
			});
		});
	});
}


module.exports = {
	create: create,
	findorcreate: findorcreate,
	update: update,
	relate: relate,

	get: get,
	select: select,
	relation: relation,

	dump: dump
};
