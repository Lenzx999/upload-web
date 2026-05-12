const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { kv } = require('@vercel/kv');

const app = express();

app.use(cors());
app.use(express.json());

// API untuk membuat artikel (Dipakai Web & Bot WA)
app.post('/api/create', async (req, res) => {
    const { title, author, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: 'Judul dan konten wajib diisi!' });
    }

    const postId = uuidv4().substring(0, 8);
    const newPost = {
        id: postId,
        title,
        author: author || 'Anonymous',
        content,
        createdAt: new Date().toISOString()
    };

    try {
        await kv.set(`post:${postId}`, newPost);
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const postUrl = `${protocol}://${host}/p/${postId}`;

        res.json({ success: true, url: postUrl, data: newPost });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menyimpan ke database' });
    }
});

// API untuk mengambil data artikel
app.get('/api/post/:id', async (req, res) => {
    try {
        const post = await kv.get(`post:${req.params.id}`);
        if (post) {
            res.json(post);
        } else {
            res.status(404).json({ error: 'Artikel tidak ditemukan' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data' });
    }
});

module.exports = app;
