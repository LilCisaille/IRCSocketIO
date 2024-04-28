// Error handling (Error 500 by default)
class HttpError extends Error {
    constructor(message, params) {
        super(message);
        console.log([message, params])
        this.name = this.constructor.name;
        //if params is object
        if (typeof params === 'object') {
            //add all params to this
            for (let key in params) {
                this[key] = params[key];
            }
        } else if (params !== undefined) {
            //if params is not object, add it to this
            this.data = params;
        }

        //if no httpCode, set it to 500
        if (!this.httpCode) {
            this.httpCode = 500;
        }
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = HttpError
