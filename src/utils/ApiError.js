class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong!",
        error = [],
        stack = ""
    ) {
        super(message)
        this.name = this.constructor.name;  // Set the error name to the class name
        this.statusCode = statusCode
        this.data = null
        this.error = error

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiError }