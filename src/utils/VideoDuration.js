import { getVideoDurationInSeconds } from "get-video-duration";

// Helper function to pad zeros for formatting
function padZero(number) {
  return number < 10 ? "0" + number : number;
}

// Function to format duration like YouTube (e.g., HH:MM:SS or MM:SS)
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600); // Calculate hours
  const minutes = Math.floor((seconds % 3600) / 60); // Calculate minutes
  const remainingSeconds = Math.floor(seconds % 60); // Calculate remaining seconds

  if (hours > 0) {
    return `${hours}:${padZero(minutes)}:${padZero(remainingSeconds)}`; // Format as HH:MM:SS
  } else {
    return `${minutes}:${padZero(remainingSeconds)}`; // Format as MM:SS
  }
}

// Main function to get video duration
async function getVideoDuration(videoPath) {
  try {
    // Get duration in seconds using `get-video-duration` library
    const durationInSeconds = await getVideoDurationInSeconds(videoPath);

    // Format duration into YouTube style
    const formattedDuration = formatDuration(durationInSeconds);

    return formattedDuration;
  } catch (error) {
    console.error("Error getting video duration:", error);
  }
}
export { getVideoDuration };
