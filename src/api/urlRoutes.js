import express from "express"
import validator from "validator"
import { prisma } from "../lib/prismaClient.js"
import { nanoid } from "nanoid"

const router = express.Router();

// fetches all the urls made by the user
router.get("/urls", async (req, res) => {
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
router.get("/:shortCode", async (req, res) => {
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
router.post("/shorten", async (req, res) => {
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
router.delete("/:shortCode", async (req, res) => {
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

export default router;
