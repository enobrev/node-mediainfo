/*============================================================================
  Copyright(c) 2011 Mark Armendariz <src@enobrev.com>
  MIT Licensed
============================================================================*/

var fs        = require('path');
var exec      = require('child_process').exec;
var xml2js    = require('xml2js');

var MediaInfo = function(sFileName, fCallback) {
    this.fCallback = typeof fCallback == 'function' ? fCallback : function() {};
    this.oInfo     = {};

    this.onComplete = function(sOutput) {
        xml2js(sOutput, this.jsonified.bind(this));
    }

    this.jsonified = function(oResult) {
        this.normalize(oResult);
        this.fCallback(null, this.oInfo);
    }

    this.normalize = function(oResult) {
        for (var i in oResult) {
            for (var iTrack in oResult[i]) {
                var aTracks = oResult[i][iTrack];
                for (var j in aTracks) {
                    var oTrack = aTracks[j];
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
                }
            }
        }
    }

    this.onError = function(iCode) {
        this.fCallback('MediaInfo Error ' + iCode, null);
    }

    this.onExit = function(iCode) {
        if (iCode == 0) {
            this.onComplete(iCode);
        } else {
            this.onError(iCode);
        }
    }

    this.get = function(sFileName) {
        var sCommand    = 'mediainfo ' + sFileName + ' --Full --Output=XML';
        exec(sCommand, function (oError, sOutput) {
            if (oError) {
                this.onError(oError);
            } else {
                var parser = new xml2js.Parser();
                parser.addListener('end', this.jsonified.bind(this));
                parser.parseString(sOutput);
            }
        }.bind(this));
    };
    
    this.get(sFileName);
};

module.exports = MediaInfo;