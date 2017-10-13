var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
(function () {
    if (typeof module !== 'undefined' && module.exports) {
        if (!WebSocket) {
            WebSocket = require('ws');
        }
    }
    var STATUS = {
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
    };
    var logger = {};
    var Cyprus = /** @class */ (function () {
        function Cyprus(config) {
            config.retryDelay = config.retryDelay || 3000;
            config.timeout = config.timeout || 60000;
            this.config = config;
            this.VERSION = '2.0';
            if (typeof config.logger === 'function') {
                logger.log = config.logger;
            }
            else if (config.logger === true) {
                logger.log = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    return console.log.apply(console, args);
                };
            }
            else {
                logger.log = function () { };
            }
            this.id = 0;
            this.requests = [];
        }
        Cyprus.prototype.connect = function (callback) {
            var _this = this;
            callback = typeof callback === 'function' ? callback : function () { };
            var resolved = false;
            return new Promise(function (resolve, reject) {
                if (_this.ws && _this.ws.readyState === STATUS.OPEN) {
                    resolved = true;
                    callback();
                    return resolve(true);
                }
                else if (!_this.ws || _this.ws.readyState !== STATUS.CONNECTING) {
                    _this.reconnect = true;
                    _this.ws = new WebSocket(_this.config.url);
                    if (!_this.ws.on) {
                        _this.ws.on = _this.ws.addEventListener;
                        _this.ws.off = _this.ws.removeEventListener;
                    }
                }
                var messageFn = function (event) { return _this.handleMessage(event); };
                var openFn = function (event) {
                    _this.ws.off('open', openFn);
                    logger.log('info', "Connection established.");
                    resolved = true;
                    callback();
                    return resolve(true);
                };
                var closeFn = function (event) {
                    _this.ws.off('close', closeFn);
                    _this.ws.off('error', errorFn);
                    _this.ws.off('message', messageFn);
                    _this.handleClose(event);
                    if (!resolved) {
                        resolved = true;
                        var error = new Error("Connection closed.");
                        callback(error);
                        return resolve(error);
                    }
                };
                var errorFn = function (event) {
                    _this.ws.off('error', errorFn);
                    _this.handleError(event);
                    if (!resolved) {
                        resolved = true;
                        var error = new Error("Connection error.");
                        callback(error);
                        return resolve(error);
                    }
                };
                _this.ws.on('close', closeFn);
                _this.ws.on('error', errorFn);
                _this.ws.on('open', openFn);
                _this.ws.on('message', messageFn);
            });
        };
        Cyprus.prototype.findRequest = function (id) {
            for (var i = this.requests.length - 1; i >= 0; i--) {
                if (this.requests[i].id === id) {
                    return this.requests.splice(i, 1)[0];
                }
            }
        };
        Cyprus.prototype.timeoutRequest = function (id) {
            var error = new Error("Timeout: Request failed to complete in " + this.config.timeout / 1000 + " seconds.");
            if (id === undefined) {
                for (var _i = 0, _a = this.requests; _i < _a.length; _i++) {
                    var request_1 = _a[_i];
                    request_1.callback(error);
                }
                this.requests = [];
                return;
            }
            var request = this.findRequest(id);
            if (request) {
                request.callback(error);
            }
        };
        Cyprus.prototype.queueRequest = function (callback) {
            this.requests.push({
                id: this.id,
                timer: setTimeout(this.timeoutRequest.bind(this, this.id), this.config.timeout),
                callback: callback
            });
            return this.id++;
        };
        Cyprus.prototype.handleClose = function (event) {
            if (this.reconnect) {
                logger.log('info', "Connection closed.");
                logger.log('info', "Retrying to connect in " + this.config.retryDelay / 1000 + " seconds.");
                setTimeout(this.connect.bind(this), this.config.retryDelay);
                this.timeoutRequest();
                this.reconnect = false;
            }
        };
        Cyprus.prototype.handleError = function (event) {
            logger.log('error', "Connection error.");
        };
        Cyprus.prototype.call = function (args) {
            var _this = this;
            var wrap = function (tasks, isArray) {
                return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                    var results;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, Promise.all(tasks)];
                            case 1:
                                results = _a.sent();
                                return [2 /*return*/, resolve(isArray ? results : results[0])];
                        }
                    });
                }); });
            };
            var isArray = Array.isArray(args);
            args = isArray ? args : [args];
            var tasks = args.map(function (call) {
                return new Promise(function (resolve, reject) {
                    _this.ws.send(JSON.stringify({
                        jsonrpc: _this.VERSION,
                        method: call.method,
                        params: call.params,
                        id: call.notification ? undefined : _this.queueRequest(function (error, result) {
                            if (error) {
                                if (typeof call.callback === 'function') {
                                    call.callback(error);
                                }
                                return resolve(error);
                            }
                            else {
                                if (typeof call.callback === 'function') {
                                    call.callback(null, result);
                                }
                                return resolve(result);
                            }
                        })
                    }));
                    if (call.notification) {
                        return resolve(true);
                    }
                });
            });
            return wrap(tasks, isArray);
        };
        Cyprus.prototype.handleMessage = function (event) {
            var _this = this;
            var message = MessageEvent ? event.data : event;
            var json;
            try {
                json = JSON.parse(message);
            }
            catch (error) {
                logger.log('error', "Parse error");
            }
            json = Array.isArray(json) ? json : [json];
            json.forEach(function (response) {
                var request = _this.findRequest(response.id);
                if (request) {
                    clearTimeout(request.timer);
                    request.callback(response.error, response.result);
                }
            });
        };
        return Cyprus;
    }());
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Cyprus;
    }
    else if (typeof define === 'function' && define.amd) {
        define('Cyprus', function () { return Cyprus; });
    }
    else if (window) {
        window.Cyprus = Cyprus;
    }
})();
//# sourceMappingURL=index.js.map