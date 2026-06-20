import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const prerender = false;

// Serves an uploaded PDF INLINE (Content-Disposition: inline) so it renders in an
// <iframe> / browser PDF viewer. The EmDash media endpoint forces `attachment`,
// which makes browsers download the file instead of displaying it.
export const GET: APIRoute = async ({ params }) => {
	const file = params.file ?? "";
	// Only allow a bare filename (e.g. "<storageKey>.pdf") — no path traversal.
	if (!/^[A-Za-z0-9._-]+$/.test(file) || file.includes("..") || !file.toLowerCase().endsWith(".pdf")) {
		return new Response("Not found", { status: 404 });
	}
	try {
		const buf = await readFile(path.join(process.cwd(), "uploads", file));
		return new Response(buf, {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="${file}"`,
				"Cache-Control": "public, max-age=3600",
			},
		});
	} catch {
		return new Response("Not found", { status: 404 });
	}
};
