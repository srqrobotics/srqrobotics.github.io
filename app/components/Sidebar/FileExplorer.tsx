import React, { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import type { FileSystemItem } from "~/types/files";
import { useFile } from "~/contexts/FileContext";

export default function FileExplorer() {
  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isExpanded, setIsExpanded] = useState(true);
  const fetcher = useFetcher();
  const { setSelectedFile } = useFile();

  useEffect(() => {
    fetcher.load("/api/files");
  }, []);

  useEffect(() => {
    if (fetcher.data?.files) {
      setFiles(fetcher.data.files);
    }
  }, [fetcher.data]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = (e: React.MouseEvent, item: FileSystemItem) => {
    e.preventDefault();
    if (item.type === "file") {
      setSelectedFile(item.path);
    }
  };

  const FileItem = ({
    item,
    depth = 0,
  }: {
    item: FileSystemItem;
    depth?: number;
  }) => {
    const isExpanded = expandedFolders.has(item.path);
    const isFolder = item.type === "directory";

    return (
      <div>
        <div
          className={`
            px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer 
            text-gray-900 dark:text-gray-100 flex items-center
          `}
          style={{ paddingLeft: `${(depth + 1) * 0.75}rem` }}
          onClick={(e) =>
            isFolder ? toggleFolder(item.path) : handleFileClick(e, item)
          }
          onDoubleClick={(e) => !isFolder && handleFileClick(e, item)}
        >
          <span className="mr-2">
            {isFolder ? (isExpanded ? "📂" : "📁") : "📄"}
          </span>
          <span className="truncate">{item.name}</span>
        </div>
        {isFolder && isExpanded && item.children && (
          <div>
            {item.children.map((child) => (
              <FileItem key={child.path} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          Files
        </h2>
        <button className="ml-auto" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? "▼" : "▲"}
        </button>
      </div>
      {isExpanded && (
        <div className="overflow-auto">
          {fetcher.state === "loading" ? (
            <div className="p-4 text-gray-600 dark:text-gray-400">
              Loading...
            </div>
          ) : files.length === 0 ? (
            <div className="p-4 text-gray-600 dark:text-gray-400">
              No files found
            </div>
          ) : (
            files.map((file) => <FileItem key={file.path} item={file} />)
          )}
        </div>
      )}
    </div>
  );
}
