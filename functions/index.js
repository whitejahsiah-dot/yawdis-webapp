// ── Comment moderation Cloud Function (isolated, comments-only) ──
//
// This is the ONLY server-side code in the project; everything else stays
// a plain static site. It does not touch auth, stores, recipes, story
// content, or any other existing feature/collection.
//
// Trigger: fires automatically the instant a new doc is added to
// comments/ (public comment submission in cart.js always writes
// status:'pending' — see CommunityStore.addComment). This function is the
// only thing that can promote a comment to 'approved' or 'rejected',
// because it runs with the Admin SDK (bypasses Firestore rules) — a
// visitor can never forge their own moderation result from the browser.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Set with: firebase functions:secrets:set OPENAI_API_KEY
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
// Set with: firebase functions:secrets:set ADMIN_NOTIFICATION_EMAIL
const ADMIN_NOTIFICATION_EMAIL = defineSecret('ADMIN_NOTIFICATION_EMAIL');

const REJECT_THRESHOLD = 0.75;
const REVIEW_THRESHOLD = 0.3;

// Human-readable explanation shown to the admin for whichever OpenAI
// moderation category scored highest.
const REASONS = {
  'harassment': 'Contains harassing language.',
  'harassment/threatening': 'Contains threatening harassment.',
  'hate': 'Contains hateful language.',
  'hate/threatening': 'Contains threatening hateful language.',
  'self-harm': 'Contains self-harm related content.',
  'self-harm/intent': 'Expresses intent of self-harm.',
  'self-harm/instructions': 'Contains self-harm instructions.',
  'sexual': 'Contains sexual content.',
  'sexual/minors': 'Contains sexual content involving minors.',
  'violence': 'Contains violent language.',
  'violence/graphic': 'Contains graphic violent content.',
  NONE: 'No concerning language detected.'
};

async function classifyComment(text, apiKey) {
  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ input: text })
  });

  if (!res.ok) {
    throw new Error(`OpenAI moderation error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) throw new Error('OpenAI moderation returned no result');

  const scores = Object.entries(result.category_scores || {});
  let topCategory = 'NONE';
  let topScore = 0;
  for (const [name, score] of scores) {
    if (score > topScore) { topScore = score; topCategory = name; }
  }

  let status;
  if (result.flagged && topScore >= REJECT_THRESHOLD) status = 'rejected';
  else if (result.flagged || topScore >= REVIEW_THRESHOLD) status = 'pending';
  else status = 'approved';

  // Only attribute a specific category when something was actually flagged
  // or borderline — an auto-approved comment's "top" category is often a
  // negligible near-zero score and shouldn't be shown as if it were a concern.
  if (status === 'approved') return { status, aiCategory: 'NONE', aiConfidence: topScore, aiReason: REASONS.NONE };

  return { status, aiCategory: topCategory, aiConfidence: topScore, aiReason: REASONS[topCategory] || REASONS.NONE };
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

exports.moderateComment = onDocumentCreated(
  { document: 'comments/{commentId}', secrets: [OPENAI_API_KEY, ADMIN_NOTIFICATION_EMAIL] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const comment = snap.data();
    if (!comment || comment.aiCategory) return; // already processed

    let result;
    try {
      result = await classifyComment(comment.text || '', OPENAI_API_KEY.value());
    } catch (err) {
      logger.error('OpenAI moderation call failed, leaving comment for manual review', err);
      result = { status: 'pending', aiCategory: 'error', aiConfidence: 0, aiReason: 'AI moderation was unavailable; flagged for manual review.' };
    }

    await snap.ref.update({
      status: result.status,
      aiCategory: result.aiCategory,
      aiConfidence: result.aiConfidence,
      aiReason: result.aiReason,
      reviewed: false
    });

    if (result.status !== 'pending') return;

    const adminEmail = ADMIN_NOTIFICATION_EMAIL.value();
    if (!adminEmail) return;

    // Picked up by the Firebase "Trigger Email" extension watching mail/.
    await db.collection('mail').add({
      to: [adminEmail],
      message: {
        subject: 'Comment Requires Review',
        text: `A new comment needs review.\n\nName: ${comment.name}\nComment: ${comment.text}\n\nAI category: ${result.aiCategory}\nConfidence: ${(result.aiConfidence * 100).toFixed(0)}%\n\nSign in to the Moderation Console (backend/admin.html) to approve, reject, or delete it.`,
        html: `<p>A new comment needs review.</p>
<p><strong>Name:</strong> ${escapeHtml(comment.name)}<br/>
<strong>Comment:</strong> ${escapeHtml(comment.text)}</p>
<p><strong>AI category:</strong> ${escapeHtml(result.aiCategory)}<br/>
<strong>Confidence:</strong> ${(result.aiConfidence * 100).toFixed(0)}%</p>
<p>Sign in to the Moderation Console (backend/admin.html) to approve, reject, or delete it.</p>`
      }
    });
  }
);
