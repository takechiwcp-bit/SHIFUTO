const fs = require('fs');
const LZString = require('./node_modules/lz-string/libs/lz-string.js');
const data = JSON.parse(fs.readFileSync('/tmp/gas_response.json', 'utf8'))[0];
const compress = (obj) => LZString.compressToBase64(JSON.stringify(obj));
console.log('Original shifts:', JSON.stringify(data.shifts).length);
console.log('Compressed shifts:', compress(data.shifts).length);
