const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
        .resolve(requestHandler(req, res, next))
        .catch((err) => next(err))
    }
}

export { asyncHandler }

// Basically, `asyncHandler` takes an asynchronous function and returns a new function that first attempts to resolve the asynchronous function's promise. If any errors occur during this process, `asyncHandler` catches them and passes them to the next middleware, thereby streamlining error handling in Express.js applications.

// using try-catch

// const asyncHandler = (requestHandler) = async (req, res, next) => {
//     try {
//         await requestHandler(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

// asyncHandler is a higher-order function that takes a function as its argument. It returns an asynchronous function (req, res, next) => { ... }.
