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
        this.normalize(oResult);
        this.fCallback(null, this.oInfo);
    };

    this.normalizeTrack = function(oTrack) {
        if (oTrack['@']) {
            var sCategory = oTrack['@'].type;
            this.oInfo[sCategory] = {};

            for (var sField in oTrack) {
                if (sField != '@') {
                    switch(sField) {
                        case 'Format_Extensions_usually_used':
                        case 'Codec_Extensions_usually_used':
                            this.oInfo[sCategory][sField] = oTrack[sField].split(' ');
                            break;

                        default:
                            this.oInfo[sCategory][sField] = oTrack[sField];
                            break;
                    }
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

    this.get = function(sFileName) {
        var sOut        = '';
        var sError      = '';
        var oMediainfo  = spawn('mediainfo', [sFileName, '--Full', '--Output=XML']);
        
        oMediainfo.stdout.on('data', function (data) {
            sOut += data.toString();
        });

        oMediainfo.stderr.on('data', function (data) {
            sError += data.toString();
        });

        oMediainfo.on('exit', function (code) {
            if (code !== 0) {
                this.onError(code, sError);
            } else {
                var parser = new xml2js.Parser();
                parser.addListener('end', this.jsonified.bind(this));
                parser.parseString(sOut);
            }
        }.bind(this));
    };
    
    this.get(sFileName);
};

module.exports = MediaInfo;