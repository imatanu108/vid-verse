export const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
            .resolve(requestHandler(req, res, next))
            .catch((err) => next(err))
    }
}

// using try-catch

// export const asyncHandler = (requestHandler) = async (req, res, next) => {
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
