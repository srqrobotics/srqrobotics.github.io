export interface FileSystemItem {
  name: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
  path: string;
} 