    var MediaInfo = require('../lib/mediainfo.js');
    var fs        = require('fs');

    var sFile;
    if (process.argv.length > 2) {
        sFile = process.argv[2];
    } else {
        console.log('Please Set File Name');
        process.exit(1);
    }

    fs.exists(sFile, function(bExists) {
        if (!bExists) {
            console.log('Could not find the File', sFile);
            process.exit(1);
        } else {
            MediaInfo(sFile, function(oError, oInfo) {
                if (oError) {
                    console.error('Error', oError);
                } else {
                    console.log(oInfo);
                }
            });
        }
    });