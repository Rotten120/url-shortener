import express from "express"
import cookieParser from "cookie-parser"

import authRoutes from "./api/authRoutes.js"
import urlRoutes from "./api/urlRoutes.js"
import urlDataRoutes from "./api/urlDataRoutes.js"
import redirectRoutes from "./api/redirectRoutes.js"

// NO RATE LIMITING YET

const app = express();

app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

app.use("/auth", authRoutes);
app.use("/", redirectRoutes);
app.use("/", urlRoutes);
app.use("/url", urlDataRoutes);

if(process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
