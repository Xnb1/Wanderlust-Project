class ExpressError extends Error {
    constructor (statusCode, message) {
        super();
        this.statusCode = statusCode;
        this.message = message;
        console.log("🔥 ExpressError created:", statusCode, message); // 🔥 debug
    }
};

module.exports = ExpressError;