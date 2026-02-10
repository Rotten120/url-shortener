import express from "express"
import validator from "validator"
import cookieParser from "cookie-parser"
import { prisma } from "./prismaClient.js"
import { nanoid } from "nanoid"
import { sessionMiddleware } from "./middleware/sessionMiddleware.js" 

// NO RATE LIMITING YET

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(sessionMiddleware);

app.get("/", (req, res) => {
  res.json({ message: "Hello World!", cookieId: req.visitorId });
});

// fetches all the urls made by the user
app.get("/urls", async (req, res) => {
  try {
    const urls = await prisma.url.findMany({
      where: { visitorId: req.visitorId },
      select: {
        shortCode: true,
        origUrl: true
      }
    });

    const urlCount = urls.length;

    res.json({ urls, urlCount });
  } catch(error) {
    console.log("Error: ", error);
    res.status(500).json({ message: "An error occurred, process was terminated" });
  }
});

// redirects the user to their link (no client side needed)
app.get("/:shortCode", async (req, res) => {
  const shortCode = req.params.shortCode;
  
  const url = await prisma.url.findUnique({
    where: { shortCode }
  });

  if(!url) {
    return res.status(404).json({ message: "Invalid code" })
  }

  console.log(`User ${req.visitorId} was redirected to ${url.origUrl}`);
  res.redirect(url.origUrl);
});

// core api; shortens the url
app.post("/shorten", async (req, res) => {
  const origUrl = req.body.url;
  let shortCode = "";
  let isUnique = true;

  try {
    if(!validator.isURL(origUrl)) {
      return res.status(400).json({ message: "The input is not an URL. Try another" })
    }

    let urlCount = await prisma.url.count({
      where: { visitorId: req.visitorId }
    });

    if(urlCount >= 5) {
      return res.status(409).json({
        message: "Maximum number of URLs reached",
        limit: 5,
        urlCount
      });
    }

    while(isUnique) {
      shortCode = nanoid(8);
      isUnique = await prisma.url.findUnique({
        where: { shortCode }
      });
    }

    await prisma.url.create({
      data: { origUrl, shortCode, visitorId: req.visitorId }
    });
    urlCount += 1;
    
    res.status(201).json({ message: "Link was successfully shortened", shortCode, urlCount });
  } catch(error) {
    console.log("Error: ", error);
    res.status(500).json({ message: "An error occurred, process was terminated" });
  }
});

// deletes the url in the database
app.delete("/:shortCode", async (req, res) => {
  const shortCode = req.params.shortCode;

  try {
    const result = await prisma.url.deleteMany({
      where: { shortCode, visitorId: req.visitorId }
    });

    if(result.count === 0) {
      return res.status(404).json({ message: "Link does not exist" });
    }
    
    return res.status(204).json({ message: "Shortened link was successfully disabled" });

  } catch(error) {
    console.log("Error: ", error);
    res.status(500).json({ message: "An error occurred, process was terminated" });
  }
});

if(process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
