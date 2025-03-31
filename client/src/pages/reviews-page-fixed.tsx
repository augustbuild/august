import React, { useState, useEffect } from 'react';
import { YoutubeVideo } from '@/lib/youtube-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, RefreshCw, Clock, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SocialLinks from '@/components/social-links';

type ApiError = {
  error: string;
  details: string;
  actionRequired?: string;
  enableUrl?: string;
  code: string;
};

type VideoCategory = 'all' | 'short' | 'long';

// Function to format seconds to a human-readable duration (MM:SS or HH:MM:SS)
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

export default function ReviewsPage() {
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [activeTab, setActiveTab] = useState<VideoCategory>('all');
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

  // Filter videos based on the active tab
  const filteredVideos = videos.filter(video => {
    if (activeTab === 'all') return true;
    if (activeTab === 'short') return video.isShort;
    if (activeTab === 'long') return !video.isShort;
    return true;
  });

  // Get counts for tabs
  const shortVideosCount = videos.filter(video => video.isShort).length;
  const longVideosCount = videos.filter(video => !video.isShort).length;

  // Render a short video in a vertical format
  const renderShortVideo = (video: YoutubeVideo) => (
    <div key={video.id} className="border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-[9/16] relative group">
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <a 
          href={`https://www.youtube.com/watch?v=${video.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="rounded-full bg-red-600 p-3">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="white" 
              className="w-5 h-5"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </a>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-1 mb-1">{video.title}</h3>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs px-2 bg-accent/40">
            <Timer className="h-3 w-3 mr-1" />
            {formatDuration(video.durationSeconds)}
          </Badge>
          <span className="text-xs text-muted-foreground">Short</span>
        </div>
      </div>
    </div>
  );

  // Render a long video in a horizontal format
  const renderLongVideo = (video: YoutubeVideo) => (
    <div key={video.id} className="border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-video relative group">
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <a 
          href={`https://www.youtube.com/watch?v=${video.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="rounded-full bg-red-600 p-3">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="white" 
              className="w-6 h-6"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </a>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2">{video.title}</h3>
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground line-clamp-1">{video.description}</p>
          <Badge variant="outline" className="ml-2 text-xs whitespace-nowrap">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(video.durationSeconds)}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold">Product Reviews</h1>
        <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium mr-3">Follow us:</span>
            <SocialLinks size="md" />
          </div>
          <a 
            href="https://www.youtube.com/@august_build?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-4 h-4 mr-1"
              style={{ minWidth: '16px', minHeight: '16px' }}
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Subscribe to our channel
          </a>
        </div>
      </div>
      
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
            
            {['YOUTUBE_API_NOT_CONFIGURED', 'CLIENT_ERROR', 'YOUTUBE_API_KEY_MISSING', 'YOUTUBE_API_PERMISSION_DENIED', 'YOUTUBE_API_ERROR'].includes(error.code) ? (
              <div className="w-full mt-3 pt-3 border-t border-destructive/20">
                <p className="text-sm font-medium mb-2">Troubleshooting Instructions:</p>
                <ol className="text-xs space-y-1 list-decimal pl-4">
                  <li>Verify that the YouTube API key is correctly set as an environment variable named <code className="bg-background/80 px-1 py-0.5 rounded">YOUTUBE_API_KEY</code></li>
                  <li>Make sure the YouTube Data API v3 is enabled in your Google Cloud Console</li>
                  <li>Confirm that the API key has the correct permissions to access the YouTube Data API</li>
                  <li>Check for any IP restrictions on your API key that might block your server's requests</li>
                </ol>
                <div className="mt-4 p-3 bg-background/50 rounded-md">
                  <p className="text-xs font-medium">Test your API key with this command:</p>
                  <pre className="p-2 bg-background text-xs mt-1 rounded overflow-x-auto">
                    curl "https://www.googleapis.com/youtube/v3/playlistItems?part=id&maxResults=1&playlistId=PLroxG2e6nYKuMsF8nSNieCN0VSr9gB1U9&key=YOUR_API_KEY"
                  </pre>
                  <p className="text-xs mt-2 text-muted-foreground">
                    (Replace YOUR_API_KEY with your actual API key to test it)
                  </p>
                </div>
                <p className="text-xs mt-3 text-muted-foreground">
                  After updating your API key, restart your server and refresh this page.
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
        <Tabs defaultValue="all" className="space-y-6" onValueChange={(value) => setActiveTab(value as VideoCategory)}>
          <div className="border-b pb-2">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 mb-2">
              <TabsTrigger value="all" className="gap-2">
                All
                <Badge variant="secondary" className="ml-1">{videos.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="short" className="gap-2">
                Shorts
                <Badge variant="secondary" className="ml-1">{shortVideosCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="long" className="gap-2">
                Long
                <Badge variant="secondary" className="ml-1">{longVideosCount}</Badge>
              </TabsTrigger>
            </TabsList>
            <p className="text-sm text-muted-foreground mt-2">
              {activeTab === 'all' && 'Viewing all product review videos'}
              {activeTab === 'short' && 'Short videos under 3 minutes'}
              {activeTab === 'long' && 'Longer format product reviews'}
            </p>
          </div>

          <TabsContent value="all" className="space-y-8 mt-4">
            {shortVideosCount > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Short Videos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {videos.filter(video => video.isShort).map(renderShortVideo)}
                </div>
              </div>
            )}
            {longVideosCount > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Long-Form Reviews</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.filter(video => !video.isShort).map(renderLongVideo)}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="short" className="mt-4">
            {shortVideosCount > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredVideos.map(renderShortVideo)}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No short videos found in this playlist.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="long" className="mt-4">
            {longVideosCount > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map(renderLongVideo)}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No long videos found in this playlist.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}