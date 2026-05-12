const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { kv } = require('@vercel/kv');

const app = express();

app.use(cors());
// Perbesar limit JSON menjadi 5MB agar kuat menerima file foto
app.use(express.json({ limit: '5mb' }));

app.post('/api/create', async (req, res) => {
    const { title, author, content, image } = req.body;

    // Validasi: Minimal harus ada teks konten ATAU gambar
    if (!content && !image) {
        return res.status(400).json({ error: 'Harus ada teks atau foto yang diupload!' });
    }

    const postId = uuidv4().substring(0, 8);
    const newPost = {
        id: postId,
        title: title || 'Lenz Upload', // Judul default jika dikosongkan
        author: author || 'Anonymous',
        content: content || '',
        image: image || null, // Menyimpan gambar dalam format Base64
        createdAt: new Date().toISOString()
    };

    try {
        await kv.set(`post:${postId}`, newPost);
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const postUrl = `${protocol}://${host}/p/${postId}`;

        res.json({ success: true, url: postUrl, data: newPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal menyimpan. Pastikan ukuran foto tidak terlalu besar.' });
    }
});

app.get('/api/post/:id', async (req, res) => {
    try {
        const post = await kv.get(`post:${req.params.id}`);
        if (post) {
            res.json(post);
        } else {
            res.status(404).json({ error: 'Artikel/Foto tidak ditemukan' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data' });
    }
});

module.exports = app;
