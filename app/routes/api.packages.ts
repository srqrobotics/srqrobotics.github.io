import { readdir } from 'fs/promises';
import { join } from 'path';
import type { FileSystemItem } from '../types/files';

async function getDirectoryContents(dirPath: string): Promise<FileSystemItem[]> {
  const items = await readdir(dirPath, { withFileTypes: true });
  const result: FileSystemItem[] = [];

  for (const item of items) {
    const path = join(dirPath, item.name);
    if (item.isDirectory()) {
      result.push({
        name: item.name,
        type: 'directory',
        path: path.replace(/\\/g, '/'),
        children: await getDirectoryContents(path),
      });
    } else {
      result.push({
        name: item.name,
        type: 'file',
        path: path.replace(/\\/g, '/'),
      });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loader() {
  try {
    const packagesPath = join(process.cwd(), 'public', 'packages');
    const packages = await getDirectoryContents(packagesPath);
    return new Response(JSON.stringify({ packages }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reading packages directory:', error);
    return new Response(JSON.stringify({ packages: [] }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
} 