import {
  HAND_DRAWN_STYLE_PRESETS,
  OpenAIArtError,
  buildLocalCreativeSuggestion,
  completeSemanticDrawing,
  editDrawingByCommand,
  enhanceSimpleSketch,
  generateHandDrawnVariants,
  recognizeSketch,
  suggestCreativeNextStep,
  tellSimpleSketchStory,
} from '../services/openaiArt.js';

const sendError = (res, error, fallback = {}) => {
  const status = error instanceof OpenAIArtError ? error.statusCode : 500;
  const message = error.message || 'AI request failed';
  const overloaded = /overload|temporar|busy|try again|timeout/i.test(message);
  const payload = {
    error: message,
    code: overloaded ? 'stepfun_overloaded' : 'ai_request_failed',
    ...fallback,
  };

  if (process.env.DEBUG === 'true' && error.detail) {
    payload.detail = error.detail;
  }

  return res.status(status).json(payload);
};

const logAIError = (label, error) => {
  console.error(label, error.message);
  if (error.detail?.stderr) console.error(`${label} stderr:`, error.detail.stderr);
  if (error.detail?.stdout) console.error(`${label} stdout:`, error.detail.stdout);
};

export const registerOpenAIArtRoutes = (app) => {
  app.get('/api/ai/styles', (req, res) => {
    res.json({ styles: HAND_DRAWN_STYLE_PRESETS });
  });

  app.post('/api/recognize', async (req, res) => {
    const { imageData, strokeContext, displayLanguages } = req.body || {};
    if (!imageData) return res.status(400).json({ error: 'no imageData' });

    try {
      const result = await recognizeSketch(imageData, strokeContext, displayLanguages);
      console.log('✦ Recognized:', result.label);
      return res.json(result);
    } catch (error) {
      console.error('StepFun recognition error:', error.message);
      return sendError(res, error, {
        label: '涂鸦/doodle',
        confidence: 0,
        semanticCategory: 'unknown',
        categoryZh: '未知',
      });
    }
  });

  app.post('/api/generate-styles', async (req, res) => {
    const { imageData, styles, recognition, displayLanguages } = req.body || {};
    if (!imageData) return res.status(400).json({ error: 'no imageData' });

    try {
      const result = await generateHandDrawnVariants(imageData, styles, recognition, displayLanguages);
      console.log(`✦ Generated ${result.options.length} hand-drawn variants for ${result.label}`);
      return res.json(result);
    } catch (error) {
      console.error('StepFun image edit error:', error.message);
      return sendError(res, error);
    }
  });

  app.post('/api/ai-enhance', async (req, res) => {
    const { imageData, mode } = req.body || {};
    if (!imageData) return res.status(400).json({ error: 'no imageData' });

    try {
      const result = await enhanceSimpleSketch(imageData, mode);
      console.log(`Codex AI enhance complete: ${result.mode}`);
      return res.json(result);
    } catch (error) {
      logAIError('Codex AI enhancement error:', error);
      return sendError(res, error);
    }
  });

  app.post('/api/ai-story', async (req, res) => {
    const { imageData, displayLanguages } = req.body || {};
    if (!imageData) return res.status(400).json({ error: 'no imageData' });

    try {
      const result = await tellSimpleSketchStory(imageData, displayLanguages);
      console.log('Codex sketch story complete');
      return res.json(result);
    } catch (error) {
      logAIError('Codex story error:', error);
      return sendError(res, error);
    }
  });

  app.post('/api/semantic-complete', async (req, res) => {
    const { imageData, recognition } = req.body || {};
    if (!imageData) return res.status(400).json({ error: 'no imageData' });

    try {
      const result = await completeSemanticDrawing(imageData, recognition);
      console.log('✦ Semantic completion:', result.label);
      return res.json(result);
    } catch (error) {
      console.error('StepFun semantic completion error:', error.message);
      return sendError(res, error);
    }
  });

  app.post('/api/voice-edit', async (req, res) => {
    const { imageData, command, recognition } = req.body || {};
    if (!imageData) return res.status(400).json({ error: 'no imageData' });
    if (!command) return res.status(400).json({ error: 'no command' });

    try {
      const result = await editDrawingByCommand(imageData, command, recognition);
      console.log('✦ Voice-guided edit:', result.command);
      return res.json(result);
    } catch (error) {
      console.error('StepFun voice edit error:', error.message);
      return sendError(res, error);
    }
  });

  app.post('/api/creative-suggestion', async (req, res) => {
    const { imageData, recognition, displayLanguages } = req.body || {};
    if (!imageData) return res.status(400).json({ error: 'no imageData' });

    try {
      const result = await suggestCreativeNextStep(imageData, recognition, displayLanguages);
      return res.json(result);
    } catch (error) {
      console.error('StepFun suggestion error:', error.message);
      return res.json({
        ...buildLocalCreativeSuggestion(recognition),
        warning: error.message,
      });
    }
  });
};

export default registerOpenAIArtRoutes;
