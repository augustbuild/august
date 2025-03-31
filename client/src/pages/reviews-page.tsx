import React, { useState, useEffect } from 'react';
import { YoutubeVideo } from '@/lib/youtube-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch('/api/youtube/playlist');
        
        const data = await response.json();
        
        if (!response.ok) {
          setError(data as ApiError);
          throw new Error(data.error || 'Failed to fetch videos');
        }
        
        setVideos(data);
      } catch (err) {
        console.error('Error fetching videos:', err);
        // If we didn't already set the error from the response
        if (!error) {
          setError({
            error: 'Failed to load videos',
            details: 'Please try again later.',
            code: 'CLIENT_ERROR'
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideos();
  }, []);

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
          {error.enableUrl && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => window.open(error.enableUrl, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Enable YouTube API
              </Button>
              <p className="text-xs mt-2 text-muted-foreground">
                After enabling the API, wait a few minutes and then refresh this page.
              </p>
            </div>
          )}
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