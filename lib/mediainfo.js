/*============================================================================
  Copyright(c) 2011 Mark Armendariz <src@enobrev.com>
  MIT Licensed
============================================================================*/

const exec      = require('child_process').exec;
const xml2js    = require('xml2js');

let MediaInfo = function(sFileName, fCallback = () => {}) {
    this.fCallback = fCallback;
    this.oInfo     = {};

    this.jsonified = function(oResult) {
        console.log(JSON.stringify(oResult, null, '...'));
        if (oResult === null) {
            this.onError(0, 'No Results');
        } else {
            if (oResult.MediaInfo !== undefined) {
                if (oResult.MediaInfo.File !== undefined) {
                    this.normalize(oResult.MediaInfo.File);
                } else {
                    this.normalize(oResult.MediaInfo);
                }
            } else {
                this.normalize(oResult);
            }
            this.fCallback(null, this.oInfo);
        }
    };

    this.normalizeTrack = function(oTrack) {
        let sAttribute = '';

        if (oTrack['$'] !== undefined) {
            sAttribute = '$';
        }

        if (oTrack['@'] !== undefined) {
            sAttribute = '@';
        }

        if (oTrack[sAttribute]) {
            const sCategory = oTrack[sAttribute].type;
            this.oInfo[sCategory] = {};

            Object.keys(oTrack).forEach(sField => {
                if (sField !== sAttribute) {
                    switch(sField) {
                        case 'Format_Extensions_usually_used':
                        case 'Codec_Extensions_usually_used':
                        case 'Codec_Extensions':
                            let aExtensions = [];
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
            });
        }
    };

    this.normalize = function(oResult) {
        for (let i in oResult) {
            for (let iTrack in oResult[i]) {
                const aTracks = oResult[i][iTrack];
                if (Array.isArray(aTracks)) {
                    for (let j in aTracks) {
                        this.normalizeTrack(aTracks[j]);
                    }
                } else {
                    this.normalizeTrack(aTracks);
                }
            }
        }
    };

    this.onError = function(sError) {
        this.fCallback(new Error('MediaInfo Error: ' + sError), null);
    };

    this.parse = function(sOutput) {
        const oParser = new xml2js.Parser();
        oParser.addListener('end', this.jsonified.bind(this));
        oParser.parseString(sOutput);
    };

    this.get = function(sFileName) {
        const sCommand    = [MediaInfo.COMMAND_PATH, '--Full', '--Output=XML','"'+sFileName+'"'].join(' ');
        exec(sCommand, {maxBuffer: 1024 * 1024 * 100}, function(oError, sStdOut, sStdErr) {  // 5 Mb Buffer since it may have a cover art image
            if (oError !== null) {
                this.fCallback(oError);
            } else {
                if (sStdOut.length) {
                    this.parse(sStdOut);
                } else if (sStdErr) {
                    this.onError(new Error(sStdErr));
                } else {
                    this.onError(new Error('No Output'));
                }   
            }

        }.bind(this));
    };

    if (sFileName) {
        sFileName = sFileName.replace(/^\s+|\s+$/g, '');

        if (sFileName.length) {
            if (sFileName === '/') {
                this.onError(0, new Error('File Name Was Root'));
            } else if (sFileName === '.') {
                this.onError(0, new Error('File Name Was Just a Dot'));
            } else {
                this.get(sFileName);
            }
        } else {
            this.onError(0, new Error('Empty File Name'));
        }
    } else {
        this.onError(0, new Error('No File Name'));
    }
};

MediaInfo.COMMAND_PATH = 'mediainfo';
MediaInfo.setCommandPath = sPath => MediaInfo.COMMAND_PATH = sPath;

module.exports = MediaInfo;
