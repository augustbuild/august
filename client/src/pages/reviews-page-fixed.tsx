import React, { useState, useEffect } from 'react';
import { YoutubeVideo } from '@/lib/youtube-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, RefreshCw, Clock, Timer, Eye } from 'lucide-react';
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

  // Helper function to parse view count strings into numbers for sorting
  const parseViewCount = (viewCount: string | undefined): number => {
    if (!viewCount) return 0;
    // Remove commas and convert to number
    return parseInt(viewCount.replace(/,/g, ''), 10) || 0;
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
          // Sort videos by view count (highest to lowest)
          const sortedVideos = [...data].sort((a, b) => {
            return parseViewCount(b.viewCount) - parseViewCount(a.viewCount);
          });
          setVideos(sortedVideos);
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
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {video.viewCount && (
            <Badge variant="outline" className="text-xs px-2 bg-accent/40">
              <Eye className="h-3 w-3 mr-1" />
              {video.viewCount}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs px-2 bg-accent/40">
            <Timer className="h-3 w-3 mr-1" />
            {formatDuration(video.durationSeconds)}
          </Badge>
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
        <div className="flex flex-wrap gap-2 mb-2">
          {video.viewCount && (
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              <Eye className="h-3 w-3 mr-1" />
              {video.viewCount}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(video.durationSeconds)}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold">Product Reviews</h1>
        <div className="mt-4 md:mt-0 flex flex-row items-center space-x-3">
          <a 
            href="https://www.youtube.com/@august_build?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-[#222222] hover:bg-gray-50 transition"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-5 h-5 mr-2"
              style={{ minWidth: '20px', minHeight: '20px' }}
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            YouTube
          </a>
          <a 
            href="https://www.instagram.com/august.build/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-[#222222] hover:bg-gray-50 transition"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-5 h-5 mr-2"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Instagram
          </a>
          <a 
            href="https://www.tiktok.com/@august_build"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-[#222222] hover:bg-gray-50 transition"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-5 h-5 mr-2"
            >
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
            TikTok
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