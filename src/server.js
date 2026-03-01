import express from "express"
import cookieParser from "cookie-parser"
import { sessionMiddleware } from "./middleware/sessionMiddleware.js" 

import urlRoutes from "./api/urlRoutes.js"

// NO RATE LIMITING YET

const app = express();

app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

app.use("/", sessionMiddleware, urlRoutes)

if(process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
