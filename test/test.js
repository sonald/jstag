/*jslint node*/

var jstag = require('../jstag');
var fs = require('fs');
var util = require('util');

var data = fs.readFileSync(__dirname + '/example.js', 'utf-8');
var tags = jstag.parse(data);

// tags.functions/ tags.

function inspect(msg, obj) {
    if (typeof msg === 'object') {
        obj = msg;
        msg = util.inspect(obj, false, null);

    } else if (typeof msg === 'string') {
        msg = msg + util.inspect(obj, false, null);
    }

    console.log(msg);
}

// inspect(tags.ast);

inspect('find -> ', tags.find('Jstag'));

inspect('functions: ', tags.functions());

inspect('definitions: ', tags.definitions());
