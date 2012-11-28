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
                                    aExtensions = oTrack[sField][0];
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
        var iCode       = 0;
        var bOutput     = false;
        var command     = ['mediainfo', '--Full', '--Output=XML','"'+sFileName+'"'].join(' ');
        var oMediaInfo  = exec(command, {maxBuffer: 1024 * 1024 * 5}, function(oError, oStdOut, oStdErr) {  // 5 Mb Buffer since it may have a cover art image
            if (oError !== null) {
                iCode = oError.code;
                this.fCallback(oError);
            }
            else {
                sOut = oStdOut;
                sError = oStdErr;
                var aStdError = sError.replace(/^\s+|\s+$/g, '').split("\n");
                if (sOut.length) {
                    this.parse(sOut);
                } else {
                    this.onError(0, new Error('No Output'));
                }   
            }

        }.bind(this));
    };

    this.get(sFileName);
};

module.exports = MediaInfo;