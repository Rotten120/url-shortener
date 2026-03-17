import express from "express"
import { prisma } from "../lib/prismaClient.js"

const router = express.Router();

/*
 * GET /:shortCode
 * Description: Redirects user to the original url; updates 'click' analytics data
 * Middleware: None 
 *
 * Path Params:
 *   shortCode (string) - code corresponding to url
 *
 * Success Response:
 *   302 redirected to found origUrl
 *
 * Error:
 *   500 server error
 *
 */
router.get("/:shortCode", async (req, res) => {
  const shortCode = req.params.shortCode;
  
  try {
    const url = await prisma.url.findUnique({
      where: { shortCode },
      select: { id: true }
    });

    if(!url) {
      return res.status(404).json({ message: "Invalid code" })
    }

    await prisma.click.create({
      data: { urlId: url.id }
    });

    console.log(`User ${req.visitorId} was redirected to ${url.origUrl}`);
    res.status(302).redirect(url.origUrl);

  } catch(error) {
    console.log(error);
    res.status(500).json({ message: "An error occurred, please try again later" });
  }
});

export default router;
