import express from 'express';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.startsWith('https://iconscout.com/')) {
        return res.status(400).json({ error: 'Invalid URL. Must be an IconScout URL.' });
    }
    
    try {
        // Fetch the HTML content from the URL
        const response = await fetch(url);
        const html = await response.text();
        
        // Load the HTML with Cheerio
        const $ = cheerio.load(html);
        
        // Extract image URLs using Cheerio selectors
        const imageUrls = [];
        $('div.container_pcuRO picture.thumb_PdMgf img').each((i, element) => {
            const src = $(element).attr('src');
            if (src) {
                imageUrls.push(src);
            }
        });
        
        res.json({ images: imageUrls });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: 'Failed to scrape images' });
    }
});

app.post('/download', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        
        const response = await fetch(imageUrl);
        const buffer = await response.buffer();
        
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', 'attachment');
        res.send(buffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download image' });
    }
});

// Add a simple HTML page for testing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});