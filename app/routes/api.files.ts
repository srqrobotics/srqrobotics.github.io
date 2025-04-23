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

  return result.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'directory' ? -1 : 1;
  });
}

export async function loader() {
  try {
    const projectsPath = join(process.cwd(), 'public', 'projects');
    const files = await getDirectoryContents(projectsPath);
    return new Response(JSON.stringify({ files }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return new Response(JSON.stringify({ files: [] }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
} 