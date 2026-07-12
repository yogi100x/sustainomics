import type { APIRoute } from "astro";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";

export const prerender = false;

// Serves an uploaded PDF INLINE (Content-Disposition: inline) so it renders in an
// <iframe> / browser PDF viewer. The EmDash media endpoint forces `attachment`,
// which makes browsers download the file instead of displaying it.
//
// Streams from disk (no full-buffer read) and supports byte-range requests —
// pdf.js and Chrome/Safari's native PDF viewer both use Range requests to fetch
// large PDFs progressively instead of downloading the whole file up front.
export const GET: APIRoute = async ({ params, request }) => {
	const file = params.file ?? "";
	// Only allow a bare filename (e.g. "<storageKey>.pdf") — no path traversal.
	if (!/^[A-Za-z0-9._-]+$/.test(file) || file.includes("..") || !file.toLowerCase().endsWith(".pdf")) {
		return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
	}

	const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
	const filePath = path.join(uploadsDir, file);
	let size: number;
	try {
		size = (await stat(filePath)).size;
	} catch {
		return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
	}

	const baseHeaders: Record<string, string> = {
		"Content-Type": "application/pdf",
		"Content-Disposition": `inline; filename="${file}"`,
		"Accept-Ranges": "bytes",
		"Cache-Control": "public, max-age=14400",
	};

	const range = request.headers.get("range");
	if (range) {
		const match = /bytes=(\d*)-(\d*)/.exec(range);
		const start = match?.[1] ? parseInt(match[1], 10) : 0;
		const end = match?.[2] ? parseInt(match[2], 10) : size - 1;
		if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
			return new Response(null, {
				status: 416,
				headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
			});
		}
		const nodeStream = createReadStream(filePath, { start, end });
		return new Response(Readable.toWeb(nodeStream) as unknown as ReadableStream, {
			status: 206,
			headers: {
				...baseHeaders,
				"Content-Range": `bytes ${start}-${end}/${size}`,
				"Content-Length": String(end - start + 1),
			},
		});
	}

	const nodeStream = createReadStream(filePath);
	return new Response(Readable.toWeb(nodeStream) as unknown as ReadableStream, {
		headers: { ...baseHeaders, "Content-Length": String(size) },
	});
};
