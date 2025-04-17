const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const fetch = require('node-fetch');

// Environment variables
const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Middleware
app.use(bodyParser.json({ limit: '1024mb' }));
app.use(bodyParser.urlencoded({ limit: '1024mb', extended: true }));

// Simple health check endpoint
app.get('/', (req, res) => {
  res.send('Ghost to Discord webhook service is running');
});

// Handle POST requests to /postToDiscord
app.post('/postToDiscord', async (req, res) => {
  try {
    console.log('Received webhook from Ghost');
    
    // Extract data from Ghost webhook
    const ghostData = req.body;
    
    // Check if this is a valid post webhook
    if (!ghostData || !ghostData.post || !ghostData.post.current) {
      console.error('Invalid webhook data received');
      return res.status(400).json({ error: 'Invalid webhook data' });
    }
    
    const post = ghostData.post.current;
    const previousStatus = ghostData.post.previous.status;
    const previousPublishedAt = ghostData.post.previous.published_at;
    
    // Only process newly published posts
    if (post.status === "published" && 
        (previousStatus === "draft" || previousPublishedAt === null)) {
      
      // Extract post data
      const postData = {
        title: post.title,
        slug: post.slug,
        excerpt: post.custom_excerpt || post.excerpt || 
                (post.plaintext ? post.plaintext.split('<!--members-only-->')[0].trim() : ""),
        url: post.url,
        publishedAt: new Date(post.published_at).toLocaleString(),
        authorName: post.primary_author ? post.primary_author.name : "Unknown Author",
        tags: post.tags && post.tags.length > 0 ? post.tags.map(tag => tag.name).join(", ") : "No tags",
        featureImage: post.feature_image,
        readingTime: post.reading_time ? `${post.reading_time} min read` : "Quick read",
        visibility: post.visibility
      };

      /**
       * THIS IS THE PART YOU WOULD EDIT TO CHANGE THE EMBED
       */

      //Color Converter (pick decimal for Discord) https://convertingcolors.com/hex-color-0F97FF.html?search=Hex(0F97FF)

      const colorOptions = [
        8989183, //purple
        16384201, //magenta
        16751636, //orange
        1021951, //blue
      ];

      const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)]
      
      // Format data for Discord
      const discordPayload = {
        embeds: [{
          title: postData.title,
          url: postData.url,
          description: postData.excerpt,
          color: randomColor,
          image: postData.featureImage ? { url: postData.featureImage } : null,
          fields: [
            // {
            //   name: "Author",
            //   value: postData.authorName,
            //   inline: true
            // },
            {
              name: "Reading Time",
              value: postData.readingTime,
              inline: true
            }
          ],
          footer: {
            text: `Tags: ${postData.tags}`
          }
        }]
      };

      /**
       * NO MORE EDIT (PROBABLY)
       */
      
      // Send to Discord webhook
      const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(discordPayload)
      });
      
      if (!discordResponse.ok) {
        const errorText = await discordResponse.text();
        console.error('Discord webhook error:', errorText);
        return res.status(500).json({ error: 'Failed to send to Discord', details: errorText });
      }
      
      console.log('Successfully sent to Discord');
      return res.status(200).json({ success: true });
    } else {
      console.log('Skipping - not a newly published post');
      return res.status(200).json({ success: true, message: 'Not a newly published post' });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ghost-Discord webhook service listening on port ${PORT}`);
});
