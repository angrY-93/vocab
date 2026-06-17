# Vocabulary Quiz Games

A GitHub Pages-ready vocabulary learning app with three activities:

- Seeding (flashcard reveal)
- Watering (multiple-choice fill-in)
- Pruning (synonym/antonym sorting)

The app now uses a local-first data model for vocabulary and user progress.

## Data model and storage

### Vocabulary content

- Source file: `resources/data/vocab-v1.json`
- Loaded through: `resources/js/vocab-store.js`
- Hosted as static JSON (GitHub Pages compatible)

### User progress and proficiency

- Store: IndexedDB (`paper-garden-db`)
- Progress table: `progress` (keyed by `wordId`)
- Session table: `sessions` (keyed by `sessionId`)
- Managed by:
	- `resources/js/progress-store.js`
	- `resources/js/session-store.js`

Tracked per word:

- `status`: `new` | `learning` | `review` | `mastered`
- `proficiency`: numeric score (0-100)
- `correctStreak`, `wrongCount`, `seenCount`
- `lastSeenAt`, `nextReviewAt`

Status meaning:

- `new`: not introduced yet
- `learning`: introduced and not due now
- `review`: due now (or answered incorrectly)
- `mastered`: high proficiency with longer review intervals

### Session and batch sampling

- Batch size: 10 words
- Mix target: 5 new + 5 review/learning (with fallback if a pool is small)
- A sampled batch is stable per active session across all stages

Trigger rules:

- A new batch is sampled only when user taps **Start a new plant** on Home
- Home/footer navigation does not resample silently
- Seeding, Watering, and Pruning consume the same active session batch
- When Pruning finishes the batch, the session is completed

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. In the repository settings, open **Pages**.
3. Set the source to the default branch and the root folder.
4. Save.
5. Open the provided GitHub Pages URL.

## Runtime entry points

- Home trigger: `index.html` + `resources/js/index.js`
- Seeding stage: `seeding.html` + `resources/js/seeding.js`
- Watering stage: `watering.html` + `resources/js/watering.js`
- Pruning stage: `pruning.html` + `resources/js/pruning.js`

## Extending to 2000 words

1. Replace `resources/data/vocab-v1.json` with your full vocabulary set.
2. Keep stable unique `id` per word.
3. Optionally split by level/topic into multiple JSON files and load by manifest.
4. Keep schemas (`word`, `definition`, `example`, `synonyms`, `antonyms`) consistent.
