export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      console.log('Image loaded successfully:', src);
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('Error loading image:', src, error);
      reject(new Error(`Failed to load image: ${src}`));
    };

    console.log('Starting to load image:', src);
    img.src = src;
  });
} 