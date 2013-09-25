try {

    var fs          = require('fs');
    var path        = require('path');
    var assert      = require('assert');
    var crypto      = require('crypto');
    var exec        = require('child_process').exec;
    var async       = require('async');
    var MediaInfo   = require('../lib/mediainfo.js');

    var arguments = process.argv.splice(2);
    if (arguments.length != 3) {
        console.log('node infoList fileList localMediaPath NSimultaneous');
        process.exit(0);
    }

    var FILE_LIST   = arguments[0];
    var MEDIA_PATH  = arguments[1];
    var REMOTE_PATH = 's3://media.cameoapp.com/';
    var N           = parseInt(arguments[2],10);

    var getPath = function(sHash) {
        return sHash.substr(0, 1) + '/' + sHash.substr(1, 1) + '/' + sHash.substr(2, 1) + '/' + sHash;
    };

    var getFile = function(sLocalPath, sRemotePath, sFile, fCallback) {
        var sLocalFile = path.join(sLocalPath, sFile);
        // console.log('inside getfile, sLocalFile',sLocalFile);

        fs.exists(sLocalFile, function(bExists) {
            if (bExists) fs.unlinkSync(sLocalFile);

            var sFileWithRemotePath = getPath(sFile);
            // console.log('sLocalPath',sLocalPath,'sRemotePath',sRemotePath,'sFile',sFile,'sFileWithRemotePath',sFileWithRemotePath,'sLocalFile',sLocalFile);
            exec('s3cmd get ' + sRemotePath + sFileWithRemotePath + ' ' + sLocalFile, function(gfErr, oStdOut, oStdErr) {
                if (gfErr) {
                    console.log({action: 'getFile', file: sRemotePath+sFileWithRemotePath, gfErr: gfErr, oStdOut: oStdOut, oStdErr: oStdErr });
                    return fCallback(gfErr);
                }
                else {
                    // console.log('inside getfile, finished downloading sLocalFile',sLocalFile);
                    return fCallback(null,sLocalFile);
                }
            }.bind(this));
        });
    };



    var infoSomeFiles = function(currentFiles,fGroupCallback) {
        // console.log('calling group thing, iFile',iFile,'iFile+N',iFile+N);


        var processFiles = function(localFiles,fCallback) {
            console.log({ status:'files to mediainfo-ize', localFiles: localFiles });
            async.eachSeries(
                localFiles, 
                function(localFile,cb) {
                    console.log('calling main loop for this file',localFile);
                    var once = true;
                    function cbWrap(err) {
                        if (once) {
                            once = false;
                            // console.log('Hitting callback first time with this',err);
                            return cb(err);
                        }
                        else {
                            console.log('EGREGIOUS CODE FAIL Trying to hit callback a second time with this',err);
                            return;
                        }
                    }
                    // console.log('processing testFile',testFile);
                    MediaInfo(localFile, function(oError, oInfo) {
                        console.log('calling mediainfo for this file',localFile);
                        if (oError) {
                            console.log('MediaInfo #FAIL about to unlink testFile',localFile);
                            fs.unlink(localFile, function(ulerr) { 
                                var combinedError = null;
                                if (oError || ulerr) {
                                    combinedError = { oMediaInfoError: oError, oUnlinkError: ulerr };
                                }
                                return cbWrap(combinedError);
                            });
                        } 
                        else {
                            // console.log(oInfo);
                            console.log('MediaInfo Succeeds! about to unlink testFile',localFile);
                            fs.unlink(localFile, function(ulerr) { 
                                return cbWrap(ulerr);
                            });
                        }
                    });
                },
                function(err) {
                    if (err) {
                        console.log(err);
                        return fCallback(null);
                    }
                    else {
                        console.log('done with batch',localFiles);
                        return fCallback(null);
                    }
                }
            );
        }

        var getFiles = function(currentFiles,fCallback) {
            var localFiles = [];
            async.each(
                currentFiles, 
                function(testFile,cb) {
                    testFile = testFile.replace(/\"/g,'');
                    
                    if (testFile && testFile.length) {
                        // console.log('processing testFile',testFile);
                        getFile(MEDIA_PATH, REMOTE_PATH, testFile, function(gfErr,localFile) {
                            if (gfErr) {
                                console.log(gfErr);
                                return cb(null);
                            }
                            else {
                                fs.exists(localFile, function(bExists) {
                                    if (!bExists) {
                                        console.log('Could not find the File' + localFile);
                                        return cb(null);
                                    }
                                    else {
                                        localFiles.push(localFile);
                                        return cb(null);
                                    }
                                });
                            }
                        });
                    }
                },
                function (err) {
                    if (err) {
                        return fCallback(err,localFiles);
                    }
                    else {
                        return fCallback(null,localFiles);
                    }
                }
            );       
        }
        getFiles(currentFiles,function(err,localFiles) {
            if (err) {
                console.log(err);
                return processFiles(localFiles,fGroupCallback);
            }
            else {
                return processFiles(localFiles,fGroupCallback);
            }            
        });
    }

    var infoAllFiles = function(fileList) {
        var iFile = 0;
        async.whilst(
            function() { return iFile < fileList.length; },
            function(fGroupCallback) {
                var currentFiles = fileList.slice(iFile,iFile+N);
                iFile += N;           
                infoSomeFiles(currentFiles,fGroupCallback);
            },
            function (err) {
                if (err) {
                    console.log(err);
                    return;
                }
                else {
                    console.log('all done');
                    return;
                }
            }
        );
    }

    fs.readFile(FILE_LIST, { encoding: 'utf8' }, function(ferr,data) {
        if (ferr) return console.log(ferr);

        var fileList = data.split('\n');
        infoAllFiles(fileList, function(err) {
            if (err) {
                return console.log(err);
            }
            else {
                return;
            }
        });
    });

}
catch (e) {
    console.log('error not handled elsewhere',e);
    return;
}











