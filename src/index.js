(() =>
{
    if(typeof module !== 'undefined' && module.exports)
    {
        if(!WebSocket)
        {
            WebSocket = require('ws');
        }
    }
    
    const STATUS =
    {
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
    };
    let logger = {};

    class Cyprus
    {
        constructor(config)
        {
            config.retryDelay = config.retryDelay || 3000;
            config.timeout = config.timeout || 60000;
            this.config = config;
            this.VERSION = '2.0';

            if(config.logger && typeof config.logger.log === 'function')
            {
                logger = config.logger;
            }

            else if(typeof config.logger === 'function')
            {
                logger.log = config.logger;
            }
    
            else if(config.logger === true)
            {
                logger.log = (...args) => console.log(...args);
            }
    
            else
            {
                logger.log = () => {};
            }

            this.id = 0;
            this.requests = [];
        }

        connect(callback)
        {
            callback = typeof callback === 'function' ? callback : () => {};
            let resolved = false;

            return new Promise((resolve, reject) =>
            {
                if(this.ws && this.ws.readyState === STATUS.OPEN)
                {
                    resolved = true;
                    callback();
                    return resolve(true);
                }

                else if(!this.ws || this.ws.readyState !== STATUS.CONNECTING)
                {
                    this.reconnect = true;
                    this.ws = new WebSocket(this.config.url);

                    if(!this.ws.on)
                    {
                        this.ws.on = this.ws.addEventListener;
                        this.ws.off = this.ws.removeEventListener;
                    }
                }

                const messageFn = (event) => this.handleMessage(event);
                
                const openFn = (event) =>
                {
                    this.ws.off('open', openFn);
                    logger.log('info', `Connection established.`);
                    resolved = true;
                    callback();
                    return resolve(true);
                };
    
                const closeFn = (event) =>
                {
                    this.ws.off('close', closeFn);
                    this.ws.off('error', errorFn);
                    this.ws.off('message', messageFn);
                    this.handleClose(event);
    
                    if(!resolved)
                    {
                        resolved = true;
                        const error = new Error(`Connection closed.`);
                        callback(error)
                        return resolve(error);
                    }
                };
    
                const errorFn = (event) =>
                {
                    this.ws.off('error', errorFn);
                    this.handleError(event);
                    
                    if(!resolved)
                    {
                        resolved = true;
                        const error = new Error(`Connection error.`);
                        callback(error)
                        return resolve(error);
                    }
                };

                this.ws.on('close', closeFn);
                this.ws.on('error', errorFn);
                this.ws.on('open', openFn);
                this.ws.on('message', messageFn);
            });
        }

        findRequest(id)
        {
            for(let i=this.requests.length-1; i >= 0; i--)
            {
                if(this.requests[i].id === id)
                {
                    return this.requests.splice(i, 1)[0];
                }
            }
        }

        timeoutRequest(id)
        {
            const error = new Error(`Timeout: Request failed to complete in ${this.config.timeout/1000} seconds.`);

            if(id === undefined)
            {
                for(const request of this.requests)
                {
                    request.callback(error);
                }

                this.requests = [];
                return;
            }

            const request = this.findRequest(id);

            if(request)
            {
                request.callback(error);
            }
        }
        
        queueRequest(callback)
        {
            this.requests.push(
            {
                id: this.id,
                timer: setTimeout(this.timeoutRequest.bind(this, this.id), this.config.timeout),
                callback
            });

            return this.id++;
        }

        handleClose(event)
        {
            if(this.reconnect)
            {
                logger.log('info', `Connection closed.`);
                logger.log('info', `Retrying to connect in ${this.config.retryDelay/1000} seconds.`);
                setTimeout(this.connect.bind(this), this.config.retryDelay);
                this.timeoutRequest();
                this.reconnect = false;
            }
        }

        handleError(event)
        {
            logger.log('error', `Connection error.`);
        }

        call(args)
        {
            const wrap = (tasks, isArray) =>
            {
                return new Promise(async (resolve, reject) =>
                {
                    const results = await Promise.all(tasks);
                    return resolve(isArray ? results : results[0]);
                });
            };

            const isArray = Array.isArray(args);
            args = isArray ? args : [args];
            const tasks = args.map((call) =>
            {
                return new Promise((resolve, reject) =>
                {
                    this.ws.send(JSON.stringify(
                    {
                        jsonrpc: this.VERSION,
                        method: call.method,
                        params: call.params,
                        id: call.notification ? undefined : this.queueRequest((error, result) =>
                        {
                            if(error)
                            {
                                if(typeof call.callback === 'function')
                                {
                                    call.callback(error);
                                }

                                return resolve(error);
                            }

                            else
                            {
                                if(typeof call.callback === 'function')
                                {
                                    call.callback(null, result);
                                }

                                return resolve(result);
                            }
                        })
                    }));

                    if(call.notification)
                    {
                        return resolve(true);
                    }
                });
            });
 
            return wrap(tasks, isArray);
        }
    
        handleMessage(event)
        {
            const message = MessageEvent ? event.data : event;
            let json;
    
            try
            {
                json = JSON.parse(message);
            }
    
            catch(error)
            {
                logger.log('error', `Parse error`);
            }

            json = Array.isArray(json) ? json : [json];
            json.forEach((response) =>
            {
                const request = this.findRequest(response.id);

                if(request)
                {
                    clearTimeout(request.timer);
                    request.callback(response.error, response.result);
                }
            });
        }
    }

    if(typeof module !== 'undefined' && module.exports)
    {
        module.exports = Cyprus;
    }

    else if(typeof define === 'function' && define.amd)
    {
        define('Cyprus', () => Cyprus);
    }

    else if(window)
    {
        window.Cyprus = Cyprus;
    }
})();
