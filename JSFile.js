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
(function(win, doc) {

    var JSFile = JSFile || {},
        toStr = JSFile.toString,
        saveAs = saveAs ||
            (navigator.msSaveBlob && navigator.msSaveBlob.bind(navigator)),
        event = {},
        eventObj = {},
        specialEvents = {},
        uuid = 1,
        getUid = function(obj) {
            return obj.uniqueNumber || (obj.uniqueNumber = uuid++);
        },
        rword = /[^, ]+/g;

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

    function isWindow(obj) {
        return obj && obj === obj.window;
    }

    function isArraylike(obj) {
        var length = obj.length,
            type = getType(obj);
        if (isWindow(obj)) {
            return false;
        }
        if (obj.nodeType === 1 && length) {
            return true;
        }
        return type === 'array' || type !== 'function' &&
                (length === 0 ||
                        typeof length === 'number' && length > 0 && (length - 1) in obj);
    }

    function each(obj, fn, context) {
        if (obj) {
            var isArray = isArraylike(obj),
                i = 0;
            context || (context = win);
            if (isArray) {
                for (var n = obj.length; i < n; i++) {
                    fn.call(context, obj[i], i, obj);
                }
            } else {
                for (i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        fn.call(context, obj[i], i, obj);
                    }
                }
            }
        }
    }

    specialEvents.click = specialEvents.mousedown =
    specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents';

    mix(event, {

        on: function(ele, name, func, bubble) {
            if (ele.addEventListener) {
                ele.addEventListener(name, func, !!bubble);
            } else {
                var uid = getUid(ele);
                var hd = eventObj[uid] || (eventObj[uid] = {});
                if (!hd[name]) hd[name] = [];
                hd[name].push({
                    func: func,
                    bubble: !!bubble
                });
            }
        },

        off: function(ele, name, func, bubble) {
            if (ele.removeEventListener) {
                ele.removeEventListener(name, func, !!bubble);
            } else {
                var uid = getUid(ele);
                var hd = eventObj[uid];
                if (!hd) return;
                hd = hd[name];
                if (!hd || !hd.length) return;
                each(hd, function(obj, index) {
                    if (obj.func === func && obj.bubble === (!!bubble)) {
                        hd.splice(index, 1);
                    }
                });
            }
        },

        trigger: function(ele, name, data) {
            if (ele.dispatchEvent) {
                var e = doc.createEvent(specialEvents[name] || 'Events');
                e.type = name;
                e.data = data;
                e.target = ele;
                e.initEvent(name, true, true);
                ele.dispatchEvent(e);
            } else {
                var uid = getUid(ele);
                var hd = eventObj[uid];
                if (!hd) return;
                hd = hd[name];
                if (!hd || !hd.length) return;
                each(hd, function(obj) {
                    obj.func.call(ele, {
                        type: name,
                        data: data,
                        target: ele
                    });
                });
            }
        }

    });
    
    // 支持jquery式多事件('click dblclick'|'click,dblclick')绑定
    each(event, function(func, name) {
        event[name] = function(ele, names) {
            names = names.match(rword);
            if (!names || !names.length) return;
            var i = names.length;
            do {
                func.call(event, ele, names[i], arguments[2], arguments[3]);
            } while(--i);
        };
    });

    saveAs || (saveAs = function(win, doc) {

        var 
        getURL = function() {
            // URL 具有 createObjectURL revokeObjectURL两个方法
            // 前者是创建对象URL 后者是释放对象URL
            // https://developer.mozilla.org/zh-CN/docs/DOM/window.URL.createObjectURL
            return win.URL || win.webkitURL || win;
        },
        URL = getURL(),
        getObjURL = function(blob) {
            var objURL = URL.createObjectURL(blob);
            deletionQueue.push(objURL);
            return objURL;
        },
        linkA = doc.createElement('a'),
        canUseSaveLink =  !win.externalHost && 'download' in linkA,
        // https://developer.mozilla.org/en-US/docs/Web/API/LocalFileSystem
        webkitRFS = win.webkitRequestFileSystem,
        RFS = win.RequestFileSystem || webkitRFS || mozRequestFileSystem,
        throwOutside = function (ex) {
            (win.setImmediate || win.setTimeout)(function() {
                throw ex;
            }, 0);
        },
        // 流数据类型
        forceAaveableType = 'application/octet-stream',
        fsMinSize = 0, // 本地文件系统大小
        deletionQueue = [],
        FileSaver = function(blob, name) {
            var
            filesaver = this,
            type = blob.type,
            blobChanged = false,
            abortable = function(func) {
                return function() {
                    if (filesaver.readyState !== filesaver.DONE) {
                        return func.apply(this, arguments);
                    }
                };
            },
            fsError = function() {
                if (blobChanged || !objURL) {
                    objURL = getObjURL(blob);
                }
                if (targetView) {
                    targetView.location.href = objURL;
                } else {
                    window.open(objURL, '_blank');
                }
                filesaver.readyState = filesaver.DONE;
                event.trigger(filesaver, 'writestart progress write writeend');
            },
            createIfNotFound = {create: true, exclusive: false},
            objURL, targetView;

            filesaver.readyState = filesaver.INIT;
            name || (name = 'download'); // 默认文件名
            if (canUseSaveLink) {
                objURL = linkA.href = getObjURL(blob);
                linkA.download = name;
                event.trigger(linkA, 'click');
                click(linkA);
                filesaver.readyState = filesaver.DONE;
                event.trigger(filesaver, 'writestart progress write writeend');
                return;
            }
            // Object and web filesystem URLs have a problem saving in Google Chrome when
            // viewed in a tab, so I force save with application/octet-stream
            // http://code.google.com/p/chromium/issues/detail?id=91158
            if (win.chrome && type && type !== forceAaveableType) {
                slice = blob.slice || blob.webkitSlice;
                blob = slice.call(blob, 0, blob.size, forceAaveableType);
                blobChanged = true;
            }
            // Since I can't be sure that the guessed media type will trigger a download
            // in WebKit, I append .download to the filename.
            // https://bugs.webkit.org/show_bug.cgi?id=65440
            if (webkitRFS && name !== 'download') {
                name += '.download';
            }
            if (type === forceAaveableType || webkitRFS) {
                targetView = win;
            }
            if (!RFS) {
                fsError();
                return;
            }
            fsMinSize += blob.size;
            RFS(win.TEMPORARY, fsMinSize, abortable(function(fs) {
                // 成功
                // fs => FileSystem对象
                // fs.root {DirectoryEntry} => 当前文件系统的根目录
                // DirectoryEntry 详见：
                // http://dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-DirectoryEntry
                // fs.name {String} => 当前文件系统的名字 唯一的 
                // https://developer.mozilla.org/en-US/docs/Web/API/FileSystem?redirectlocale=en-US&redirectslug=DOM%2FFile_API%2FFile_System_API%2FFileSystem
                fs.root.getDirectory('saved', createIfNotFound, abortable(function(dirEntry) {
                    dirEntry.getFile(name, createIfNotFound, abortable(function(fileEntry) {
                        fileEntry.createWriter(abortable(function(fileWriter) {
                            // http://dev.w3.org/2009/dap/file-system/file-writer.html
                            // fileWriter.
                        }), fs_error);
                    }), fs_error);
                }), fsError);
            }), abortable(function(fr) {
                // 失败
                // fr => FileError对象
                fsError();
            }));
            function(fs) {
                fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
                    var save = function() {
                        dir.getFile(name, create_if_not_found, abortable(function(file) {
                            file.createWriter(abortable(function(writer) {
                                writer.onwriteend = function(event) {
                                    target_view.location.href = file.toURL();
                                    deletion_queue.push(file);
                                    filesaver.readyState = filesaver.DONE;
                                    dispatch(filesaver, "writeend", event);
                                };
                                writer.onerror = function() {
                                    var error = writer.error;
                                    if (error.code !== error.ABORT_ERR) {
                                        fs_error();
                                    }
                                };
                                "writestart progress write abort".split(" ").forEach(function(event) {
                                    writer["on" + event] = filesaver["on" + event];
                                });
                                writer.write(blob);
                                filesaver.abort = function() {
                                    writer.abort();
                                    filesaver.readyState = filesaver.DONE;
                                };
                                filesaver.readyState = filesaver.WRITING;
                            }), fs_error);
                        }), fs_error);
                    };
                    dir.getFile(name, {create: false}, abortable(function(file) {
                        // delete file if it already exists
                        file.remove();
                        save();
                    }), abortable(function(ex) {
                        if (ex.code === ex.NOT_FOUND_ERR) {
                            save();
                        } else {
                            fs_error();
                        }
                    }));
                }), fs_error);
            }
        };
        mix(FileSaver.prototype, {

            abort: function() {
                this.readyState = this.DONE;
                event.trigger(this, 'abort');
            },

            INIT: 0,
            WRITING: 1,
            DONE: 2,

            readyState: 0
        });

        function saveAs(blob, name) {
            return new FileSaver(blob, name);
        }

        event.on('unload', function() {
            // 释放 URL对象以及File对象
            var i = deletionQueue.length;
            while (i--) {
                var file = deletionQueue[i];
                if (typeof file === 'string') {
                    URL.revokeObjectURL(file);
                } else {
                    file.remove();
                }
            }
            deletionQueue.length = 0;
        }, false);

        return saveAs;
    }(win, doc));

    mix(JSFile, {

        mix: mix,

        type: getType,

        getUid: getUid,

        event: event,

        saveAs: saveAs

    });

    win.JSFile = JSFile;

})(this, document)