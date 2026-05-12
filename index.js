const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// MONGODB_URI otomatis dibuat oleh Vercel saat kamu menghubungkan MongoDB Atlas
const uri = process.env.MONGODB_URI; 

// Konfigurasi koneksi MongoDB untuk Serverless Vercel
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    // Gunakan koneksi yang sudah ada jika tersedia (agar tidak lemot)
    if (cachedClient && cachedDb) {
        return cachedDb;
    }

    if (!uri) {
        throw new Error("MONGODB_URI tidak ditemukan di Environment Variables Vercel!");
    }

    const client = new MongoClient(uri);
    await client.connect();
    
    // Nama database bebas, kita pakai "lenz_db"
    const db = client.db('lenz_db'); 

    cachedClient = client;
    cachedDb = db;
    return db;
}

// API untuk membuat artikel / upload foto
app.post('/api/create', async (req, res) => {
    const { title, author, content, image } = req.body;

    if (!content && !image) {
        return res.status(400).json({ error: 'Harus ada teks atau foto yang diupload!' });
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

    try {
        const db = await connectToDatabase();
        const collection = db.collection('posts'); // Nama tabel/koleksinya "posts"
        
        await collection.insertOne(newPost);

        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const postUrl = `${protocol}://${host}/p/${postId}`;

        res.json({ success: true, url: postUrl, data: newPost });
    } catch (error) {
        console.error("Error Database:", error);
        res.status(500).json({ error: 'Gagal menyimpan ke database MongoDB' });
    }
});

// API untuk mengambil data
app.get('/api/post/:id', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('posts');
        
        // Cari data berdasarkan ID yang dikirim
        const post = await collection.findOne({ id: req.params.id });

        if (post) {
            delete post._id; // Hapus ID bawaan MongoDB agar hasilnya rapi
            res.json(post);
        } else {
            res.status(404).json({ error: 'Artikel/Foto tidak ditemukan' });
        }
    } catch (error) {
        console.error("Error Database:", error);
        res.status(500).json({ error: 'Gagal mengambil data dari MongoDB' });
    }
});

module.exports = app;
