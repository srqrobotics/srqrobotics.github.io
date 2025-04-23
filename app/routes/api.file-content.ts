import { readFile } from 'fs/promises';
import { join } from 'path';

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const filePath = url.searchParams.get('path');

  if (!filePath) {
    return new Response(JSON.stringify({ content: '', error: 'No file path provided' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    return new Response(JSON.stringify({ content }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return new Response(JSON.stringify({ content: '', error: 'Failed to read file' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
} 