
const fs        = require('fs');
const MediaInfo = require('../lib/mediainfo.js');

if (process.argv.length < 3) {
    console.error('Usage: node test [filename]')
    process.exit(1);
}

const sFile = process.argv[2];

if (!fs.existsSync(sFile)) {
    console.error('File not found');
    process.exit(1);
}

MediaInfo.setCommandPath('/home/enobrev/src/fileinfo/bin/mediainfo');

MediaInfo(sFile, function(oError, oInfo) {
    console.log('calling mediainfo for this file', sFile);
    if (oError) {
        console.error('MediaInfo #FAIL', oError);
    } else {
        console.log('MediaInfo Succeeds!', JSON.stringify(oInfo, null, '    '));
    }
});