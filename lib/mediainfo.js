/*============================================================================
  Copyright(c) 2011 Mark Armendariz <src@enobrev.com>
  MIT Licensed
============================================================================*/

var fs        = require('path');
var spawn     = require('child_process').spawn;
var xml2js    = require('xml2js');

var MediaInfo = function(sFileName, fCallback) {
    this.fCallback = typeof fCallback == 'function' ? fCallback : function() {};
    this.oInfo     = {};

    this.onComplete = function(sOutput) {
        xml2js(sOutput, this.jsonified.bind(this));
    };

    this.jsonified = function(oResult) {
        if (oResult === null) {
            this.onError(0, 'No Results');
        } else {
            if (oResult.Mediainfo !== undefined) {
                if (oResult.Mediainfo.File !== undefined) {
                    this.normalize(oResult.Mediainfo.File);
                } else {
                    this.normalize(oResult.Mediainfo);
                }
            } else {
                this.normalize(oResult);
            }
            this.fCallback(null, this.oInfo);
        }
    };

    this.normalizeTrack = function(oTrack) {
        var sAttribute = '';

        if (oTrack['$'] !== undefined) {
            sAttribute = '$';
        }

        if (oTrack['@'] !== undefined) {
            sAttribute = '@';
        }

        if (oTrack[sAttribute]) {
            var sCategory = oTrack[sAttribute].type;
            this.oInfo[sCategory] = {};

            for (var sField in oTrack) {
                if (sField != sAttribute) {
                    switch(sField) {
                        case 'Format_Extensions_usually_used':
                        case 'Codec_Extensions_usually_used':
                        case 'Codec_Extensions':
                            var aExtensions = [];
                            if (Array.isArray(oTrack[sField])) {
                                if (oTrack[sField][0].indexOf(' ') > -1) {
                                    aExtensions = oTrack[sField][0].split(' ');
                                } else {
                                    aExtensions = oTrack[sField].split(' ');
                                }
                            } else {
                                aExtensions = oTrack[sField].split(' ');
                            }

                            oTrack[sField] = aExtensions;
                            break;
                    }

                    this.oInfo[sCategory][sField] = oTrack[sField];
                }
            }
        }
    };

    this.normalize = function(oResult) {
        for (var i in oResult) {
            for (var iTrack in oResult[i]) {
                var aTracks = oResult[i][iTrack];
                if (Array.isArray(aTracks)) {
                    for (var j in aTracks) {
                        this.normalizeTrack(aTracks[j]);
                    }
                } else {
                    this.normalizeTrack(aTracks);
                }
            }
        }
    };

    this.onError = function(iCode, sError) {
        this.fCallback(new Error('MediaInfo Error ' + iCode + ': ' + sError), null);
    };

    this.parse = function(sOutput) {
        var parser = new xml2js.Parser();
        parser.addListener('end', this.jsonified.bind(this));
        parser.parseString(sOutput);
    };

    this.get = function(sFileName) {
        var sOut        = '';
        var sError      = '';
        var bOutput     = false;
        var bExit       = false;
        var oMediainfo  = spawn('mediainfo', [sFileName, '--Full', '--Output=XML']);

        oMediainfo.stdout.on('data', function (data) {
            bOutput = true;
            sOut += data.toString();

            if (bExit) {
                // Strange Issue where the stdout is reported AFTER spawn.exit. So we have to parse from here.
                this.parse(sOut);
            }
        }.bind(this));

        oMediainfo.stderr.on('data', function (data) {
            sError += data.toString();
        });

        oMediainfo.on('exit', function (code) {
            bExit = true;
            if (code !== 0) {
                this.onError(code, sError);
            } else {
                if (sOut.length) {
                    this.parse(sOut);
                } else if (bOutput) {
                    this.onError(0, 'No Output');
                } else {
                    // Strange Issue where the stdout is reported AFTER spawn.exit.  If Output hasn't run - Give it 3 seconds before kicking off an error
                    setTimeout(function() {
                        if (!bOutput) {
                            this.onError(0, 'No Output');
                        }
                    }.bind(this), 3000);
                }
            }
        }.bind(this));
    };

    this.get(sFileName);
};

module.exports = MediaInfo;