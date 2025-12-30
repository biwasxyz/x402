import "dotenv/config";
import express from "express";
import { requestLogger } from "./middleware/logger";
import routes from "./routes";

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use(routes);

export default app;
