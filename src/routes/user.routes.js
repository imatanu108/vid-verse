import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router()

router.route("/register").post(registerUser) 
// The .post() method in Express.js is used to define a route that responds to HTTP POST requests. 

export default router