import { getLoadingStatusFromFile, LoadingStatus } from "@/server/datasource/file-adapter";

export async function getLoadingStatus(): Promise<LoadingStatus> {
	const source = process.env.DATA_SOURCE?.toLowerCase() || 'file';
	if (source === 'file') return getLoadingStatusFromFile();
	// TODO: implement DB adapter using Mustache-templated SQL
	return getLoadingStatusFromFile();
} 