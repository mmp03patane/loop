const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

let series = [];
let videos = [];
let likes = [];
let comments = [];

const CURRENT_USER = { id: 'user1', name: 'Creator' };

// Predefined tag library — users pick from this, they can't invent new tags.
// This is the "index" the whole search/discovery feature is built on.
const TAG_LIBRARY = [
  'cooking', 'baking', 'recipes', 'fitness', 'exercise', 'workout', 'yoga',
  'running', 'weightlifting', 'nutrition', 'health', 'mental health',
  'comedy', 'dance', 'music', 'singing', 'guitar', 'piano', 'travel',
  'fashion', 'beauty', 'makeup', 'skincare', 'gaming', 'tech', 'coding',
  'sports', 'football', 'basketball', 'soccer', 'diy', 'crafts', 'art',
  'drawing', 'painting', 'photography', 'education', 'tutorial',
  'finance', 'investing', 'motivation', 'self improvement', 'pets',
  'dogs', 'cats', 'food', 'parenting', 'business', 'entrepreneurship',
  'marketing', 'nature', 'outdoors', 'hiking', 'cars', 'movies', 'books',
  'news', 'lifestyle', 'home', 'interior design', 'gardening', 'science',
  'history', 'comedy skit', 'storytelling', 'review', 'unboxing',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = uuidv4() + path.extname(file.originalname);
    cb(null, unique);
  }
});
const upload = multer({ storage });

// --- Tag autocomplete ---
app.get('/tags', (req, res) => {
  const query = (req.query.query || '').toLowerCase().trim();
  if (!query) {
    return res.json(TAG_LIBRARY.slice(0, 15));
  }
  const matches = TAG_LIBRARY.filter(t => t.toLowerCase().includes(query));
  res.json(matches.slice(0, 15));
});

// Get all series
app.get('/series', (req, res) => {
  res.json(series);
});

// Create series
app.post('/series', (req, res) => {
  const { title, description } = req.body;
  const newSeries = {
    id: uuidv4(),
    title,
    description: description || '',
    createdAt: new Date().toISOString(),
    videoIds: []
  };
  series.push(newSeries);
  res.json(newSeries);
});

// Upload video — now requires tags (array of up to 3 strings from TAG_LIBRARY)
app.post('/videos', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video uploaded' });
  }

  const { seriesId, caption, tags } = req.body;

  let parsedTags = [];
  try {
    parsedTags = JSON.parse(tags || '[]');
  } catch (e) {
    parsedTags = [];
  }
  // Validate tags against the library, cap at 3
  parsedTags = parsedTags
    .filter(t => TAG_LIBRARY.includes(t))
    .slice(0, 3);

  if (parsedTags.length < 1) {
    return res.status(400).json({ error: 'At least one tag is required' });
  }

  const video = {
    id: uuidv4(),
    url: `http://192.168.1.102:3000/uploads/${req.file.filename}`,
    caption: caption || '',
    seriesId: seriesId || null,
    tags: parsedTags,
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
    userId: CURRENT_USER.id,
    userName: CURRENT_USER.name
  };

  videos.unshift(video);

  if (seriesId) {
    const s = series.find(s => s.id === seriesId);
    if (s) s.videoIds.push(video.id);
  }

  res.json(video);
});

// Get a single video (needed for the edit-tags screen)
app.get('/videos/:id', (req, res) => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json(video);
});

// Edit a video's caption and/or tags together
app.patch('/videos/:id', (req, res) => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  if (req.body.caption !== undefined) {
    video.caption = req.body.caption;
  }

  if (req.body.tags !== undefined) {
    let newTags = req.body.tags || [];
    newTags = newTags.filter(t => TAG_LIBRARY.includes(t)).slice(0, 3);
    if (newTags.length < 1) {
      return res.status(400).json({ error: 'At least one tag is required' });
    }
    video.tags = newTags;
  }

  res.json(video);
});

// Which series (if any) currently contain this video — used by the edit screen
app.get('/videos/:id/series', (req, res) => {
  const containing = series.filter(s => s.videoIds.includes(req.params.id));
  res.json(containing);
});

// Add one or more existing videos to a series (videos can belong to multiple series)
app.patch('/series/:id/add-videos', (req, res) => {
  const s = series.find(s => s.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Series not found' });

  const videoIds = req.body.videoIds || [];
  videoIds.forEach(vid => {
    if (!s.videoIds.includes(vid)) {
      s.videoIds.push(vid);
    }
  });

  res.json(s);
});

// Remove a video from a specific series
app.patch('/series/:id/remove-video', (req, res) => {
  const s = series.find(s => s.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Series not found' });
  const { videoId } = req.body;
  s.videoIds = s.videoIds.filter(id => id !== videoId);
  res.json(s);
});

// Edit tags on an existing video (kept for safety / backward compatibility)
app.patch('/videos/:id/tags', (req, res) => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  let newTags = req.body.tags || [];
  newTags = newTags.filter(t => TAG_LIBRARY.includes(t)).slice(0, 3);

  if (newTags.length < 1) {
    return res.status(400).json({ error: 'At least one tag is required' });
  }

  video.tags = newTags;
  res.json(video);
});

// Feed
app.get('/feed', (req, res) => {
  const feed = videos.map(v => ({
    ...v,
    likedByMe: likes.some(l => l.videoId === v.id && l.userId === CURRENT_USER.id)
  }));
  res.json(feed);
});

// Videos in a series
app.get('/series/:id/videos', (req, res) => {
  const s = series.find(s => s.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Series not found' });
  const seriesVideos = videos.filter(v => s.videoIds.includes(v.id));
  res.json(seriesVideos);
});

// Like / Unlike
app.post('/videos/:id/like', (req, res) => {
  const videoId = req.params.id;
  const existing = likes.find(l => l.videoId === videoId && l.userId === CURRENT_USER.id);

  if (existing) {
    likes = likes.filter(l => !(l.videoId === videoId && l.userId === CURRENT_USER.id));
    const video = videos.find(v => v.id === videoId);
    if (video) video.likesCount = Math.max(0, video.likesCount - 1);
    return res.json({ liked: false, likesCount: video?.likesCount || 0 });
  } else {
    likes.push({ videoId, userId: CURRENT_USER.id });
    const video = videos.find(v => v.id === videoId);
    if (video) video.likesCount += 1;
    return res.json({ liked: true, likesCount: video?.likesCount || 0 });
  }
});

// Get comments
app.get('/videos/:id/comments', (req, res) => {
  const videoComments = comments
    .filter(c => c.videoId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(videoComments);
});

// Add comment
app.post('/videos/:id/comments', (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment required' });

  const comment = {
    id: uuidv4(),
    videoId: req.params.id,
    text: text.trim(),
    userId: CURRENT_USER.id,
    userName: CURRENT_USER.name,
    createdAt: new Date().toISOString()
  };
  comments.push(comment);

  const video = videos.find(v => v.id === req.params.id);
  if (video) video.commentsCount += 1;

  res.json(comment);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://192.168.1.102:3000`);
});