// require('dotenv').config({path: './env'})

import dotenv from 'dotenv';
import connectDB from "./db/index.js";
import { app } from './app.js';

// Loading environment variables from .env file
dotenv.config({
    path: './env'
});

// Setting the port from environment variables or default to 8000
const port = process.env.PORT || 8000;

// Connecting to the database
connectDB()
    .then(() => {
        // Handling application-level errors
        app.on("error", (error) => {
            console.error("Application Error:", error);
            throw error; // Optionally re-throw the error if needed
        });

        // Starting the server
        app.listen(port, () => {
            console.log(`Server is running at port: ${port}`);
        });
    })
    .catch((err) => {
        // Handling errors during database connection
        console.error("MongoDB connection failed:", err);
    });
