import express from "express";
import { testController } from "../controller/testController.js";

const testRouter = express.Router();

testRouter.get('/test-emails', testController);

export default testRouter;