import React, { useState, useEffect } from 'react';
import { YoutubeVideo } from '@/lib/youtube-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ApiError = {
  error: string;
  details: string;
  actionRequired?: string;
  enableUrl?: string;
  code: string;
};

export default function ReviewsPage() {
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
    toast({
      title: "Retrying...",
      description: "Attempting to reconnect to YouTube API"
    });
  };

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch('/api/youtube/playlist');
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('YouTube API error:', data);
          setError(data as ApiError);
          throw new Error(data.error || 'Failed to fetch videos');
        }
        
        if (Array.isArray(data) && data.length > 0) {
          setVideos(data);
        } else {
          setError({
            error: "No videos found",
            details: "The playlist appears to be empty or unavailable.",
            code: "EMPTY_PLAYLIST"
          });
        }
      } catch (err) {
        console.error('Error fetching videos:', err);
        // If we didn't already set the error from the response
        if (!error) {
          setError({
            error: 'Failed to load videos',
            details: 'Please verify your YouTube API key is configured correctly in both development and production environments.',
            code: 'CLIENT_ERROR'
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideos();
  }, [retryCount]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Product Reviews</h1>
      
      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
          <p className="font-semibold mb-2">{error.error}</p>
          <p className="text-sm">{error.details}</p>
          {error.actionRequired && (
            <p className="text-sm mt-2">{error.actionRequired}</p>
          )}
          
          <div className="mt-4 flex flex-wrap gap-3">
            {error.enableUrl && (
              <Button variant="outline" size="sm" onClick={() => window.open(error.enableUrl, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Enable YouTube API
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
            
            {error.code === 'YOUTUBE_API_NOT_CONFIGURED' || error.code === 'CLIENT_ERROR' ? (
              <div className="w-full mt-3 pt-3 border-t border-destructive/20">
                <p className="text-sm font-medium mb-2">Production Environment Instructions:</p>
                <ol className="text-xs space-y-1 list-decimal pl-4">
                  <li>Verify that the YouTube API key is set as an environment variable named <code className="bg-background/80 px-1 py-0.5 rounded">YOUTUBE_API_KEY</code></li>
                  <li>Make sure the YouTube Data API v3 is enabled in your Google Cloud Console</li>
                  <li>Check that the API key has the correct permissions and no IP restrictions that would block your production server</li>
                  <li>If the problem persists, try creating a new API key specifically for this project</li>
                </ol>
                <p className="text-xs mt-2 text-muted-foreground">
                  After updating the API key, restart your production server and then refresh this page.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="w-full h-52 rounded-md" />
              <Skeleton className="w-full h-6" />
              <Skeleton className="w-2/3 h-4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-video">
                <iframe 
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg line-clamp-2 mb-2">{video.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}