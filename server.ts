import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Voice assistant endpoint: parses natural voice instructions in Telugu, Hindi, or English
app.post('/api/voice-assistant/parse-task', async (req, res) => {
  try {
    const { voiceText, audioBase64, mimeType, currentDate, currentTime, userLanguage } = req.body;

    if ((!voiceText || typeof voiceText !== 'string' || !voiceText.trim()) && !audioBase64) {
      return res.status(400).json({ error: 'voiceText or audioBase64 is required' });
    }

    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server',
        fallbackNeeded: true,
      });
    }

    const systemInstruction = `You are TaskLock Voice Assistant, a high-precision productivity parser.
Users speak voice commands while busy to schedule and lock tasks.
You MUST support three languages seamlessly:
1. Telugu (తెలుగు) - in Telugu script or Romanized Telenglish
2. Hindi (हिन्दी) - in Devanagari script or Romanized Hinglish
3. English - standard colloquial phrases

Current reference date: ${currentDate || new Date().toISOString().split('T')[0]}
Current reference time: ${currentTime || '12:00'}

Instructions:
- Extract task title, description, due date (YYYY-MM-DD), due time (HH:MM in 24-hr format), priority (low/medium/high/critical), category (Work/Study/Health/Personal/Finance/Urgent), and estimated duration (minutes).
- If voice audio is provided, accurately transcribe the spoken words into transcription and title.
- Resolve relative dates accurately:
  * "today", "ఈరోజు", "aaj" -> ${currentDate}
  * "tomorrow", "రేపు" (repu), "कल" (kal) -> next day
  * "day after tomorrow", "ఎల్లుండి" (ellundi), "परसों" (parson) -> 2 days ahead
  * Specific days of week (e.g. "Monday", "సోమవారం", "somvaar") -> next upcoming occurrence
- Resolve relative or colloquial times:
  * "morning" / "ఉదయం" / "subah" -> 09:00 (or specified hour)
  * "afternoon" / "మధ్యాహ్నం" / "dopahar" -> 14:00 (or specified hour)
  * "evening" / "సాయంత్రం" / "shaam" -> 18:00 (or specified hour)
  * "night" / "రాత్రి" / "raat" -> 21:00 (or specified hour)
  * If no time is mentioned, default to 1 hour from current reference time or 18:00.
- Determine priority:
  * If urgent, critical, mukhyam, zaroori -> "critical" or "high"
  * Default is "medium"
- Generate a concise, polite confirmationMessage in the language the user spoke (Telugu, Hindi, or English) confirming the task lock.`;

    // Try Gemini model with fallback list
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let responseText: string | null = null;

    let contentsPayload: any;
    if (audioBase64) {
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioBase64,
            },
          },
          {
            text: `This is a voice command spoken by a user in ${userLanguage || 'Telugu, Hindi, or English'}. Transcribe what they said and structure it into a TaskLock schedule.`,
          },
        ],
      };
    } else {
      contentsPayload = `Voice input: "${voiceText}" (User preferred language mode: ${userLanguage || 'auto'})`;
    }

    for (const model of candidateModels) {
      try {
        const geminiPromise = ai.models.generateContent({
          model,
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: 0.1,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.MINIMAL,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'Clear, concise task title in English or appropriate bilingual phrasing',
                },
                description: {
                  type: Type.STRING,
                  description: 'Optional description or note mentioned in command',
                },
                dueDate: {
                  type: Type.STRING,
                  description: 'Due date in YYYY-MM-DD format',
                },
                dueTime: {
                  type: Type.STRING,
                  description: 'Exact due time in 24-hour HH:MM format',
                },
                priority: {
                  type: Type.STRING,
                  description: 'Priority level: low, medium, high, or critical',
                },
                category: {
                  type: Type.STRING,
                  description: 'Category: Work, Study, Health, Personal, Finance, or Urgent',
                },
                estimatedDuration: {
                  type: Type.INTEGER,
                  description: 'Estimated duration in minutes (e.g. 30, 45, 60)',
                },
                reminderPreference: {
                  type: Type.STRING,
                  description: 'Reminder preference: both, exact, or five_min',
                },
                detectedLanguage: {
                  type: Type.STRING,
                  description: 'Language detected from the speech (Telugu, Hindi, or English)',
                },
                confirmationMessage: {
                  type: Type.STRING,
                  description: "Spoken confirmation in the user's language confirming the tasklock",
                },
                transcription: {
                  type: Type.STRING,
                  description: 'Verbatim transcription of the voice command',
                },
              },
              required: [
                'title',
                'dueDate',
                'dueTime',
                'priority',
                'category',
                'estimatedDuration',
                'confirmationMessage',
                'detectedLanguage',
              ],
            },
          },
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2800));
        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Model ${model} unavailable, trying next:`, err);
      }
    }

    if (responseText) {
      const parsedJson = JSON.parse(responseText);
      return res.json({ success: true, task: parsedJson });
    }

    // Server-side fallback parsing if all models were busy
    const lower = voiceText.toLowerCase();
    const isTomorrow =
      lower.includes('repu') ||
      lower.includes('రేపు') ||
      lower.includes('kal') ||
      lower.includes('कल') ||
      lower.includes('tomorrow');
    const isDayAfter =
      lower.includes('ellundi') ||
      lower.includes('ఎల్లుండి') ||
      lower.includes('parson') ||
      lower.includes('परसों') ||
      lower.includes('day after tomorrow');

    const baseDate = new Date();
    if (isTomorrow) baseDate.setDate(baseDate.getDate() + 1);
    if (isDayAfter) baseDate.setDate(baseDate.getDate() + 2);
    const dueDate = baseDate.toISOString().split('T')[0];

    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|గంటలకు|బజే|बजे|baje|hours)?/i);
    let dueTime = currentTime || '18:00';
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? timeMatch[2] : '00';
      if ((lower.includes('pm') || lower.includes('evening') || lower.includes('సాయంత్రం') || lower.includes('shaam') || lower.includes('రాత్')) && h < 12) {
        h += 12;
      }
      dueTime = `${String(h).padStart(2, '0')}:${m}`;
    }

    let detectedLang = 'English';
    let confirmMsg = `Task locked for ${dueTime}`;
    if (/[\u0C00-\u0C7F]/.test(voiceText) || lower.includes('repu') || lower.includes('chey')) {
      detectedLang = 'Telugu';
      confirmMsg = `మీ టాస్క్ ${dueTime} గంటలకు లాక్ చేయబడింది.`;
    } else if (/[\u0900-\u097F]/.test(voiceText) || lower.includes('kal') || lower.includes('karo')) {
      detectedLang = 'Hindi';
      confirmMsg = `आपका टास्क ${dueTime} बजे के लिए सेट और लॉक कर दिया गया है।`;
    }

    const cleanTitle = voiceText
      .replace(/tasklock|task lock|set|lock|schedule|చేయి|చెయ్యి|కరో|సెట్|सेट करो|టాస్క్ లాక్/gi, '')
      .trim() || 'Voice Scheduled Task';

    return res.json({
      success: true,
      task: {
        title: cleanTitle,
        description: `Voice scheduled (${detectedLang})`,
        dueDate,
        dueTime,
        priority: lower.includes('critical') || lower.includes('urgent') || lower.includes('mukhyam') || lower.includes('zaroori') ? 'critical' : 'medium',
        category: lower.includes('study') ? 'Study' : lower.includes('health') || lower.includes('gym') ? 'Health' : 'Work',
        estimatedDuration: 30,
        reminderPreference: 'both',
        detectedLanguage: detectedLang,
        confirmationMessage: confirmMsg,
      },
    });
  } catch (err: unknown) {
    console.error('Error in voice-assistant parse-task:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to parse voice command',
      fallbackNeeded: true,
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount Vite in development or static files in production
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static('dist'));
  app.get('*', (_req, res) => {
    res.sendFile('dist/index.html', { root: '.' });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TaskLock server running on http://0.0.0.0:${PORT}`);
});
