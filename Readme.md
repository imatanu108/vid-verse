# Backend Basics

### Currently On this Documentation
1. Cookies
2. cookie-parser (npm)
3. CORS
4. Stack
5. Stack Trace

### Short Note on Cookies

**Definition**: Cookies are small pieces of data stored on a user's device by their web browser while browsing a website. They store information specific to a user and can be accessed by the web server or the client device.

**Purposes**:
1. **Session Management**: Keep users logged in as they navigate a site.
2. **Personalization**: Store user preferences like themes and languages.
3. **Tracking and Analytics**: Monitor user behavior and site usage.
4. **Storing Information**: Retain form data, shopping cart contents, etc.

**Types**:
1. **Session Cookies**: Temporary; deleted when the browser closes.
2. **Persistent Cookies**: Remain until they expire or are deleted.
3. **First-Party Cookies**: Set by the site being visited.
4. **Third-Party Cookies**: Set by external domains for ads and tracking.

**Usage Example**:
- **Setting a Cookie**:
  ```javascript
  document.cookie = "username=JohnDoe; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
  ```
- **Retrieving a Cookie**:
  ```javascript
  function getCookie(name) {
      let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      if (match) return match[2];
  }
  const username = getCookie("username");
  ```

**Security Considerations**:
- **HTTP-Only Cookies**: Cannot be accessed via JavaScript.
- **Secure Cookies**: Only sent over HTTPS.
- **SameSite Attribute**: Controls cross-site cookie sending to protect against CSRF.

Cookies are vital for enhancing web application functionality and user experience, making them essential for session management, personalization, and tracking user interactions securely.


### cookie-parser Package

**Definition**: `cookie-parser` is a middleware for Node.js and Express applications that parses cookies attached to the client request object. Once parsed, the cookies are available as a JavaScript object accessible via `req.cookies`.

**Purpose**:
- Simplifies handling cookies in Express.js applications.
- Parses incoming cookies, making them easily accessible.
- Handles signed cookies, verifying their integrity.


### Short Note on CORS

**Definition**: CORS (Cross-Origin Resource Sharing) is a security feature implemented by web browsers to control how resources on a web page can be requested from another domain. It allows web servers to specify who can access their resources and how.

**Purpose**:
- To enable secure cross-origin requests, allowing web applications to interact with resources hosted on different domains.

**Use Cases**:
1. **API Development**: Allowing frontend applications to request data from a backend server hosted on a different domain.
2. **Third-Party Services**: Integrating with external APIs and services.
3. **Frontend-Backend Communication**: When frontend (e.g., `frontend.example.com`) and backend (e.g., `api.example.com`) are on different subdomains.

**How It Works**:
1. **Preflight Requests**: For non-simple requests (e.g., custom headers, methods other than GET/POST), the browser sends an `OPTIONS` request to check if the actual request is safe.
2. **Response Headers**: The server includes specific CORS headers in the response to indicate permitted origins, methods, and headers.
ontrol-Allow-Credentials` judiciously to protect sensitive data.

CORS is essential for enabling secure cross-domain communication, allowing web applications to safely interact with resources from different origins while maintaining security and control over resource access.


### Stack and Stack Trace in JavaScript

**Stack** and **stack trace** are crucial concepts in understanding and debugging JavaScript code, especially when dealing with errors. Here's an explanation of each term:

### Stack

- **Definition**: A stack is a data structure used to store and manage function calls in a program. In the context of a running program, it keeps track of the order in which functions are called and manages the flow of execution.
- **Function Call Stack**: When a function is called, it's added (or "pushed") onto the top of the stack. When the function completes, it is removed (or "popped") from the top of the stack. This Last-In-First-Out (LIFO) behavior helps manage nested function calls.
- **Example**:
  ```javascript
  function first() {
      second();
  }

  function second() {
      third();
  }

  function third() {
      console.log("Hello, world!");
  }

  first();
  ```
  In this example:
  1. `first()` is called and pushed onto the stack.
  2. `first()` calls `second()`, which is then pushed onto the stack.
  3. `second()` calls `third()`, which is pushed onto the stack.
  4. `third()` logs the message and completes, so it is popped from the stack.
  5. `second()` completes and is popped from the stack.
  6. `first()` completes and is popped from the stack.

### Stack Trace

- **Definition**: A stack trace is a report of the active stack frames at a specific point in time during the execution of a program. It typically shows the sequence of function calls leading up to the current point.
- **Usage**: Stack traces are extremely useful for debugging because they show the path of execution that led to an error, helping developers identify where and why an error occurred.
- **Error Handling**: When an error occurs, the stack trace is often included in the error object, providing detailed information about the sequence of function calls that led to the error.

### Example of a Stack Trace

Consider the following code that throws an error:

```javascript
function first() {
    second();
}

function second() {
    third();
}

function third() {
    throw new Error("Something went wrong!");
}

try {
    first();
} catch (e) {
    console.log(e.stack);
}
```

When this code runs, the stack trace output will look something like this:

```
Error: Something went wrong!
    at third (/path/to/your/file.js:10:11)
    at second (/path/to/your/file.js:6:5)
    at first (/path/to/your/file.js:2:5)
    at /path/to/your/file.js:15:5
```

### Explanation of the Stack Trace

1. **Error Message**: `"Error: Something went wrong!"` – The error message provided when the error was thrown.
2. **Stack Frames**: Each line after the error message represents a stack frame, showing the function call sequence:
   - `at third (/path/to/your/file.js:10:11)`: Indicates the error was thrown in the `third` function at line 10, column 11.
   - `at second (/path/to/your/file.js:6:5)`: Indicates the `second` function called `third` at line 6, column 5.
   - `at first (/path/to/your/file.js:2:5)`: Indicates the `first` function called `second` at line 2, column 5.
   - `at /path/to/your/file.js:15:5`: Indicates where the `first` function was initially called in the try block.

### Practical Use in Error Handling

When creating custom error classes, capturing and managing stack traces helps provide detailed error information, making it easier to debug and maintain code.

### Example with Custom Error Class

Here's the `ApiError` class example again, demonstrating how stack traces are captured:

```javascript
class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong!",
        error = [],
        stack = ""
    ) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.data = null;
        this.error = error;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

// Example usage
try {
    throw new ApiError(404, "Resource not found");
} catch (e) {
    console.log(e.stack);  // Outputs the stack trace
}
```

### Summary

- **Stack**: Manages function calls in a program, following LIFO order.
- **Stack Trace**: Provides a snapshot of the call stack at a specific point, useful for debugging errors.
- **Error.captureStackTrace**: Used to capture a structured stack trace in custom error classes, excluding the constructor call from the trace.