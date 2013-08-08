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

    // http://www.w3.org/TR/FileAPI/
    var JSFile = JSFile || {},
        toStr = JSFile.toString,
        URL = win.URL || win.webkitURL,
        saveAs = saveAs ||
            (navigator.msSaveBlob && navigator.msSaveBlob.bind(navigator)),
        BlobBuilder = win.BlobBuilder || win.WebKitBlobBuilder ||
                      win.MozBlobBuilder || win.MSBlobBuilder,
        Blob = win.Blob,
        // 流数据类型
        forceAaveableType = 'application/octet-stream',
        Event = {},
        eventObj = {},
        specialEvents = {},
        uuid = 1,
        getUid = function(obj) {
            return obj.uniqueNumber || (obj.uniqueNumber = uuid++);
        },
        rword = /[^, ]+/g,
        noop = function() {},
        Upload;

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
                    if (false ===fn.call(context, obj[i], i, obj)) {
                        break;
                    }
                }
            } else {
                for (i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        if (false ===fn.call(context, obj[i], i, obj)) {
                            break;
                        }
                    }
                }
            }
        }
    }

    if (!each.bind) {
        Function.prototype.bind = function(context) {
            var that = this;
            var args = Array.prototype.slice.call(arguments, 1);
            return function() {
                var ars = args.concat();
                ars.push.apply(ars, arguments)
                return that.apply(context, ars);
            };
        };
    }

    specialEvents.click = specialEvents.mousedown =
    specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents';

    mix(Event, {

        on: function(ele, name, func, bubble) {
            var uid = getUid(ele);
            var hd = eventObj[uid] || (eventObj[uid] = {});
            if (!hd[name]) hd[name] = [];
            bubble = !!bubble;
            hd[name].push({
                func: func,
                bubble: bubble
            });
            ele.addEventListener && ele.addEventListener(name, func, bubble);
        },

        off: function(ele, name, func, bubble) {
            var uid = getUid(ele);
            var hd = eventObj[uid];
            if (!hd) return;
            hd = hd[name];
            if (!hd || !hd.length) return;
            bubble = !!bubble;
            if (func) {
                each(hd, function(obj, index) {
                    if (obj.func === func && obj.bubble === (bubble)) {
                        hd.splice(index, 1);
                        ele.removeEventListener && ele.removeEventListener(name, func, bubble);
                    }
                });
            } else {
                each(hd, function(obj, index) {
                    ele.removeEventListener && ele.removeEventListener(name, obj.func, obj.bubble);
                });
                hd.length = 0;
            }
        },

        trigger: function(ele, name, e, data) {
            if (!data) {
                data = e;
            }
            if (ele.dispatchEvent) {
                if (!e) {
                    e = doc.createEvent(specialEvents[name] || 'Events');
                    e.type = name;
                    e.data = data;
                    e.target = ele;
                    e.initEvent(name, true, true);
                }
                if (!e.data) e.data = data;
                ele.dispatchEvent(e);
                return true;
            } else {
                var uid = getUid(ele);
                var hd = eventObj[uid];
                if (!hd) return false;
                hd = hd[name];
                if (!hd || !hd.length) return false;
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
    each(Event, function(func, name) {
        Event[name] = function(ele, names) {
            var args = arguments;
            if (names === Object(names)) {
                each(names, function(handler, nms) {
                    args.callee.call(Event, ele, nms, handler, args[2]);
                });
            }
            if (!getType(names, 'string')) return false;
            names = names.match(rword);
            if (!names || !names.length) return false;
            var i = names.length;
            while(i--) {
                func.call(Event, ele, names[i], args[2], args[3]);
            };
        };
    });
    function handlerFalse(func, context) {
        var rfalse = {val: false};
        context || (context = win);
        func.call(context, rfalse);
        return !rfalse.val;
    }
    Event.stop = function(e) {
        e.stopPropagation();
        e.preventDefault();
    };

    // URL 具有 createObjectURL revokeObjectURL两个方法
    // 前者是创建对象URL 后者是释放对象URL
    // https://dvcs.w3.org/hg/url/raw-file/tip/Overview.html
    // https://developer.mozilla.org/zh-CN/docs/DOM/window.URL.createObjectURL
    if (!URL) {
        URL = function URL() {};
        mix(URL, {

            _URLS: [],
            
            createObjectURL: function(blob) {
                var type = blob.type || forceAaveableType,
                    dataURIHeader = 'data:' + type,
                    ret = '';
                if (blob.encoding === 'base64') {
                    ret = dataURIHeader + ';base64,' + blob.data;
                } else if (blob.encoding === 'URI') {
                    ret = dataURIHeader + ',' + decodeURIComponent(blob.data);
                }
                if (btoa) {
                    ret = dataURIHeader + ';base64,' + btoa(blob.data);
                } else {
                    ret = dataURIHeader + ',' + encodeURIComponent(blob.data);
                }
                URL._URLS.push(ret);
                return ret;
            },

            revokeObjectURL: function(objURL) {
                each(URL._URLS, function(url, i) {
                    if (objURL === url) {
                        URL._URLS.splice(i, 1);
                    }
                });
            }
        });
    }

    saveAs || (saveAs = function(win, doc) {

        var
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
                    win.open(objURL, '_blank');
                }
                filesaver.readyState = filesaver.DONE;
                Event.trigger(filesaver, 'writestart progress write writeend');
            },
            createIfNotFound = {create: true, exclusive: false},
            objURL, targetView;

            filesaver.readyState = filesaver.INIT;
            name || (name = 'download'); // 默认文件名
            if (canUseSaveLink) {
                objURL = linkA.href = getObjURL(blob);
                linkA.download = name;
                Event.trigger(linkA, 'click');
                filesaver.readyState = filesaver.DONE;
                Event.trigger(filesaver, 'writestart progress write writeend');
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
                // https://developer.mozilla.org/en-US/docs/Web/API/DirectoryEntry
                // http://dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-DirectoryEntry
                // fs.name {String} => 当前文件系统的名字 唯一的 
                // https://developer.mozilla.org/en-US/docs/Web/API/FileSystem?redirectlocale=en-US&redirectslug=DOM%2FFile_API%2FFile_System_API%2FFileSystem
                fs.root.getDirectory('saved', createIfNotFound, abortable(function(dirEntry) {
                    // dirEntry => DirectoryEntry
                    var save = function() {
                        dirEntry.getFile(name, createIfNotFound, abortable(function(fileEntry) {
                            // fileEntry => FileEntry
                            // http://dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-FileEntry
                            fileEntry.createWriter(abortable(function(fileWriter) {
                                // http://dev.w3.org/2009/dap/file-system/file-writer.html
                                fileWriter.onwriteend = function(evt) {
                                    targetView && targetView.location.href = fileEntry.toURL();
                                    deletionQueue.push(fileEntry);
                                    filesaver.readyState = filesaver.DONE;
                                    Event.trigger(filesaver, 'writeend', evt);
                                };
                                fileWriter.onerror = function(err) {
                                    err = err || fileWriter.error;
                                    if (err.code !== err.ABORT_ERR) {
                                        fsError();
                                    }
                                };
                                // 通知外界fileSaver触发某些事件
                                each('writestart progress write abort'.split(' '), function(evtName) {
                                    fileWriter['on' + evtName] = function(evt) {
                                        Event.trigger(filesaver, evtName, evt);
                                    };
                                });
                                fileWriter.write(blob);
                                // 当外界调用abort的时候
                                // 停止fileWriter
                                filesaver.abort = function() {
                                    fileWriter.abort();
                                    filesaver.readyState = filesaver.DONE;
                                };
                                filesaver.readyState = filesaver.WRITING;
                            }), fsError);
                        }), fsError);
                    };
                    // 尝试得到文件(不创建)
                    dirEntry.getFile(name, {create: false}, abortable(function(fileEntry) {
                        // 已经存在
                        fileEntry.remove();
                        save();
                    }), abortable(function(err) {
                        // 不存在
                        if (err.code === err.NOT_FOUND_ERR) {
                            // 当找不到的时候 保存
                            save();
                        } else {
                            // 其他错误
                            fsError();
                        }
                    }));
                }), fsError);
            }), abortable(function(fr) {
                // 失败
                // fr => FileError对象
                // https://developer.mozilla.org/en-US/docs/Web/API/FileError?redirectlocale=en-US&redirectslug=Web%2FGuide%2FFile_System_API%2FFileError
                fsError();
            }));
        };
        mix(FileSaver.prototype, {

            abort: function() {
                this.readyState = this.DONE;
                Event.trigger(this, 'abort');
            },

            INIT: 0,
            WRITING: 1,
            DONE: 2,

            readyState: 0
        });

        function saveAs(blob, name) {
            return new FileSaver(blob, name);
        }

        Event.on(win, 'unload', function() {
            // 释放 URL对象以及File对象
            var i = deletionQueue.length;
            while (i--) {
                var file = deletionQueue[i];
                if (typeof file === 'string') {
                    // URL Object
                    URL.revokeObjectURL(file);
                } else {
                    // FileEntry
                    file.remove();
                }
            }
            deletionQueue.length = 0;
        }, false);

        return saveAs;
    }(win, doc));

    // BlobBuilder
    // http://dev.w3.org/2009/dap/file-system/file-writer.html#the-blobbuilder-interface
    // https://developer.mozilla.org/en-US/docs/DOM/BlobBuilder?redirect=no
    if (!BlobBuilder && !getType(BlobBuilder, 'function')) {
        BlobBuilder = function(win) {
            
            var
            // FileReader => 异步读取
            // FileReaderSync => 同步读取
            // 读取File(inherits from Blob)或Blob对象中的内容
            // http://www.w3.org/TR/FileAPI/#dfn-FileReaderSync
            FileReaderSync = win.FileReaderSync,
            FileException = function(type) {
                this.code = this[this.name = type];
            },
            FEProto = FileException.prototype,
            // 将ascii字符串或二进制数据转换成一个base64编码过的字符串,
            // 该方法不能直接作用于Unicode字符串.
            // https://developer.mozilla.org/en-US/docs/Web/API/window.btoa
            btoa = win.btoa,
            // 和btoa方法相反 将已经被base64编码过的数据进行解码.
            // https://developer.mozilla.org/en-US/docs/Web/API/window.atob?redirectlocale=en-US&redirectslug=DOM%2Fwindow.atob
            atob = win.atob,
            // 二进制数据的原始缓冲区 类型化数组
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays/ArrayBuffer
            // http://msdn.microsoft.com/zh-cn/library/ie/br212474(v=vs.94).aspx
            // http://msdn.microsoft.com/zh-cn/library/ie/br212485(v=vs.94).aspx
            // http://blog.csdn.net/hfahe/article/details/7421203
            ArrayBuffer = win.ArrayBuffer,
            Uint8Array = win.Uint8Array,
            // 类型化数组是否可以通过fun.apply调用
            canApplyTypedArrays = false,
            FakeBlob;

            function BlobBuilder() {
                this.data = [];
            }

            FakeBlob = function Blob(data, type, encoding) {
                this.data = data;
                this.size = data.length;
                this.type = type;
                this.encoding = encoding;
            };

            BlobBuilder.fake = FakeBlob.prototype.fake = true;

            // https://developer.mozilla.org/en-US/docs/Web/API/FileException
            each((
                'NOT_FOUND_ERR SECURITY_ERR ABORT_ERR NOT_READABLE_ERR ENCODING_ERR ' +
                'NO_MODIFICATION_ALLOWED_ERR INVALID_STATE_ERR SYNTAX_ERR  ' +
                'INVALID_MODIFICATION_ERR QUOTA_EXCEEDED_ERR TYPE_MISMATCH_ERR PATH_EXISTS_ERR'
            ).match(rword), function(NAME, i) {
                FEProto[NAME] = i + 1;
            });

            if (Uint8Array) {
                try {
                    (function(pass) {
                        canApplyTypedArrays = !pass;
                    }).apply(win, new Uint8Array(1));
                } catch(e) {}
            }
            
            mix(FakeBlob.prototype, {

                toString: function() {
                    return '[object Blob]';
                },

                slice: function(start, end, type) {
                    type || (type = null);
                    start || (start = 0);
                    end || (end = this.data.length);
                    return new FakeBlob(this.data.slice(start, end), type, this.encoding);
                }

            });

            mix(BlobBuilder.prototype, {

                append: function(data, endings) {
                    // data 可以是String|Blob|ArrayBuffer
                    var _data = this.data, dataType = getType(data);
                    if (Uint8Array && (data instanceof ArrayBuffer || data instanceof Uint8Array)) {
                        if (canApplyTypedArrays) {
                            _data.push(String.fromCharCode.apply(String, new Uint8Array(data)));
                        } else {
                            var str = '',
                                buf = new Uint8Array(data),
                                i = 0,
                                bufLen = buf.length;
                            ;
                            for (; i < bufLen; i++) {
                                str += String.fromCharCode(buf[i]);
                            }
                            _data.push(str);
                        }
                    } else if (dataType === 'Blob' || dataType === 'File') {
                        if (FileReaderSync) {
                            _data.push((new FileReaderSync()).readAsBinaryString(data));
                        } else {
                            throw new FileException('NOT_READABLE_ERR');
                        }
                    } else if (data instanceof FakeBlob) {
                        if (data.encoding === 'base64' && atob) {
                            _data.push(atob(data.data));
                        } else if (data.encoding === 'URI') {
                            _data.push(decodeURIComponent(data.data));
                        } else if (data.encoding === 'raw') {
                            _data.push(data.data);
                        }
                    } else {
                        data += '';
                        // 参见btoa 的 Unicode Strings章节
                        // 在js引擎内部,encodeURIComponent(str)相当于escape(unicodeToUTF8(str))
                        // 所以可以猜测unicodeToUTF8(str)等同于unescape(encodeURIComponent(str))
                        /* function utf8_to_b64( str ) {
                               return window.btoa(unescape(encodeURIComponent( str )));
                           }
                        */
                        _data.push(unescape(encodeURIComponent(data)));
                    }
                },

                getBlob: function(type) {
                    type || (type = null);
                    return new FakeBlob(this.data.join(''), type, 'raw');
                },

                toString: function() {
                    return '[object BlobBuilder]';
                }

            });

            return BlobBuilder;
        }(win);
    }

    // Blob => Big Large Object
    // http://www.w3.org/TR/FileAPI/#dfn-Blob
    if (!Blob || !getType(Blob, 'function')) {
        // blobParts
        // http://www.w3.org/TR/2012/WD-FileAPI-20121025/#dfn-blobParts
        Blob = function(blobParts, options) {
            var type = options && options.type || '';
            var builder = new BlobBuilder();
            if (blobParts) {
                for (var i = 0, len = blobParts.length; i < len; i++) {
                    builder.append(blobParts[i]);
                }
            }
            return builder.getBlob(type);
        };
    }

    Upload = function() {

        var support = {

            xhrFileUpload: !!(win.XMLHttpRequestUpload && win.FileReader),

            // http://www.w3.org/TR/XMLHttpRequest2/#interface-formdata
            xhrFormDataFileUpload: !!win.FormData

        };

        function Upload(ele, options) {
            this.options = mix({

                // 拖拽区域
                dropZone: doc,

                // 粘贴区域
                pasteZone: doc,

                // input type=file 元素
                fileInput: null,

                paramName: undefined,

                // 是否是单独文件上传
                // 默认是true，如果是false的话
                // 将所有文件一次上传
                singleFileUploads: true,

                // 如果singleFileUploads是false
                // 要限制一个xhr能够上传的文件数
                limitMultiFileUploads: false,

                // 是否有序上传
                sequentialUploads: false,

                // 并发上传限制数目
                limitConcurrentUploads: undefined,

                // 默认情况下 XHR 文件上传是复合式(multipart)form-data
                multipart: true,

                // 分块上传时每块的大小限制值
                maxChunkSize: undefined,

                // 已上传的字节数 这个是会被更改的
                uploadedBytes: undefined,

                // 
                recalculateProgress : true,

                // progress事件触发间隔
                progressInterval: 100,

                // progress过程中 计算速率的时间间隔
                bitrateInterval: 500,

                // 当有文件新增的时候是否自动上传
                autoUpload: true,

                messages: {
                    uploadedBytes: '上传文件过大'
                },

                // 便捷的封装得到错误信息的函数
                i18n: function(message, context) {
                    message = this.messages[message] || message.toString();
                    if (context) {
                        each(context, function (value, key) {
                            message = message.replace('{' + key + '}', value);
                        });
                    }
                    return message;
                },

                formData: function(form) {
                    var result = [];
                    each(form.elements, function(ele) {
                      var type = ele.getAttribute('type');
                      if (ele.nodeName.toLowerCase() != 'fieldset' &&
                        !ele.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
                        ((type != 'radio' && type != 'checkbox') || ele.checked))
                        result.push({
                          name: ele.getAttribute('name'),
                          value: ele.value
                        });
                    });
                    return result
                },

                add: function(e, data) {
                    // 是自动提交的话
                    if (data.autoUpload || (data.autoUpload !== false &&
                            this.options.autoUpload)) {
                        data.process().submit();
                    }
                    return this.options.onAdd.call(this, e, data);
                },

                onAdd: noop,

                processData: false,

                contentType: false,

                cache: false,

                onDragEnter: noop,

                onDragOver: noop,

                onDrop: noop,

                onPaste: noop,

                onChange: noop,

                onAdd: noop,

                onProgress: noop,

                onProgressAll: noop,

                onSubmit: noop,

                onSend: noop,

                onDone: noop,

                onFail: noop,

                onAlways: noop,

                onStart: noop,

                onChunkSend: noop,

                onChunkDone: noop,

                onChunkFail: noop,

                onChunkAlways: noop,

                onStop: noop

            }, options);

            this.ele = ele;
    
            this.init();

        }

        mix(Upload.prototype, {

            init: function() {
                this._initOptions();
                // 所有的上传
                this.uploads = [];
                // 正在上传的数目 当前上传index
                this._sendingNo = this._activeIndex = 0;
                this._initProgressObject(this);
                this._initEvents();
            },

            _initOptions: function() {
                var ele = this.ele;
                if (!this.options.fileInput) {
                    if (ele.nodeType === 1 && ele.nodeName.toLowerCase() === 'input' &&
                        ele.type && ele.type === 'file') {
                        this.options.fileInput = ele;
                    } else if (ele.querySelector) {
                        this.options.fileInput = ele.querySelector('input[type="file"]');
                    }
                }
                if (getType(this.options.dropZone, 'string')) {
                    this.options.dropZone = doc.querySelector(this.options.dropZone);
                }
                if (getType(this.options.pasteZone, 'string')) {
                    this.options.pasteZone = doc.querySelector(this.options.pasteZone);
                }
            },

            xhr: function() {
                return new XMLHttpRequest();
            },

            ajax: function() {
                var htmlType = 'text/html',
                    jsonType = 'application/json',
                    escape = encodeURIComponent,
                    scriptTypeRE = /^(?:text|application)\/javascript/i,
                    xmlTypeRE = /^(?:text|application)\/xml/i,
                    blankRE = /^\s*$/,
                    ajaxSettings = {
                    type: 'GET',
                    success: noop,
                    error: noop,
                    complete: noop,
                    context: null,
                    dataType: 'json',
                    // MIME types mapping
                    accepts: {
                      script: 'text/javascript, application/javascript',
                      json:   jsonType,
                      xml:    'application/xml, text/xml',
                      html:   htmlType,
                      text:   'text/plain'
                    },
                    // Default timeout
                    timeout: 0
                };
                function serialize(params, obj, traditional, scope){
                    var array = getType(obj, 'array');
                    each(obj, function(value, key) {
                        if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']';
                        if (!scope && array) params.add(value.name, value.value);
                        else if (traditional ? getType(value, 'array') : getType(value, 'object'))
                            serialize(params, value, traditional, key);
                        else params.add(key, value);
                    })
                }
                function param(data, traditional) {
                    var ary = [];
                    ary.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
                    serialize(ary, obj, traditional);
                    return ary.join('&').replace('%20', '+');
                }
                function appendQuery(url, query) {
                    return (url + '&' + query).replace(/[&?]{1,2}/, '?');
                }
                function serializeData(options) {
                    if (getType(options.data, 'object')) options.data = param(options.data)
                    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
                        options.url = appendQuery(options.url, options.data)
                }
                function mimeToDataType(mime) {
                    return mime && ( mime == htmlType ? 'html' :
                        mime == jsonType ? 'json' :
                        scriptTypeRE.test(mime) ? 'script' :
                        xmlTypeRE.test(mime) && 'xml' ) || 'text';
                }
                return function(options) {
                    var settings = mix({}, options || {});
                    each(ajaxSettings, function(val, key) {
                        if (settings[key] === undefined) {
                            settings[key] = val;
                        }
                    });
                    if (!settings.url) settings.url = window.location.toString();
                    serializeData(settings);
                    var dataType = settings.dataType;
                    var mime = settings.accepts[dataType],
                        baseHeaders = { },
                        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
                        xhr = settings._xhr() || this.xhr(),
                        abortTimeout;

                    baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
                    if (mime) {
                        baseHeaders['Accept'] = mime;
                        if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0];
                        xhr.overrideMimeType && xhr.overrideMimeType(mime);
                    }
                    if (settings.contentType || (settings.data && settings.type.toUpperCase() != 'GET'))
                        baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded');
                    settings.headers = mix(baseHeaders, settings.headers || {});

                    xhr.onreadystatechange = function(){
                        if (xhr.readyState == 4) {
                            if (abortTimeout) clearTimeout(abortTimeout);
                            var result, error = false;
                            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
                                dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'));
                                result = xhr.responseText;
                                try {
                                    if (dataType == 'script')    (1,eval)(result);
                                    else if (dataType == 'xml')  result = xhr.responseXML;
                                    else if (dataType == 'json') result = blankRE.test(result) ? null : JSON.parse(result);
                                } catch (e) { error = e }

                                if (error) {
                                    settings.error.call(settings.context, error, xhr, 'parsererror', settings);
                                    settings.complete.call(settings.context, error, xhr, 'parsererror', settings);
                                }
                                else {
                                    settings.success.call(settings.context, result, xhr, settings);
                                    settings.complete.call(settings.context, result, xhr, settings);
                                }
                            } else {
                                settings.error.call(settings.context, null, xhr, 'error', settings);
                                settings.complete.call(settings.context, null, xhr, 'error', settings);
                            }
                        }
                    }

                    var async = 'async' in settings ? settings.async : true;
                    xhr.open(settings.type, settings.url, async);

                    for (var name in settings.headers) xhr.setRequestHeader(name, settings.headers[name]);

                    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
                        xhr.onreadystatechange = noop;
                        xhr.abort();
                        setting.error.call(settings.context, null, xhr, 'timeout', settings);
                        setting.complete.call(settings.context, null, xhr, 'timeout', settings);
                    }, settings.timeout)

                    xhr.send(settings.data ? settings.data : null);
                    return xhr;
                };
            }(),

            _initEvents: function() {
                if (this._isXHRUpload(this.options)) {
                    Event.on(this.options.dropZone, {
                        'dragenter': this._onDragEnter.bind(this),
                        'dragover': this._onDragOver.bind(this),
                        'dragleave': this._onDragLeave.bind(this),
                        'drop': this._onDrop.bind(this)
                    });
                    Event.on(this.options.pasteZone, 'paste', this._onPaste.bind(this));
                }
                this.options.fileInput &&
                    Event.on(this.options.fileInput, 'change', this._onChange.bind(this));
            },

            _destroyEvents: function() {
                Event.off(this.options.dropZone, 'dragenter dragover dragleave drop');
                Event.off(this.options.pasteZone, 'paste');
                this.options.fileInput &&
                    Event.off(this.options.fileInput, 'change');
            },

            _onDragEnter: function(e) {
                Event.stop(e);
                this.options.onDragEnter.call(this, e);
            },

            _onDragOver: function(e) {
                Event.stop(e);
                this.options.onDragOver.call(this, e);
            },

            _onDragLeave: function(e) {
                Event.stop(e);
                this.options.onDragLeave.call(this, e);
            },

            _onDrop: function(e) {
                Event.stop(e);
                var that = this,
                    dataTransfer = e.dataTransfer,
                    data = {};
                if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
                    this._getDroppedFiles(dataTransfer, function(files) {
                        data.files = files;
                        if (that.options.onDrop.call(that, e, data) !== false) {
                            that._onAdd(e, data);
                        }
                    });
                }
            },

            _onPaste: function(e) {
                var items = e.clipboardData && e.clipboardData.items,
                    data = { files: [] };
                if (items && items.length) {
                    each(items, function (item, index) {
                        var file = item.getAsFile && item.getAsFile();
                        file && data.files.push([file]);
                    });
                    if (this.options.onPaste.call(this, e, data) === false ||
                            this._onAdd(e, data) === false) {
                        return false;
                    }
                }
            },

            _onChange: function(e) {
                var that = this,
                    data = {
                        fileInput: e.target,
                        form: e.target.form
                    };
                this._getFileInputFiles(data.fileInput, function (files) {
                    data.files = files;
                    if (that.options.onChange.call(that, e, data) !== false) {
                        that._onAdd(e, data);
                    }
                });
            },

            _getDroppedFiles: function(dataTransfer, func) {
                dataTransfer = dataTransfer || {};
                var items = dataTransfer.items;
                if (items && items.length && (items[0].webkitGetAsEntry ||
                        items[0].getAsEntry)) {
                    var entries = [];
                    each(items, function (item) {
                        var entry;
                        if (item.webkitGetAsEntry) {
                            entry = item.webkitGetAsEntry();
                            if (entry) {
                                // Workaround for Chrome bug #149735:
                                entry._file = item.getAsFile();
                            }
                            return entries.push(entry);
                        }
                        entries.push(item.getAsEntry());
                    });
                    return this._handleFileTreeEntries(
                        entries,
                        null,
                        function(fs) {
                            func(fs);
                        }
                    );
                }
            },

            _getFileInputFiles: function(fileInput, func) {
                var entries = fileInput.webkitEntries || fileInput.entries,
                    files,
                    value;
                // https://webcache.googleusercontent.com/search?q=cache:CP0LYsOUWBkJ:updates.html5rocks.com/2012/08/Integrating-input-type-file-with-the-Filesystem-API+&cd=1&hl=zh-CN&ct=clnk&gl=cn
                if (entries && entries.length) {
                    return this._handleFileTreeEntries(entries, null, function(fs) {
                        func(fs);
                    });
                }
                files = fileInput.files;
                if (!files.length) {
                    value = fileInput.value;
                    if (!value) {
                        return func([]);
                    }
                    // If the files property is not available, the browser does not
                    // support the File API and we add a pseudo File object with
                    // the input value as name with path information removed:
                    files = [{name: value.replace(/^.*\\/, '')}];
                } else if (files[0].name === undefined && files[0].fileName) {
                    // File normalization for Safari 4 and Firefox 3:
                    each(files, function (file) {
                        file.name = file.fileName;
                        file.size = file.fileSize;
                    });
                }
                return func(files);
            },

            _handleFileTreeEntry: function(entry, path, entries) {
                // https://developer.mozilla.org/en-US/docs/Web/API/Entry
                // https://developer.mozilla.org/en-US/docs/Web/API/FileEntry
                var that = this,
                    errorHandler = function (e) {
                        if (e && !e.entry) {
                            e.entry = entry;
                        }
                        files = [e];
                        Event.trigger(entries, 'onedone', files);
                    },
                    dirReader, files;
                path = path || '';
                if (entry.isFile) {
                    if (entry._file) {
                        // Workaround for Chrome bug #149735
                        entry._file.relativePath = path;
                        files = entry._file;
                    } else {
                        entry.file(function (file) {
                            file.relativePath = path;
                            files = file;
                            Event.trigger(entries, 'onedone', files);
                        }, errorHandler);
                    }
                } else if (entry.isDirectory) {
                    dirReader = entry.createReader();
                    dirReader.readEntries(function (_entries) {
                        that._handleFileTreeEntries(
                            _entries,
                            path + entry.name + '/',
                            function(files) {
                                Event.trigger(entries, 'onedone', files);
                            }
                        );
                    }, errorHandler);
                } else {
                    // Return an empy list for file system items
                    // other than files or directories:
                    files = [];
                }
                if (files) Event.trigger(entries, 'onedone', files);
                return files;
            },

            _handleFileTreeEntries: function(entries, path, func) {
                var files = [];
                var len = entries.length;
                Event.on(entries, 'onedone', function(file) {
                    files.push(file.data);
                    // 所有的都已得到
                    if (files.length === len) {
                        Event.off(entries, 'onedone');
                        func(files);
                    }
                });
                each(entries, function(entry) {
                    this._handleFileTreeEntry(entry, path, entries);
                }, this);
            },

            _getParamName: function(options) {
                var fileInput = options.fileInput,
                    paramName = options.paramName;
                if (!paramName) {
                    paramName = [];
                    var name = fileInput.name || 'files[]',
                        i = (fileInput.files || [1]).length;
                    while (i--) {
                        paramName.push(name);
                    }
                } else if (!getType(paramName, 'array')) {
                    paramName = [paramName];
                }
                return paramName;
            },

            _onAdd: function(e, data) {
                var that = this,
                    result = true,
                    options = mix({}, this.options, data),
                    limit = options.limitMultiFileUploads,
                    paramName = this._getParamName(options),
                    paramNameSet,
                    paramNameSlice,
                    fileSet,
                    i;
                if (!(options.singleFileUploads || limit) ||
                        !this._isXHRUpload(options)) {
                    fileSet = [data.files];
                    paramNameSet = [paramName];
                } else if (!options.singleFileUploads && limit) {
                    fileSet = [];
                    paramNameSet = [];
                    for (i = 0; i < data.files.length; i += limit) {
                        fileSet.push(data.files.slice(i, i + limit));
                        paramNameSlice = paramName.slice(i, i + limit);
                        if (!paramNameSlice.length) {
                            paramNameSlice = paramName;
                        }
                        paramNameSet.push(paramNameSlice);
                    }
                } else {
                    paramNameSet = paramName;
                }
                data.originalFiles = data.files;
                each(fileSet || data.files, function (fl, index) {
                    var newData = mix({}, data);
                    // 每一个fileSet中包含的多个file
                    newData.files = fileSet ? fl : getType(fl, 'array') ? fl : [fl];
                    newData.paramName = paramNameSet[index];
                    that._initResponseObject(newData);
                    that._initProgressObject(newData);
                    that._addConvenienceMethods(e, newData);
                    return that.options.add.call(that, e, newData);
                });
                return result;
            },

            _beforeSend: function(e, data) {
                if (this._activeIndex === 0) {
                    this.options.onStart.call(this, e, data);
                    // Set timer for global bitrate progress calculation:
                    this._bitrateTimer = new this._BitrateTimer();
                    // Reset the global progress values:
                    this._progress.loaded = this._progress.total = 0;
                    this._progress.bitrate = 0;
                }
                // Make sure the container objects for the .response() and
                // .progress() methods on the data object are available
                // and reset to their initial state:
                this._initResponseObject(data);
                this._initProgressObject(data);
                data._progress.loaded = data.loaded = data.uploadedBytes || 0;
                data._progress.total = data.total = this._getTotal(data.files) || 1;
                data._progress.bitrate = data.bitrate = 0;
                this._activeIndex += 1;
                // Initialize the global progress values:
                this._progress.loaded += data.loaded;
                this._progress.total += data.total;
            },

            _onSend: function(e, data) {
                if (!data.submit) {
                    this._addConvenienceMethods(e, data);
                }
                var that = this,
                    xhr,
                    aborted,
                    options = that._getAjaxSettings(data),
                    send = function() {
                        that._sendingNo += 1;
                        options._bitrateTimer = new that._BitrateTimer();
                        xhr = xhr || (
                            (aborted || that.options.onSend.call(that, e, options) === false) ||
                            that._chunkedUpload(options) || that.ajax(mix(options, {
                                success: function(result, textStatus, xhr) {
                                    data.state('resolve');
                                    Event.trigger(options.EVENT, 'success', result);
                                    that._onDone(result, textStatus, xhr, options);
                                },
                                error: function(xhr, textStatus, errorThrown) {
                                    data.state('reject');
                                    Event.trigger(options.EVENT, 'fail', xhr, textStatus);
                                    that._onFail(xhr, textStatus, errorThrown, options);
                                },
                                complete: function(XHRorResult, textStatus, XHRorError) {
                                    that._onAlways(
                                        XHRorResult,
                                        textStatus,
                                        XHRorError,
                                        options
                                    );
                                    that._sendingNo -= 1;
                                    that._activeIndex -= 1;
                                    if (that._activeIndex === 0) {
                                        that.options.onStop.call(that);
                                    }
                                }
                            }))
                        );
                        Event.on(options.EVENT, 'abort', function() {
                            aborted = true;
                            xhr.abort();
                        });
                        return xhr;
                    };
                this._beforeSend(e, options);
                return send();
            },

            _onDone: function(result, textStatus, xhr, options) {
                var total = options._progress.total,
                    response = options._response;
                if (options._progress.loaded < total) {
                    // Create a progress event if no final progress event
                    // with loaded equaling total has been triggered:
                    this._onProgress({
                        lengthComputable: true,
                        loaded: total,
                        total: total
                    }, options);
                }
                response.result = options.result = result;
                response.textStatus = options.textStatus = textStatus;
                response.xhr = options.xhr = xhr;
                this.options.onDone.call(this, options);
            },

            _onFail: function(xhr, textStatus, errorThrown, options) {
                var response = options._response;
                if (options.recalculateProgress) {
                    // Remove the failed (error or abort) file upload from
                    // the global progress calculation:
                    this._progress.loaded -= options._progress.loaded;
                    this._progress.total -= options._progress.total;
                }
                response.xhr = options.xhr = xhr;
                response.textStatus = options.textStatus = textStatus;
                response.errorThrown = options.errorThrown = errorThrown;
                this.options.onFail.call(this, options);
            },

            _onAlways: function(XHRorResult, textStatus, XHRorError, options) {
                this.options.onAlways.call(this, options);
            },

            _initProgressListener: function(options) {
                var that = this,
                    xhr = options._xhr ? options._xhr() : this.xhr();
                // Accesss to the native XHR object is required to add event listeners
                // for the upload progress event:
                if (xhr.upload) {
                    Event.on(xhr.upload, 'progress', function (e) {
                        that._onProgress(e, options);
                    });
                    options._xhr = function () {
                        return xhr;
                    };
                }
            },

            _onProgress: function(e, data) {
                if (e.lengthComputable) {
                    var now = ((Date.now) ? Date.now() : (new Date()).getTime()),
                        loaded;
                    if (data._time && data.progressInterval &&
                            (now - data._time < data.progressInterval) &&
                            e.loaded !== e.total) {
                        return;
                    }
                    data._time = now;
                    loaded = Math.floor(
                        e.loaded / e.total * (data.chunkSize || data._progress.total)
                    ) + (data.uploadedBytes || 0);
                    // Add the difference from the previously loaded state
                    // to the global loaded counter:
                    this._progress.loaded += (loaded - data._progress.loaded);
                    this._progress.bitrate = this._bitrateTimer.getBitrate(
                        now,
                        this._progress.loaded,
                        data.bitrateInterval
                    );
                    data._progress.loaded = data.loaded = loaded;
                    data._progress.bitrate = data.bitrate = data._bitrateTimer.getBitrate(
                        now,
                        loaded,
                        data.bitrateInterval
                    );
                    // Trigger a custom progress event with a total data property set
                    // to the file size(s) of the current upload and a loaded data
                    // property calculated accordingly:
                    this.options.onProgress.call(this, e, data);
                    // Trigger a global progress event for all current file uploads,
                    // including ajax calls queued for sequential file uploads:
                    this.options.onProgressAll.call(this, e, this._progress);
                }
            },

            _getAjaxSettings: function(data) {
                var options = mix({}, this.options, data);
                this._initFormSettings(options);
                this._initDataSettings(options);
                return options;
            },

            _getFormData: function(options) {
                var formData;
                if (typeof options.formData === 'function') {
                    return options.formData(options.form);
                }
                if (getType(options.formData, 'array')) {
                    return options.formData;
                }
                if (getType(options.formData, 'object')) {
                    formData = [];
                    each(options.formData, function (value, name) {
                        formData.push({name: name, value: value});
                    });
                    return formData;
                }
                return [];
            },

            _initXHRData: function(options) {
                var that = this,
                    formData,
                    file = options.files[0],
                    // Ignore non-multipart setting if not supported:
                    multipart = options.multipart || !support.xhrFileUpload,
                    paramName = options.paramName[0];
                options.headers = options.headers || {};
                if (options.contentRange) {
                    options.headers['Content-Range'] = options.contentRange;
                }
                if (!multipart || options.blob || !getType(file, 'file')) {
                    options.headers['Content-Disposition'] = 'attachment; filename="' +
                        encodeURI(file.name) + '"';
                }
                if (!multipart) {
                    options.contentType = file.type;
                    options.data = options.blob || file;
                } else if (support.xhrFormDataFileUpload) {
                    if (getType(options.formData, 'formdata')) {
                        formData = options.formData;
                    } else {
                        formData = new FormData();
                        each(this._getFormData(options), function (field) {
                            formData.append(field.name, field.value);
                        });
                    }
                    if (options.blob) {
                        formData.append(paramName, options.blob, file.name);
                    } else {
                        each(options.files, function (file, index) {
                            if (getType(file, 'file') ||
                                getType(file, 'Blob')) {
                                formData.append(
                                    options.paramName[index] || paramName,
                                    file,
                                    file.name
                                );
                            }
                        });
                    }
                    options.contentType = 'multipart/form-data';
                    options.data = formData;
                }
                // Blob reference is not needed anymore, free memory:
                options.blob = null;
            },

            _blobSlice: function() {
                var slice = this.slice || this.webkitSlice || this.mozSlice;
                return slice.apply(this, arguments);
            },

            _chunkedUpload: function(options, testOnly) {
                options.uploadedBytes = options.uploadedBytes || 0;
                var that = this,
                    file = options.files[0],
                    fs = file.size,
                    ub = options.uploadedBytes,
                    mcs = options.maxChunkSize || fs,
                    slice = this._blobSlice,
                    xhr,
                    upload;
                if (!(this._isXHRUpload(options) && slice && (ub || mcs < fs)) ||
                        options.data) {
                    return false;
                }
                if (testOnly) {
                    return true;
                }
                if (ub >= fs) {
                    file.error = options.i18n('uploadedBytes');
                    Event.trigger(options.EVENT, 'fail', null, file.error);
                    return options;
                }
                // The chunk upload method:
                upload = function () {
                    // Clone the options object for each chunk upload:
                    var o = mix({}, options),
                        currentLoaded = o._progress.loaded;
                    o.blob = slice.call(
                        file,
                        ub,
                        ub + mcs,
                        file.type
                    );
                    // Store the current chunk size, as the blob itself
                    // will be dereferenced after data processing:
                    o.chunkSize = o.blob.size;
                    // Expose the chunk bytes position range:
                    o.contentRange = 'bytes ' + ub + '-' +
                        (ub + o.chunkSize - 1) + '/' + fs;
                    // Process the upload data (the blob and potential form data):
                    that._initXHRData(o);
                    // Add progress listeners for this chunk upload:
                    that._initProgressListener(o);
                    return (xhr = that.ajax(mix(o, {
                        success: function(result, textStatus, xhr) {
                            options.state('resolve');
                            Event.trigger(options.EVENT, 'success', result);
                            
                            ub = that._getUploadedBytes(xhr) ||
                                (ub + o.chunkSize);
                            // Create a progress event if no final progress event
                            // with loaded equaling total has been triggered
                            // for this chunk:
                            if (currentLoaded + o.chunkSize - o._progress.loaded) {
                                that._onProgress({
                                    lengthComputable: true,
                                    loaded: ub - o.uploadedBytes,
                                    total: ub - o.uploadedBytes
                                }, o);
                            }
                            options.uploadedBytes = o.uploadedBytes = ub;
                            o.result = result;
                            o.textStatus = textStatus;
                            o.xhr = xhr;
                            that._onDone(result, textStatus, xhr, o);
                            if (ub < fs) {
                                // File upload not yet complete,
                                // continue with the next chunk:
                                upload();
                            }
                        },

                        error: function(xhr, textStatus, errorThrown) {
                            options.state('reject');
                            Event.trigger(options.EVENT, 'fail', xhr, textStatus);
                            that._onFail(xhr, textStatus, errorThrown, o);
                            o.xhr = xhr;
                            o.textStatus = textStatus;
                            o.errorThrown = errorThrown;
                        },

                        complete: function(XHRorResult, textStatus, XHRorError) {
                            that._onAlways(
                                XHRorResult,
                                textStatus,
                                XHRorError,
                                options
                            );
                            that._sendingNo -= 1;
                            that._activeIndex -= 1;
                            if (that._activeIndex === 0) {
                                that.options.onStop.call(that);
                            }
                        }
                    })));
                };
                return upload();
            },

            _getUploadedBytes: function(xhr) {
                var range = xhr.getResponseHeader('Range'),
                    parts = range && range.split('-'),
                    upperBytesPos = parts && parts.length > 1 &&
                        parseInt(parts[1], 10);
                return upperBytesPos && upperBytesPos + 1;
            },

            _initDataSettings: function(options) {
                if (this._isXHRUpload(options)) {
                    if (!this._chunkedUpload(options, true)) {
                        if (!options.data) {
                            this._initXHRData(options);
                        }
                        this._initProgressListener(options);
                    }
                }
            },

            _initFormSettings: function(options) {
                if (!options.form) {
                    options.form = options.fileInput.form;
                    if (!options.form) {
                        options.form = this.options.fileInput.form;
                    }
                }
                options.paramName = this._getParamName(options);
                if (!options.url) {
                    options.url = options.form.action || location.href;
                }
                options.type = (options.type || options.form.method || '')
                    .toUpperCase();
                if (options.type !== 'POST' && options.type !== 'PUT' &&
                        options.type !== 'PATCH') {
                    options.type = 'POST';
                }
                if (!options.formAcceptCharset) {
                    options.formAcceptCharset = options.form.getAttribute('accept-charset');
                }
            },

            _getTotal: function(files) {
                var total = 0;
                each(files, function (file) {
                    total += file.size || 1;
                });
                return total;
            },

            _isXHRUpload: function(options) {
                return (!options.multipart && support.xhrFileUpload) ||
                    support.xhrFormDataFileUpload;
            },

            _BitrateTimer: function () {
                this.timestamp = ((Date.now) ? Date.now() : (new Date()).getTime());
                this.loaded = 0;
                this.bitrate = 0;
                this.getBitrate = function (now, loaded, interval) {
                    var timeDiff = now - this.timestamp;
                    if (!this.bitrate || !interval || timeDiff > interval) {
                        this.bitrate = (loaded - this.loaded) * (1000 / timeDiff) * 8;
                        this.loaded = loaded;
                        this.timestamp = now;
                    }
                    return this.bitrate;
                };
            },

            _initProgressObject: function(obj) {
                var progress = {
                    loaded: 0, // 已经上传的字节数
                    total: 0, // 总共字节数
                    bitrate: 0 // 速率
                };
                if (obj._progress) {
                    mix(obj._progress, progress);
                } else {
                    obj._progress = progress;
                }
            },

            _initResponseObject: function(obj) {
                var prop;
                if (obj._response) {
                    for (prop in obj._response) {
                        if (obj._response.hasOwnProperty(prop)) {
                            delete obj._response[prop];
                        }
                    }
                } else {
                    obj._response = {};
                }
            },

            _addConvenienceMethods: function(e, data) {
                var that = this;
                data._state = 'pending';
                data.EVENT = data.EVENT || {};
                data._success = function(func) {
                    Event.on(data.EVENT, 'success', func.bind(data, that));
                };
                data._fail = function(func) {
                    Event.on(data.EVENT, 'fail', func.bind(data, that));
                };
                data.process = function(succ, fail) {
                    if (succ) {
                        data._success(succ);
                    }
                    if (fail) {
                        data._fail(fail);
                    }
                    if (succ || fail) data._process = data;
                    return data._process || data;
                };
                data.submit = function () {
                    if (this.state() !== 'pending') {
                        this.xhr = (that.options.onSubmit.call(that, e, this) !== false) &&
                            that._onSend(e, this);
                    }
                    return this;
                };
                data.abort = function () {
                    if (this.xhr) {
                        return this.xhr.abort();
                    }
                    Event.trigger(data.EVENT, 'abort', data);
                    return this;
                };
                data.state = function (state) {
                    if (state) {
                        data._state = state;
                    } else if (this.xhr || this._process) {
                        state = data._state;
                    }
                    return state;
                };
                data.progress = function () {
                    return this._progress;
                };
                data.response = function () {
                    return this._response;
                };
            },

            active: function() {
                return this._activeIndex;
            },

            progress: function() {
                return this._progress;
            },

            add: function(data) {
                var that = this;
                if (!data || this.options.disabled) {
                    return;
                }
                if (data.fileInput && !data.files) {
                    this._getFileInputFiles(data.fileInput, function (files) {
                        data.files = files;
                        that._onAdd(null, data);
                    });
                } else {
                    data.files = [].slice.call(data.files);
                    this._onAdd(null, data);
                }
            },

            send: function(data) {
                if (data && !this.options.disabled) {
                    if (data.fileInput && !data.files) {
                        var that = this,
                            xhr,
                            aborted;
                        data.EVENT = data.EVENT || {};
                        Event.on(data.EVENT, 'abort', function() {
                            aborted = true;
                            if (xhr) xhr.abort();
                        });
                        this._getFileInputFiles(data.fileInput, function (files) {
                            if (aborted) {
                                return;
                            }
                            if (!files.length) {
                                return;
                            }
                            data.files = files;
                            // Event.on(data.EVENT, 'success', function(result, textStatus, xhr) {
                            // });
                            // Event.on(data.EVENT, 'fail', function(xhr, textStatus, errorThrown) {
                            // });
                            xhr = that._onSend(null, data);
                        });
                        return xhr;
                    }
                    data.files = [].slice.call(data.files);
                    if (data.files.length) {
                        return this._onSend(null, data);
                    }
                }
                return false;
            }

        });

        return Upload;
    }();

    

    mix(JSFile, {

        mix: mix,

        each: each,

        noop: noop,

        type: getType,

        getUid: getUid,

        Event: Event,

        URL: URL,

        BlobBuilder: BlobBuilder,

        Blob: Blob,

        saveAs: saveAs,

        Upload: Upload,

        upload: function(ele, options) {
            options || (options = {});
            return new Upload(ele, options);
        },

        saveAsTxt: function(text, name, charset) {
            return saveAs(
                new Blob([text], {
                    type: 'text/plain;charset=' + (charset || doc.characterSet)
                }),
                name + '.txt');
        },

        saveAsHTML: function(html, name, charset) {
            var _doc = createHTML(html);

            return saveAs(
                new Blob([(new XMLSerializer).serializeToString(_doc)], {
                    type: 'application/xhtml+xml;charset=' + (charset || doc.characterSet)
                }),
                name + '.html');
        }
    });

    win.JSFile = JSFile;

    function createHTML(html) {
        // http://www.php100.com/manual/w3school/xmldom/dom_domimplementation.asp.html
        var im = doc.implementation,
            _doc = im.createDocument(null, 'html', im.createDocumentType('html', null, null)),
            _docEle = _doc.documentElement,
            _head = _docEle.appendChild(_doc.createElement('head')),
            _charsetMeta = head.appendChild(doc.createElement('meta')),
            _title = head.appendChild(doc.createElement('title')),
            _body = doc_el.appendChild(doc.createElement('body'));
        
        _charsetMeta.setAttribute('charset', html.ownerDocument.charset);
        _title.appendChild(_doc.createTextNode('index'));
        _body.innerHTML = html;

        return _doc;
    }

})(this, document)
