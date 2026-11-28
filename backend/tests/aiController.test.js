import assert from "node:assert/strict";
import test from "node:test";
import { createChatResponse, createEmbeddings } from "../controllers/aiController.js";

const createResponse = () => ({
	statusCode: 200,
	body: null,
	status(code) {
		this.statusCode = code;
		return this;
	},
	json(body) {
		this.body = body;
		return this;
	},
});

test("embedding endpoint rejects invalid task types", async () => {
	const response = createResponse();
	await createEmbeddings({ body: { texts: ["notes"], taskType: "INVALID" } }, response);

	assert.equal(response.statusCode, 400);
	assert.equal(response.body.message, "Invalid embedding request.");
});

test("study chat requires retrieved material context", async () => {
	const response = createResponse();
	await createChatResponse({ body: { question: "Explain this", mode: "study" } }, response);

	assert.equal(response.statusCode, 400);
	assert.equal(response.body.message, "Index study materials before asking a study question.");
});

test("AI endpoints report missing Gemini configuration without calling the provider", async () => {
	const previousKey = process.env.GEMINI_API_KEY;
	delete process.env.GEMINI_API_KEY;

	try {
		const response = createResponse();
		await createChatResponse({ body: { question: "Explain entropy", mode: "general" } }, response);

		assert.equal(response.statusCode, 503);
		assert.match(response.body.message, /GEMINI_API_KEY/);
	} finally {
		if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
		else process.env.GEMINI_API_KEY = previousKey;
	}
});

test("user-key-only mode blocks all server-backed Gemini requests", async () => {
	const previousMode = process.env.RAG_PROVIDER_MODE;
	const previousKey = process.env.GEMINI_API_KEY;
	const previousFetch = globalThis.fetch;
	let requests = 0;
	process.env.RAG_PROVIDER_MODE = "user";
	process.env.GEMINI_API_KEY = "server-key-must-not-be-used";
	globalThis.fetch = async () => {
		requests += 1;
		throw new Error("Gemini must not be called in user-key-only mode.");
	};

	try {
		const chatResponse = createResponse();
		await createChatResponse(
			{ body: { question: "Explain entropy", mode: "general" } },
			chatResponse,
		);
		assert.equal(chatResponse.statusCode, 403);
		assert.match(chatResponse.body.message, /requires users to provide their own Gemini API key/);

		const embeddingsResponse = createResponse();
		await createEmbeddings(
			{ body: { texts: ["study notes"], taskType: "RETRIEVAL_DOCUMENT" } },
			embeddingsResponse,
		);
		assert.equal(embeddingsResponse.statusCode, 403);
		assert.equal(requests, 0);
	} finally {
		globalThis.fetch = previousFetch;
		if (previousMode === undefined) delete process.env.RAG_PROVIDER_MODE;
		else process.env.RAG_PROVIDER_MODE = previousMode;
		if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
		else process.env.GEMINI_API_KEY = previousKey;
	}
});

test("chat retries a temporary Gemini overload", async () => {
	const previousKey = process.env.GEMINI_API_KEY;
	const previousFetch = globalThis.fetch;
	let attempts = 0;
	process.env.GEMINI_API_KEY = "test-key";
	globalThis.fetch = async () => {
		attempts += 1;
		if (attempts === 1) {
			return {
				ok: false,
				status: 503,
				headers: { get: () => "0" },
				json: async () => ({ error: { message: "Temporarily overloaded" } }),
			};
		}
		return {
			ok: true,
			status: 200,
			json: async () => ({
				candidates: [{ content: { parts: [{ text: "Try again shortly." }] } }],
			}),
		};
	};

	try {
		const response = createResponse();
		await createChatResponse(
			{ body: { question: "Explain this", mode: "general" } },
			response,
		);

		assert.equal(response.statusCode, 200);
		assert.equal(response.body.answer, "Try again shortly.");
		assert.equal(attempts, 2);
	} finally {
		globalThis.fetch = previousFetch;
		if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
		else process.env.GEMINI_API_KEY = previousKey;
	}
});

test("chat falls back to Flash-Lite after the primary model stays overloaded", async () => {
	const previousKey = process.env.GEMINI_API_KEY;
	const previousFetch = globalThis.fetch;
	const previousConsoleWarn = console.warn;
	const requests = [];
	process.env.GEMINI_API_KEY = "test-key";
	globalThis.fetch = async (url) => {
		requests.push(url);
		if (url.includes("gemini-3.8-flash")) {
			return {
				ok: false,
				status: 503,
				headers: { get: () => "0" },
				json: async () => ({ error: { message: "Temporarily overloaded" } }),
			};
		}
		return {
			ok: true,
			status: 200,
			json: async () => ({
				candidates: [{ content: { parts: [{ text: "Fallback answer." }] } }],
			}),
		};
	};
	console.warn = () => {};

	try {
		const response = createResponse();
		await createChatResponse(
			{ body: { question: "Explain this", mode: "general" } },
			response,
		);

		assert.equal(response.statusCode, 200);
		assert.equal(response.body.answer, "Fallback answer.");
		assert.equal(requests.length, 4);
		assert.ok(requests.slice(0, 3).every((url) => url.includes("gemini-3.8-flash")));
		assert.ok(requests[3].includes("gemini-3.1-flash-lite"));
	} finally {
		globalThis.fetch = previousFetch;
		console.warn = previousConsoleWarn;
		if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
		else process.env.GEMINI_API_KEY = previousKey;
	}
});

test("chat reports temporary Gemini overload after retries are exhausted", async () => {
	const previousKey = process.env.GEMINI_API_KEY;
	const previousFetch = globalThis.fetch;
	const previousConsoleError = console.error;
	const previousConsoleWarn = console.warn;
	let attempts = 0;
	process.env.GEMINI_API_KEY = "test-key";
	globalThis.fetch = async () => {
		attempts += 1;
		return {
			ok: false,
			status: 503,
			headers: { get: () => "0" },
			json: async () => ({ error: { message: "Temporarily overloaded" } }),
		};
	};
	console.error = () => {};
	console.warn = () => {};

	try {
		const response = createResponse();
		await createChatResponse(
			{ body: { question: "Explain this", mode: "general" } },
			response,
		);

		assert.equal(response.statusCode, 503);
		assert.match(response.body.message, /temporarily busy/i);
		assert.equal(attempts, 6);
	} finally {
		globalThis.fetch = previousFetch;
		console.error = previousConsoleError;
		console.warn = previousConsoleWarn;
		if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
		else process.env.GEMINI_API_KEY = previousKey;
	}
});
