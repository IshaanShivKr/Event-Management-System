export function sendSuccess(res, message, data = {}, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message: message,
        data: data,
    });
}

export function sendError(res, message, error = null, statusCode = 500) {
    return res.status(statusCode).json({
        success: false,
        message: message,
        error: error,
    });
}