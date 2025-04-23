import { writeFileSync } from 'fs';
import { join } from 'path';

export async function action({ request }: { request: Request }) {
  try {
    const { file, content } = await request.json();
    
    // Log the received data
    console.log('Saving config:', { file });
    
    // Remove the leading slash and join with the public directory
    const filePath = join(process.cwd(), 'public', file.replace(/^\//, ''));
    
    // Format JSON with indentation for readability
    const jsonContent = JSON.stringify(content, null, 2);
    
    // Log before writing
    console.log('Writing to:', filePath);
    
    // Use synchronous write to ensure file is written
    writeFileSync(filePath, jsonContent, 'utf8');
    
    // Log after successful write
    console.log('Successfully wrote to file');
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Enhanced error logging
    console.error('Error saving config:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : 'Unknown error',
      cwd: process.cwd()
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save config',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 