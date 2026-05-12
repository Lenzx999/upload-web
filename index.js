const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Mengambil data dari Environment Variables Vercel
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER; // Username GitHub kamu
const GITHUB_REPO = process.env.GITHUB_REPO;   // Nama repository kamu

// API untuk Upload ke GitHub
app.post('/api/create', async (req, res) => {
    const { title, author, content, image } = req.body;

    if (!content && !image) {
        return res.status(400).json({ error: 'Data kosong! Isi teks atau foto.' });
    }

    const postId = uuidv4().substring(0, 8);
    const newPost = {
        id: postId,
        title: title || 'Lenz Upload',
        author: author || 'Anonymous',
        content: content || '',
        image: image || null,
        createdAt: new Date().toISOString()
    };

    // GitHub API wajib menerima konten dalam format Base64
    const fileContent = Buffer.from(JSON.stringify(newPost)).toString('base64');
    const path = `posts/${postId}.json`; // Data akan disimpan di folder "posts"

    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Lenz-Uploader-App'
            },
            body: JSON.stringify({
                message: `Upload post: ${postId} via Web/Bot`,
                content: fileContent
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message);
        }

        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const postUrl = `${protocol}://${host}/p/${postId}`;

        res.json({ success: true, url: postUrl, data: newPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal upload ke GitHub: ' + error.message });
    }
});

// API untuk Membaca Data dari GitHub
app.get('/api/post/:id', async (req, res) => {
    const path = `posts/${req.params.id}.json`;
    
    try {
        // Fetch ke API GitHub agar bisa membaca repo Private maupun Public
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Lenz-Uploader-App'
            }
        });

        if (!response.ok) {
            return res.status(404).json({ error: 'Artikel/Foto tidak ditemukan di Repo GitHub' });
        }

        const data = await response.json();
        
        // GitHub mengembalikan isi file dalam format Base64, jadi kita terjemahkan dulu
        const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');
        res.json(JSON.parse(decodedContent));
        
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data dari GitHub' });
    }
});

module.exports = app;
