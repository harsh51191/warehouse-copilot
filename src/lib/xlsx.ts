import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

export function readFirstSheetAsJson(filePath: string): any[] {
	const buf = fs.readFileSync(filePath);
	const wb = XLSX.read(buf, { type: "buffer" });
	const sheetName = wb.SheetNames[0];
	const ws = wb.Sheets[sheetName];
	return XLSX.utils.sheet_to_json(ws, { defval: null });
}

export function readFirstSheetAsJsonFromBuffer(buffer: Buffer): any[] {
	const wb = XLSX.read(buffer, { type: "buffer" });
	const sheetName = wb.SheetNames[0];
	const ws = wb.Sheets[sheetName];
	return XLSX.utils.sheet_to_json(ws, { defval: null });
}

export function findLatestMatchingFile(dir: string, prefix: string): string | null {
	if (!fs.existsSync(dir)) return null;
	const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.xlsx'));
	if (files.length === 0) return null;
	const withTimes = files.map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtime.getTime() }));
	withTimes.sort((a,b)=> b.t - a.t);
	return path.join(dir, withTimes[0].f);
}

export function getDataDir(): string {
	// Use /tmp/data for Vercel compatibility in production
	if (process.env.VERCEL === '1') {
		return '/tmp/data';
	}
	
	return process.env.DATA_DIR && process.env.DATA_DIR.trim().length > 0
		? process.env.DATA_DIR
		: path.join(process.cwd(), "data");
} 