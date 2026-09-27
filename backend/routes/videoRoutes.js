const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { spawn } = require('child_process');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const VIDEOS_DIR = path.join(__dirname, '..', 'videos');
const BUNDLED_VIDEO_PATH = path.join(VIDEOS_DIR, 'vid_sim.mp4');

// Ensure directories exist
[UPLOADS_DIR, CACHE_DIR, VIDEOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video file format. Supported formats: .mp4, .webm, .mov, .avi, .mkv'));
    }
  }
});

// In-memory active job tracker: jobId -> { process, status, progress, result, error, logs }
const activeJobs = new Map();

/**
 * GET /api/video/bundled
 * Returns info on the pre-bundled simulation video
 */
router.get('/bundled', (req, res) => {
  const videoPath = fs.existsSync(BUNDLED_VIDEO_PATH)
    ? BUNDLED_VIDEO_PATH
    : (fs.existsSync(path.join(VIDEOS_DIR, 'vid sim.mp4')) ? path.join(VIDEOS_DIR, 'vid sim.mp4') : BUNDLED_VIDEO_PATH);

  const hasPhysicalVideo = fs.existsSync(videoPath);
  const bundledAnalysisPath = path.join(__dirname, '..', 'data', 'bundled_video_analysis.json');
  const hasPrecomputedAnalysis = fs.existsSync(bundledAnalysisPath);
  const stats = hasPhysicalVideo ? fs.statSync(videoPath) : null;

  res.json({
    videoId: 'vid_sim',
    title: 'Traffic Simulation Video (Default)',
    filename: hasPhysicalVideo ? path.basename(videoPath) : 'vid_sim.mp4',
    sizeBytes: stats ? stats.size : 185685832,
    isBundled: true,
    hasPhysicalVideo,
    hasPrecomputedAnalysis,
    defaultConfig: {
      region: [
        [0.01, 0.35],
        [0.85, 0.35],
        [0.98, 0.95],
        [0.01, 0.95]
      ],
      line: {
        start: [0.02, 0.65],
        end: [0.85, 0.65],
        incomingDirection: 'positive'
      },
      mappedDirection: 'S',
      approachZones: {
        N: [[0.36, 0.12], [0.62, 0.12], [0.65, 0.38], [0.35, 0.38]],
        E: [[0.68, 0.38], [0.99, 0.40], [0.99, 0.75], [0.65, 0.70]],
        S: [[0.35, 0.60], [0.70, 0.60], [0.75, 0.98], [0.30, 0.98]],
        W: [[0.01, 0.18], [0.35, 0.22], [0.35, 0.65], [0.01, 0.60]]
      }
    }
  });
});

/**
 * POST /api/video/upload
 * Accepts local video uploads
 */
router.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }
  res.json({
    videoId: path.basename(req.file.filename, path.extname(req.file.filename)),
    filename: req.file.filename,
    originalName: req.file.originalname,
    sizeBytes: req.file.size,
    isBundled: false
  });
});

/**
 * GET /api/video/stream/:videoId
 * Video streaming route supporting Range headers (seeking)
 */
router.get('/stream/:videoId', (req, res) => {
  const rawId = decodeURIComponent(req.params.videoId);
  let videoPath;

  if (rawId === 'vid_sim' || rawId === 'vid sim' || rawId === 'vid_sim.mp4' || rawId === 'vid sim.mp4' || rawId === 'bellevue_trial' || rawId === 'bellevue_trial.mp4') {
    videoPath = fs.existsSync(BUNDLED_VIDEO_PATH)
      ? BUNDLED_VIDEO_PATH
      : (fs.existsSync(path.join(VIDEOS_DIR, 'vid sim.mp4')) ? path.join(VIDEOS_DIR, 'vid sim.mp4') : BUNDLED_VIDEO_PATH);
  } else {
    // Sanitize filename to prevent path traversal
    const safeFilename = path.basename(rawId);
    const inVideos = path.join(VIDEOS_DIR, safeFilename.includes('.') ? safeFilename : `${safeFilename}.mp4`);
    if (fs.existsSync(inVideos)) {
      videoPath = inVideos;
    } else {
      videoPath = path.join(UPLOADS_DIR, safeFilename.includes('.') ? safeFilename : `${safeFilename}.mp4`);
      if (!fs.existsSync(videoPath)) {
        // Check if file exists with another extension in uploads
        const files = fs.readdirSync(UPLOADS_DIR);
        const match = files.find(f => f.startsWith(safeFilename));
        if (match) {
          videoPath = path.join(UPLOADS_DIR, match);
        }
      }
    }
  }

  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video file not found' });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

/**
 * POST /api/video/analyze
 * Starts asynchronous Python video analysis worker
 */
router.post('/analyze', (req, res) => {
  const { videoId, region, line, mappedDirection, sampleFps = 5 } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  const isBundledVideo = (videoId === 'vid_sim' || videoId === 'vid sim' || videoId === 'vid_sim.mp4' || videoId === 'vid sim.mp4' || videoId === 'bellevue_trial' || videoId === 'bellevue_trial.mp4');
  const bundledAnalysisPath = path.join(__dirname, '..', 'data', 'bundled_video_analysis.json');

  let videoPath;
  if (isBundledVideo) {
    videoPath = fs.existsSync(BUNDLED_VIDEO_PATH)
      ? BUNDLED_VIDEO_PATH
      : (fs.existsSync(path.join(VIDEOS_DIR, 'vid sim.mp4')) ? path.join(VIDEOS_DIR, 'vid sim.mp4') : BUNDLED_VIDEO_PATH);
  } else {
    const safeFilename = path.basename(videoId);
    const inVideos = path.join(VIDEOS_DIR, safeFilename.includes('.') ? safeFilename : `${safeFilename}.mp4`);
    if (fs.existsSync(inVideos)) {
      videoPath = inVideos;
    } else {
      videoPath = path.join(UPLOADS_DIR, safeFilename.includes('.') ? safeFilename : `${safeFilename}.mp4`);
      if (!fs.existsSync(videoPath)) {
        const files = fs.readdirSync(UPLOADS_DIR);
        const match = files.find(f => f.startsWith(safeFilename));
        if (match) videoPath = path.join(UPLOADS_DIR, match);
      }
    }
  }

  // Compute robust config hash for caching (v2 format hash)
  const configObj = { videoId, region, line, mappedDirection, sampleFps, tracker: 'bytetrack_v2' };
  const configHash = crypto.createHash('md5').update(JSON.stringify(configObj)).digest('hex');
  const cachePath = path.join(CACHE_DIR, `${configHash}.json`);

  // 1. Check dynamic cache file first
  if (fs.existsSync(cachePath)) {
    try {
      const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (cachedData && cachedData.status === 'COMPLETED' && !cachedData.error) {
        const jobId = `cached-${configHash}`;
        activeJobs.set(jobId, {
          jobId,
          status: 'COMPLETED',
          progress: 100,
          result: cachedData,
          error: null,
          logs: ['Returned cached result']
        });
        return res.json({ jobId, status: 'COMPLETED', progress: 100, cached: true });
      }
    } catch (err) {
      // Invalid cache file, continue
    }
  }

  // 2. If bundled video, check pre-computed analysis asset (zero-python fallback)
  if (isBundledVideo && fs.existsSync(bundledAnalysisPath)) {
    try {
      const cachedData = JSON.parse(fs.readFileSync(bundledAnalysisPath, 'utf8'));
      if (cachedData && cachedData.status === 'COMPLETED' && !cachedData.error) {
        try {
          if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
          if (!fs.existsSync(cachePath)) fs.copyFileSync(bundledAnalysisPath, cachePath);
        } catch (e) { }

        const jobId = `cached-bundled-sim`;
        activeJobs.set(jobId, {
          jobId,
          status: 'COMPLETED',
          progress: 100,
          result: cachedData,
          error: null,
          logs: ['Loaded pre-computed YOLOv8 + ByteTrack bundled analysis']
        });
        return res.json({ jobId, status: 'COMPLETED', progress: 100, cached: true });
      }
    } catch (err) {
      console.warn('Error reading bundled analysis:', err);
    }
  }

  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video file not found on disk', videoMissing: true });
  }

  const jobId = `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const pyScript = path.join(__dirname, '..', 'vision', 'analyzer.py');

  const configJson = JSON.stringify({
    region: region || [],
    line: line || {},
    mappedDirection: mappedDirection || 'S'
  });

  const pyCmd = process.platform === 'win32' ? 'py' : 'python';
  const pyArgs = process.platform === 'win32'
    ? ['-3', pyScript, '--video', videoPath, '--config', configJson, '--sample_fps', String(sampleFps), '--output', cachePath]
    : [pyScript, '--video', videoPath, '--config', configJson, '--sample_fps', String(sampleFps), '--output', cachePath];

  const pyProcess = spawn(pyCmd, pyArgs);

  const jobRecord = {
    jobId,
    process: pyProcess,
    status: 'RUNNING',
    progress: 0,
    result: null,
    error: null,
    logs: []
  };

  activeJobs.set(jobId, jobRecord);

  let stdoutBuffer = '';

  pyProcess.stdout.on('data', (data) => {
    stdoutBuffer += data.toString();
    const lines = stdoutBuffer.split('\n');
    // Keep last incomplete line in buffer
    stdoutBuffer = lines.pop();

    lines.forEach(line => {
      if (!line.trim()) return;
      try {
        const parsed = JSON.parse(line.trim());
        if (parsed.type === 'progress') {
          if (jobRecord.status === 'RUNNING') {
            jobRecord.progress = parsed.progress;
          }
        } else if (parsed.type === 'result') {
          if (jobRecord.status === 'RUNNING') {
            const dataObj = parsed.data;
            if (dataObj.error) {
              jobRecord.status = 'FAILED';
              jobRecord.error = `${dataObj.error}: ${dataObj.message}`;
            } else {
              jobRecord.result = dataObj;
              jobRecord.status = dataObj.status || 'COMPLETED';
              jobRecord.progress = 100;
            }
          }
        }
      } catch (e) {
        jobRecord.logs.push(line);
      }
    });
  });

  pyProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    jobRecord.logs.push(msg);
  });

  pyProcess.on('close', (code) => {
    // Process remaining stdout buffer line if any
    if (stdoutBuffer.trim()) {
      try {
        const parsed = JSON.parse(stdoutBuffer.trim());
        if (parsed.type === 'result' && jobRecord.status === 'RUNNING') {
          const dataObj = parsed.data;
          if (dataObj.error) {
            jobRecord.status = 'FAILED';
            jobRecord.error = `${dataObj.error}: ${dataObj.message}`;
          } else {
            jobRecord.result = dataObj;
            jobRecord.status = dataObj.status || 'COMPLETED';
            jobRecord.progress = 100;
          }
        }
      } catch (e) {
        jobRecord.logs.push(stdoutBuffer.trim());
      }
      stdoutBuffer = '';
    }

    if (jobRecord.status === 'RUNNING') {
      if (code === 0 && jobRecord.result && !jobRecord.result.error) {
        jobRecord.status = 'COMPLETED';
        jobRecord.progress = 100;
      } else {
        jobRecord.status = 'FAILED';
        jobRecord.error = jobRecord.error || jobRecord.logs.join('\n') || `Python process exited with code ${code}`;
      }
    }
  });

  res.json({ jobId, status: 'RUNNING', progress: 0, cached: false });
});


/**
 * GET /api/video/status/:jobId
 * Poll analysis job progress and status
 */
router.get('/status/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  let job = activeJobs.get(jobId);

  if (!job && (jobId === 'cached-bundled-sim' || jobId.startsWith('cached-'))) {
    job = {
      jobId,
      status: 'COMPLETED',
      progress: 100,
      error: null,
      logs: ['Pre-computed cached analysis ready']
    };
  }

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    error: job.error,
    logs: (job.logs || []).slice(-5)
  });
});

/**
 * POST /api/video/cancel/:jobId
 * Cancel running analysis job
 */
router.post('/cancel/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = activeJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.process && job.status === 'RUNNING') {
    job.process.kill();
    job.status = 'CANCELLED';
    job.error = 'Analysis cancelled by user';
  }

  res.json({ status: job.status });
});

/**
 * GET /api/video/results/:jobId
 * Retrieve timestamped results and arrival events
 */
router.get('/results/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  let job = activeJobs.get(jobId);

  if (!job) {
    const bundledAnalysisPath = path.join(__dirname, '..', 'data', 'bundled_video_analysis.json');
    if (jobId.startsWith('cached-')) {
      const hash = jobId.replace('cached-', '');
      const possibleCache = path.join(CACHE_DIR, `${hash}.json`);
      if (fs.existsSync(possibleCache)) {
        try {
          const result = JSON.parse(fs.readFileSync(possibleCache, 'utf8'));
          job = { status: 'COMPLETED', result };
          activeJobs.set(jobId, job);
        } catch (e) { }
      }
    }
    if (!job && fs.existsSync(bundledAnalysisPath)) {
      try {
        const result = JSON.parse(fs.readFileSync(bundledAnalysisPath, 'utf8'));
        job = { status: 'COMPLETED', result };
        activeJobs.set(jobId, job);
      } catch (e) { }
    }
  }

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== 'COMPLETED' || !job.result) {
    return res.status(400).json({ error: 'Job analysis results not ready', status: job.status });
  }

  res.json(job.result);
});

module.exports = router;
