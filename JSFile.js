/*
 * ----------------------------------------------------------------------------
 * Package:     JavaScript File
 * Version:     0.1.0
 * Date:        2013-07-31
 * Author:      Doly Mood
 * ----------------------------------------------------------------------------
 * Copyright (c) 2013 Doly Mood
 * Dual licensed under the MIT licenses.
 * ----------------------------------------------------------------------------
 */
(function(win) {

    var JSFile = JSFile || {},
        toStr = JSFile.toString,
        saveAs = saveAs ||
            (navigator.msSaveBlob && navigator.msSaveBlob.bind(navigator));

    function getType(obj, typeVal) {
        var ret = '';
        if (obj == null) ret = String(obj);
        ret = typeof obj;
        if (ret === 'object' || ret === 'function') {
            ret = toStr.call(obj).slice(8, -1).toLowerCase();
        }
        return (typeVal && typeof typeVal === 'string' && (typeVal = typeVal.toLowerCase())) ?
               typeVal === ret :
               ret;
    }

    function mix(target) {
        var args = [].slice.call(arguments, 1);
        for (var i = 0, len = args.length, key, tmp; i < len; i++) {
            tmp = args[i];
            if (Object(tmp) === tmp) {
                for (key in tmp) {
                    if (tmp.hasOwnProperty(key)) {
                        target[key] = tmp[key];
                    }
                }
            }
        }
        return target;
    }

    if (!saveAs) {
        saveAs = function() {

        }();
    }

    mix(JSFile, {

        mix: mix,

        type: getType,

        saveAs: saveAs

    });

    win.JSFile = JSFile;

})(window)